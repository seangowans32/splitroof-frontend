import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS, formatMoney, getCategorySpent, getExpenseShares, getOwedToUsers, roundMoney } from '../../utils/expenseUtils.js';

const SIZE = 180;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const byHighestValue = (left, right) => (right.value || 0) - (left.value || 0);

const buildRings = (slices, total) => {
  if (!(total > 0)) return [];

  return slices.reduce((list, slice) => {
    const dash = (slice.value / total) * CIRCUMFERENCE;
    const offset = list.length ? list[list.length - 1].offset + list[list.length - 1].dash : 0;
    return [...list, { ...slice, dash, offset }];
  }, []);
};

const DonutChart = ({ slices, total, centerAmount, centerDisplay, centerLabel, heading, label }) => {
  const [filled, setFilled] = useState(false);
  const signature = `${total}:${slices.map((slice) => `${slice.id}:${slice.value}`).join('|')}`;
  const rings = buildRings(slices, total);

  useEffect(() => {
    setFilled(false);
    let innerId = 0;
    const outerId = window.requestAnimationFrame(() => {
      innerId = window.requestAnimationFrame(() => setFilled(true));
    });
    return () => {
      window.cancelAnimationFrame(outerId);
      window.cancelAnimationFrame(innerId);
    };
  }, [signature]);

  return (
    <div className="budget-donut-wrap">
      {heading ? <h3 className="budget-donut-heading">{heading}</h3> : null}
      <div className="budget-donut">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
        <circle
          className="budget-donut-track"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        {rings.map((slice) => (
          <circle
            key={slice.id}
            className={`budget-donut-slice ${filled ? 'is-filled' : ''} ${slice.upcoming ? 'is-upcoming' : ''}`}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={STROKE}
            strokeDasharray={filled ? `${slice.dash} ${CIRCUMFERENCE - slice.dash}` : `0 ${CIRCUMFERENCE}`}
            strokeDashoffset={filled ? -slice.offset : 0}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          >
            <title>
              {slice.title}{slice.dueLabel ? ` ${slice.dueLabel}` : slice.upcoming ? ' - upcoming' : ''}: {slice.amountLabel || formatMoney(slice.value)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="budget-donut-center">
        <p>{centerDisplay || formatMoney(centerAmount)}</p>
        <span>{centerLabel}</span>
      </div>
      </div>
    </div>
  );
};

const formatBalance = (value) => {
  const amount = roundMoney(value);
  if (amount > 0) return `+${formatMoney(amount)}`;
  if (amount < 0) return `-${formatMoney(Math.abs(amount))}`;
  return formatMoney(0);
};

const HouseholdDashboard = ({ categories = [], expenses = [], users = [], currentUser = '' }) => {
  const items = categories.map((category) => {
    const budget = Number(category.budget) || 0;
    const spent = getCategorySpent(expenses, category.id);
    return {
      id: category.id,
      title: category.title || 'Untitled',
      color: category.color,
      budget,
      spent,
      overBudget: budget > 0 && spent > budget,
    };
  });

  const budgetSlices = items
    .filter((item) => item.budget > 0)
    .map((item) => ({ ...item, value: item.budget }))
    .sort(byHighestValue);
  const budgetLegendItems = [...items].sort((left, right) => (right.budget || 0) - (left.budget || 0));
  const totalBudget = budgetSlices.reduce((sum, item) => sum + item.value, 0);

  const householdSize = Math.max(users.filter(Boolean).length, 1);
  const memberNames = users.filter(Boolean);
  const monthlyTotal = roundMoney(
    items
      .filter((item) => item.budget > 0)
      .reduce((sum, item) => sum + item.budget / householdSize, 0)
  );
  const paidExpenses = expenses.filter((expense) => expense.kind !== 'payment' && expense.datePaid);
  const shareOf = (expense) => (
    currentUser ? getExpenseShares(expense, memberNames)[currentUser] || 0 : 0
  );
  const paidForCategory = (categoryId) => roundMoney(
    paidExpenses
      .filter((expense) => expense.categoryId === categoryId)
      .reduce((sum, expense) => sum + shareOf(expense), 0)
  );
  const categorizedPaid = items
    .map((item) => ({ ...item, paid: paidForCategory(item.id) }))
    .filter((item) => item.paid > 0);
  const otherPaid = roundMoney(
    paidExpenses
      .filter((expense) => !items.some((item) => item.id === expense.categoryId))
      .reduce((sum, expense) => sum + shareOf(expense), 0)
  );
  const paidSlices = otherPaid > 0
    ? [...categorizedPaid, { id: 'other', title: 'Other', color: '#808080', paid: otherPaid }]
    : categorizedPaid;
  const paidTotal = roundMoney(paidSlices.reduce((sum, item) => sum + item.paid, 0));
  const remaining = Math.max(roundMoney(monthlyTotal - paidTotal), 0);
  const overShare = monthlyTotal > 0 && paidTotal > monthlyTotal;
  const ringScale = overShare ? monthlyTotal / paidTotal : 1;
  const monthlySlices = paidSlices
    .map((item) => ({
      id: item.id,
      title: item.title,
      color: item.color,
      value: roundMoney(item.paid * ringScale),
      amountLabel: formatMoney(item.paid),
      paid: item.paid,
    }))
    .sort(byHighestValue);
  const owedMatrix = getOwedToUsers(expenses, users);
  const balanceSlices = users
    .filter((user) => user && user !== currentUser)
    .map((user, index) => {
      const net = roundMoney((owedMatrix[currentUser]?.[user] || 0) - (owedMatrix[user]?.[currentUser] || 0));
      return {
        id: `balance-${user}`,
        title: user,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        value: Math.abs(net),
        net,
        amountLabel: formatBalance(net),
      };
    })
    .filter((item) => item.value > 0)
    .sort(byHighestValue);
  const balanceTotal = roundMoney(balanceSlices.reduce((sum, item) => sum + item.value, 0));
  const netBalance = roundMoney(balanceSlices.reduce((sum, item) => sum + item.net, 0));
  const balanceRingTotal = monthlyTotal > 0 ? Math.max(monthlyTotal, balanceTotal) : balanceTotal;
  const shellRef = useRef(null);
  const contentRef = useRef(null);
  const heightRef = useRef(null);
  const layoutKey = [
    totalBudget,
    monthlyTotal,
    paidTotal,
    netBalance,
    balanceSlices.map((item) => `${item.id}:${item.net}`).join('|'),
    items.map((item) => `${item.id}:${item.title}:${item.budget}`).join('|'),
  ].join(':');

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!shell || !content) return undefined;

    const nextHeight = content.offsetHeight;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (heightRef.current == null || reduceMotion) {
      heightRef.current = nextHeight;
      shell.style.height = '';
      return undefined;
    }

    const fromHeight = shell.offsetHeight || heightRef.current;
    if (fromHeight === nextHeight) {
      heightRef.current = nextHeight;
      return undefined;
    }

    shell.style.height = `${fromHeight}px`;
    shell.getBoundingClientRect();
    shell.style.height = `${nextHeight}px`;
    heightRef.current = nextHeight;

    const handleEnd = (event) => {
      if (event.propertyName !== 'height') return;
      if (shell.style.height === `${nextHeight}px`) {
        shell.style.height = '';
      }
      shell.removeEventListener('transitionend', handleEnd);
    };

    shell.addEventListener('transitionend', handleEnd);
    return () => shell.removeEventListener('transitionend', handleEnd);
  }, [layoutKey]);

  return (
    <section className="household-dashboard-shell" ref={shellRef} aria-label="Household monthly expenses, your monthly share, and balances with other members">
      <div className="household-dashboard flex gap-20" ref={contentRef}>
      <div className="dashboard-chart col">
        <DonutChart
          slices={budgetSlices}
          total={totalBudget}
          centerAmount={totalBudget}
          centerLabel="Budget"
          heading="Household monthly expenses"
          label="Household monthly expenses"
        />

        {items.length === 0 ? (
          <p className="household-note">Add category budgets to see this chart.</p>
        ) : (
          <ul className="budget-legend">
            {budgetLegendItems.map((item) => (
              <li key={item.id}>
                <span className="budget-legend-dot" style={{ background: item.color }} />
                <span className="budget-legend-title">{item.title}</span>
                <span className="budget-legend-amount">
                  {item.budget ? formatMoney(item.budget) : 'No budget'}
                </span>
              </li>
            ))}
            <li className="budget-legend-total">
              <span className="budget-legend-title">Budget</span>
              <span className="budget-legend-amount">
                {formatMoney(totalBudget)}
              </span>
            </li>
          </ul>
        )}
      </div>

      <div className="dashboard-chart col">
        <DonutChart
          slices={monthlySlices}
          total={monthlyTotal}
          centerAmount={monthlyTotal}
          centerLabel="Share"
          heading="Your monthly share"
          label="Your monthly share, filled by expenses you have marked paid"
        />

        {!monthlyTotal ? (
          <p className="household-note">Add category budgets to see your share.</p>
        ) : (
          <ul className="budget-legend">
            {monthlySlices.map((item) => (
              <li key={item.id}>
                <span className="budget-legend-dot" style={{ background: item.color }} />
                <span className="budget-legend-title">{item.title}</span>
                <span className="budget-legend-amount">{formatMoney(item.paid)}</span>
              </li>
            ))}
            {remaining > 0 ? (
              <li>
                <span className="budget-legend-dot remaining" />
                <span className="budget-legend-title">Remaining</span>
                <span className="budget-legend-amount">{formatMoney(remaining)}</span>
              </li>
            ) : null}
            <li className="budget-legend-total">
              <span className="budget-legend-title">Paid</span>
              <span className={`budget-legend-amount ${overShare ? 'over-budget' : ''}`}>
                {formatMoney(paidTotal)}
              </span>
            </li>
          </ul>
        )}
      </div>

      <div className="dashboard-chart col">
        <DonutChart
          slices={balanceSlices}
          total={balanceRingTotal}
          centerAmount={netBalance}
          centerDisplay={formatBalance(netBalance)}
          centerLabel="Net"
          heading="Balances"
          label="Net balance with other household members"
        />

        {users.filter(Boolean).length < 2 ? (
          <p className="household-note">Invite someone to your household to track balances.</p>
        ) : balanceTotal <= 0 ? (
          <p className="household-note">You're even with everyone right now.</p>
        ) : (
          <ul className="budget-legend">
            {balanceSlices.map((item) => (
              <li key={item.id}>
                <span className="budget-legend-dot" style={{ background: item.color }} />
                <span className="budget-legend-title">{item.title}</span>
                <span className={`budget-legend-amount ${item.net > 0 ? 'positive' : 'negative'}`}>
                  {item.amountLabel}
                </span>
              </li>
            ))}
            <li className="budget-legend-total">
              <span className="budget-legend-title">Net</span>
              <span className={`budget-legend-amount ${netBalance > 0 ? 'positive' : netBalance < 0 ? 'negative' : ''}`}>
                {formatBalance(netBalance)}
              </span>
            </li>
          </ul>
        )}
      </div>
      </div>
    </section>
  );
};

export default HouseholdDashboard;
