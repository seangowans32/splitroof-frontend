import { useState } from 'react';
import ExpenseCard from '../ExpenseCard/ExpenseCard.jsx';
import {
  CATEGORY_COLORS,
  formatDate,
  formatDateTime,
  formatMoney,
  getCategoryById,
  getNextDueDate,
  getOwedToUsers,
  isUpcomingExpense,
  roundMoney,
  toDateInputValue,
} from '../../utils/expenseUtils.js';

export const HOUSEHOLD_PANELS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'categories', label: 'Budget' },
  { id: 'households', label: 'Households' },
  { id: 'history', label: 'History' },
];

const getUpcomingExpenses = (expenses = []) =>
  expenses
    .filter((expense) => expense.savedAt && isUpcomingExpense(expense))
    .sort((left, right) => getNextDueDate(left).localeCompare(getNextDueDate(right)));

const withoutUpcoming = (expenses = []) => expenses.filter((expense) => !isUpcomingExpense(expense));

const ExpenseCardItem = ({
  expense,
  users,
  categories,
  showSplit,
  onUpdate,
  onRemove,
  onSave,
}) => (
  <ExpenseCard
    expense={expense}
    users={users}
    categories={categories}
    showSplit={showSplit}
    onChange={(field, value) => onUpdate(expense.id, field, value)}
    onRemove={() => onRemove(expense.id)}
    onSave={onSave}
  />
);

const UpcomingExpenses = ({
  expenses,
  users,
  categories,
  showSplit,
  onUpdate,
  onRemove,
  onSave,
}) => {
  const upcoming = getUpcomingExpenses(expenses);
  if (upcoming.length === 0) return null;

  return (
    <div className="upcoming-expenses">
      <h3>Upcoming</h3>
      {upcoming.map((expense) => (
        <ExpenseCardItem
          key={expense.id}
          expense={expense}
          users={users}
          categories={categories}
          showSplit={showSplit}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onSave={onSave}
        />
      ))}
    </div>
  );
};

const formatBalance = (value) => {
  const amount = roundMoney(value);
  if (amount > 0) return `+${formatMoney(amount)}`;
  if (amount < 0) return `-${formatMoney(Math.abs(amount))}`;
  return formatMoney(0);
};

const MemberBalances = ({ expenses, users, currentUser, onRecordPayment }) => {
  const members = users.filter(Boolean);
  const others = members.filter((user) => user !== currentUser);
  const owed = getOwedToUsers(
    expenses.filter((expense) => expense.savedAt),
    members
  );
  const [settleUser, setSettleUser] = useState('');
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(toDateInputValue());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const openSettle = (user, net) => {
    setError('');
    if (settleUser === user) {
      setSettleUser('');
      return;
    }
    setSettleUser(user);
    setAmount(String(roundMoney(Math.abs(net))));
    setPaidOn(toDateInputValue());
  };

  const submitPayment = async (event, user, net) => {
    event.preventDefault();
    const value = roundMoney(amount);
    const owedAmount = roundMoney(Math.abs(net));
    if (!(value > 0)) {
      setError('Enter a payment amount.');
      return;
    }
    if (value > owedAmount) {
      setError(`Enter an amount up to ${formatMoney(owedAmount)}.`);
      return;
    }
    if (!paidOn) {
      setError('Choose the date paid.');
      return;
    }

    const from = net > 0 ? user : currentUser;
    const to = net > 0 ? currentUser : user;
    setSaving(true);
    setError('');
    try {
      await onRecordPayment({ from, to, amount: value, date: paidOn });
      setSettleUser('');
      setAmount('');
    } catch (paymentError) {
      setError(paymentError.message || 'Could not record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="balances-card" aria-label="Balances with other household members">
      <h3>Balances</h3>
      {others.length === 0 ? null : (
        <ul className="balance-list">
          {others.map((user) => {
            const net = roundMoney((owed[currentUser]?.[user] || 0) - (owed[user]?.[currentUser] || 0));
            const tone = net > 0 ? 'positive' : net < 0 ? 'negative' : 'even';
            const settling = settleUser === user;
            const direction = net > 0 ? `${user} pays you.` : `You pay ${user}.`;

            return (
              <li key={user} className="balance-entry">
                <div className="balance-item">
                  <span className="balance-name">{user}</span>
                  <span className={`balance-amount ${tone}`}>{formatBalance(net)}</span>
                </div>
                {net !== 0 ? (
                  <>
                    <button
                      className="frontend-button settle-btn"
                      type="button"
                      aria-expanded={settling}
                      onClick={() => openSettle(user, net)}
                    >
                      {settling ? 'Cancel' : 'Settle up'}
                    </button>
                    <div className={`settle-panel ${settling ? 'is-open' : ''}`}>
                      <div className="settle-panel-inner" inert={settling ? undefined : true}>
                        <form className="settle-form" onSubmit={(event) => submitPayment(event, user, net)}>
                          <p className="household-note">{direction}</p>
                          {error ? <p className="info-box error">{error}</p> : null}
                          <div className="form-group">
                            <label htmlFor={`settle-amount-${user}`}>Amount</label>
                            <input
                              id={`settle-amount-${user}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={amount}
                              onChange={(event) => setAmount(event.target.value)}
                              onWheel={(event) => event.target.blur()}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`settle-date-${user}`}>Paid on</label>
                            <input
                              id={`settle-date-${user}`}
                              type="date"
                              value={paidOn}
                              onChange={(event) => setPaidOn(event.target.value)}
                            />
                          </div>
                          <button className="frontend-button" type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Record payment'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

const ExpenseList = ({ title, note, expenses, users, categories, showSplit, onUpdate, onAdd, onRemove, onSave }) => (
  <div className="expenses-card">
    <h3>{title}</h3>
    {note ? <p className="household-note">{note}</p> : null}

    {withoutUpcoming(expenses).map((expense) => (
      <ExpenseCardItem
        key={expense.id}
        expense={expense}
        users={users}
        categories={categories}
        showSplit={showSplit}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onSave={onSave}
      />
    ))}

    <button className="frontend-button add-expense-btn" type="button" onClick={onAdd}>
      Add New Expense
    </button>
  </div>
);

export const ExpensesPanel = ({
  showSharedSplit,
  expenses,
  users,
  categories,
  currentUser,
  onUpdate,
  onAdd,
  onRemove,
  onSave,
  onRecordPayment,
}) => {
  const billExpenses = expenses.filter((expense) => expense.kind !== 'payment');

  return (
  <div className="household-panel-section expenses-layout">
    <div className="expenses-column">
      <UpcomingExpenses
        expenses={billExpenses}
        users={users}
        categories={categories}
        showSplit={showSharedSplit}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onSave={onSave}
      />

      <ExpenseList
        title={showSharedSplit ? 'Shared Expenses' : 'Expenses'}
        expenses={billExpenses}
        users={users}
        categories={categories}
        showSplit={showSharedSplit}
        onUpdate={onUpdate}
        onAdd={onAdd}
        onRemove={onRemove}
        onSave={onSave}
      />
    </div>

    <MemberBalances
      expenses={expenses}
      users={users}
      currentUser={currentUser}
      onRecordPayment={onRecordPayment}
    />
  </div>
  );
};

export const CategoriesPanel = ({
  categories,
  categoryTitle,
  categoryColor,
  categoryBudget,
  categoryError,
  savingCategory,
  onTitleChange,
  onColorChange,
  onBudgetChange,
  onCreate,
  onUpdate,
  onPersist,
  onRemove,
}) => {
  const [adding, setAdding] = useState(false);

  const handleCreate = async (event) => {
    const created = await onCreate(event);
    if (created) setAdding(false);
  };

  return (
  <div className="household-panel-section category-panel">
    <div className="category-block">
      <h3>Categories</h3>
      {categories.length > 0 ? (
        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.id} className="category-item">
              <div className="category-item-fields flex gap-10">
                <input
                  className="category-color-input"
                  type="color"
                  value={category.color}
                  onChange={(event) => onUpdate(category, 'color', event.target.value)}
                  onBlur={(event) => onPersist({ ...category, color: event.target.value })}
                  aria-label={`${category.title} color`}
                />
                <input
                  type="text"
                  value={category.title}
                  onChange={(event) => onUpdate(category, 'title', event.target.value)}
                  onBlur={(event) => onPersist({ ...category, title: event.target.value })}
                  aria-label={`${category.title} title`}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={category.budget}
                  onChange={(event) => onUpdate(category, 'budget', event.target.value)}
                  onBlur={(event) => onPersist({ ...category, budget: event.target.value })}
                  onWheel={(event) => event.target.blur()}
                  aria-label={`${category.title} budget`}
                />
                <button
                  className="remove-expense-btn"
                  type="button"
                  title="Delete category"
                  aria-label={`Delete ${category.title}`}
                  disabled={savingCategory === category.id}
                  onClick={() => onRemove(category.id)}
                >
                  -
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="household-note">No categories yet.</p>
      )}

<div className="category-add-control">
      <div className={`category-add ${adding ? 'is-open' : ''}`} id="add-budget-category">
        <div className="category-add-inner" inert={adding ? undefined : true}>
          <div className="category-block">
            <h3>Add Budget Category</h3>
            <p className="household-note">
              Set a title, label color, and monthly budget. The color is applied to expense cards in that
              category.
            </p>

            {categoryError ? <p className="info-box error">{categoryError}</p> : null}

            <form className="category-form flex gap-10" onSubmit={handleCreate}>
              <div className="form-group col">
                <label htmlFor="category-title">Title</label>
                <input
                  id="category-title"
                  type="text"
                  value={categoryTitle}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder=""
                />
              </div>

              <div className="form-group col">
                <label htmlFor="category-budget">Budget</label>
                <input
                  id="category-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={categoryBudget}
                  onChange={(event) => onBudgetChange(event.target.value)}
                  placeholder="0"
                  onWheel={(event) => event.target.blur()}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category-color">Color</label>
                <div className="category-color-row flex gap-10">
                  <input
                    id="category-color"
                    className="category-color-input"
                    type="color"
                    value={categoryColor}
                    onChange={(event) => onColorChange(event.target.value)}
                    aria-label="Category color"
                  />
                  <div className="category-swatches flex gap-10">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`category-swatch ${categoryColor === color ? 'active' : ''}`}
                        type="button"
                        style={{ background: color }}
                        aria-label={`Use ${color}`}
                        onClick={() => onColorChange(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button className="frontend-button" type="submit" disabled={savingCategory === 'create'}>
                {savingCategory === 'create' ? 'Adding...' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <button
        className="frontend-button add-category-btn"
        type="button"
        aria-expanded={adding}
        aria-controls="add-budget-category"
        onClick={() => setAdding((open) => !open)}
      >
        {adding ? 'Cancel' : 'Add New Category'}
      </button>
    </div>
    </div>

    
  </div>
  );
};

const accountMessageClass = (message) => (
  message.toLowerCase().includes('updated') || message.toLowerCase().includes('created') ? '' : 'error'
);

export const HouseholdsPanel = ({
  username,
  accountMessage,
  savingAccount,
  onUsernameChange,
  onUpdateUsername,
  household,
  households,
  householdName,
  householdMessage,
  copied,
  joinCode,
  joinMessage,
  joiningHousehold,
  onHouseholdNameChange,
  onCreateHousehold,
  onCopyJoinCode,
  onJoinCodeChange,
  onJoinHousehold,
  onSwitchHousehold,
}) => (
  <div className="household-panel-section">
    <h3>Households</h3>

    <div className="household-account">
      <form onSubmit={onUpdateUsername}>
        {accountMessage ? (
          <p className={`info-box ${accountMessageClass(accountMessage)}`}>{accountMessage}</p>
        ) : null}
        <div className="form-group">
          <label htmlFor="household-username">Username</label>
          <input
            id="household-username"
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Username"
            autoComplete="username"
          />
        </div>
        <button className="frontend-button" type="submit" disabled={savingAccount === 'username'}>
          {savingAccount === 'username' ? 'Updating...' : 'Update Username'}
        </button>
      </form>
    </div>

    <p className="household-note">
      Select a household to view it. Members for that household are shown below its name.
    </p>

    {households.length === 0 ? (
      <p className="household-note">No households yet. Create one or join with a code below.</p>
    ) : (
      <ul className="household-list">
        {households.map((item) => {
          const isActive = item.id === household?.id;
          const members = item.members || [];

          return (
            <li key={item.id || item.joinCode} className={`household-list-item ${isActive ? 'active' : ''}`}>
              <button
                className="household-list-toggle"
                type="button"
                onClick={() => onSwitchHousehold(item.id)}
              >
                <span>{item.name}</span>
                <span className="text-small">
                  {isActive ? 'Viewing' : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
                </span>
              </button>

              <div className="household-list-details" inert={isActive ? undefined : true}>
                <div className="household-list-details-inner">
                  {item.joinCode ? (
                    <div className="household-invite flex gap-10">
                      <p className="text-small">
                        Join code <strong>{item.joinCode}</strong>
                      </p>
                      <button className="frontend-button copy-code-btn" type="button" onClick={onCopyJoinCode}>
                        {copied ? 'Copied' : 'Copy code'}
                      </button>
                    </div>
                  ) : null}

                  {members.length === 0 ? (
                    <p className="household-note">No members in this household yet.</p>
                  ) : (
                    <ul className="household-member-list">
                      {members.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}

    <form className="join-household-form" onSubmit={onCreateHousehold}>
      <h3>Create Household</h3>
      <p className="household-note">Create another household for a different group.</p>
      {householdMessage ? (
        <p className={`info-box ${accountMessageClass(householdMessage)}`}>{householdMessage}</p>
      ) : null}
      <div className="join-household-row flex gap-10">
        <div className="form-group">
          <label htmlFor="household-name">Household name</label>
          <input
            id="household-name"
            type="text"
            value={householdName}
            onChange={(event) => onHouseholdNameChange(event.target.value)}
            placeholder="Household name"
          />
        </div>
        <button className="frontend-button" type="submit" disabled={savingAccount === 'household'}>
          {savingAccount === 'household' ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>

    <form className="join-household-form" onSubmit={onJoinHousehold}>
      <h3>Join Household</h3>
      <p className="household-note">Enter an invite code to join another household.</p>
      {joinMessage ? (
        <p className={`info-box ${joinMessage.toLowerCase().includes('joined') ? '' : 'error'}`}>
          {joinMessage}
        </p>
      ) : null}
      <div className="join-household-row flex gap-10">
        <div className="form-group">
          <label htmlFor="household-join-code">Join code</label>
          <input
            id="household-join-code"
            type="text"
            value={joinCode}
            onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
            placeholder=""
          />
        </div>
        <button className="frontend-button" type="submit" disabled={joiningHousehold}>
          {joiningHousehold ? 'Joining...' : 'Join'}
        </button>
      </div>
    </form>
  </div>
);

const monthKeyFromDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonthKey = (key, amount) => {
  const [year, month] = key.split('-').map(Number);
  return monthKeyFromDate(new Date(year, month - 1 + amount, 1));
};

const formatMonthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const HistoryPanel = ({ items, categories }) => {
  const currentKey = monthKeyFromDate(new Date());
  const [monthKey, setMonthKey] = useState(currentKey);
  const monthItems = items.filter((item) => monthKeyFromDate(item.at) === monthKey);
  const monthLabel = formatMonthLabel(monthKey);
  const canGoForward = monthKey < currentKey;

  return (
  <div className="household-panel-section">
    <h3>History</h3>
    <p className="household-note">A log of expenses created, updated, paid, and deleted.</p>

    <div className="history-month-nav">
      <button
        className="frontend-button"
        type="button"
        onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
        aria-label="Previous month"
      >
        Previous
      </button>
      <p className="history-month-label">{monthLabel}</p>
      <button
        className="frontend-button"
        type="button"
        onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
        disabled={!canGoForward}
        aria-label="Next month"
      >
        Next
      </button>
    </div>

    {monthItems.length === 0 ? (
      <p className="household-note">
        {items.length === 0 && monthKey === currentKey
          ? 'No expense history yet. Save an expense to add an entry.'
          : `No expense history for ${monthLabel}.`}
      </p>
    ) : (
      <ul className="history-list">
        {monthItems.map((item) => {
          const category = getCategoryById(categories, item.categoryId);
          const isPayment = item.kind === 'payment';
          const actionLabel = isPayment && item.action === 'created'
            ? 'Recorded'
            : {
              created: 'Created',
              updated: 'Updated',
              paid: 'Paid',
              unpaid: 'Marked unpaid',
              deleted: 'Deleted',
            }[item.action] || 'Updated';
          const meta = [
            actionLabel,
            !isPayment && item.dueDate && !item.datePaid ? `due ${formatDate(item.dueDate)}` : null,
            !isPayment && item.datePaid ? `paid ${formatDate(item.datePaid)}` : null,
            item.at ? formatDateTime(item.at) : null,
          ].filter(Boolean);

          return (
            <li key={item.id} className="history-item">
              <div className="history-item-main">
                <h4 className="history-item-title">{item.title || 'Untitled'}</h4>
                {meta.length ? <p className="text-small">{meta.join(' · ')}</p> : null}
              </div>
              {category ? (
                <span className="expense-category-chip" style={{ '--category-color': category.color }}>
                  {category.title}
                </span>
              ) : null}
              <span className="history-item-amount">{formatMoney(item.amount)}</span>
            </li>
          );
        })}
      </ul>
    )}
  </div>
  );
};

const HouseholdSidebar = ({ activePanel, onPanelChange }) => (
  <aside className="household-sidebar">
    <nav className="household-sidebar-nav" aria-label="Household sections">
      {HOUSEHOLD_PANELS.map((panel) => (
        <button
          key={panel.id}
          className={`household-sidebar-link ${activePanel === panel.id ? 'active' : ''}`}
          type="button"
          onClick={() => onPanelChange(panel.id)}
        >
          {panel.label}
        </button>
      ))}
    </nav>
  </aside>
);

export default HouseholdSidebar;
