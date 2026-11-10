import { useEffect, useState } from 'react';
import './ExpenseCard.css';
import {
  createEvenShares,
  formatDate,
  formatMoney,
  getCategoryById,
  getExpenseShares,
  getParticipants,
  getValueSplit,
  toPayOnValue,
} from '../../utils/expenseUtils.js';

const ExpenseCard = ({ expense: saved, users = [], categories = [], showSplit = false, onRemove, onSave }) => {
  const [draft, setDraft] = useState(saved);
  const canSplit = showSplit && users.length > 1;
  const isCreated = Boolean(saved.savedAt);
  const [expanded, setExpanded] = useState(!isCreated);

  const updateDraft = (field, value) => {
    setDraft((current) => {
      if (typeof field === 'object' && field !== null) {
        return { ...current, ...field };
      }
      return { ...current, [field]: value };
    });
  };

  useEffect(() => {
    setDraft(saved);
  }, [saved.id]);

  useEffect(() => {
    if (saved.savedAt && !saved.saveError) {
      setDraft(saved);
      setExpanded(false);
    }
  }, [saved.savedAt, saved.saveError]);

  const onChange = updateDraft;
  const expense = { ...draft, saveError: saved.saveError };
  const isDirty =
    !saved.savedAt ||
    ['title', 'description', 'amount', 'splitType', 'categoryId'].some(
      (key) => String(draft[key] ?? '') !== String(saved[key] ?? '')
    ) ||
    JSON.stringify(draft.shares || {}) !== JSON.stringify(saved.shares || {}) ||
    JSON.stringify(draft.splitWith || []) !== JSON.stringify(saved.splitWith || []);
  const category = getCategoryById(categories, expense.categoryId);
  const splitType = expense.splitType || 'even';
  const participants = canSplit ? getParticipants(expense, users) : [];
  const expenseShares = canSplit ? getExpenseShares(expense, users) : {};

  const toggleSplitUser = (user) => {
    const payer = expense.paidBy;
    if (!user || user === payer) return;

    const others = participants.filter((name) => name !== payer && name !== user);
    const next = [
      ...new Set(
        (participants.includes(user) ? [payer, ...others] : [payer, ...others, user]).filter(
          (name) => users.includes(name)
        )
      ),
    ];

    if (!next.length) return;

    onChange({
      splitWith: next,
      shares: createEvenShares(expense.splitType || 'even', expense.amount, next),
    });
  };

  const changeSplitType = (nextType) => {
    onChange({
      splitType: nextType,
      shares: createEvenShares(nextType, expense.amount, participants),
    });
  };

  const withPayerRemainder = (amount, shares) => {
    const nextShares = { ...shares };
    const { remainder } = getValueSplit({ ...expense, amount, shares: nextShares }, users);
    if (participants.includes(expense.paidBy)) {
      nextShares[expense.paidBy] = remainder >= 0 ? remainder : 0;
    }
    return nextShares;
  };

  const changeShare = (user, value) => {
    const shares = { ...(expense.shares || {}), [user]: value };
    onChange({
      shares: splitType === 'value' ? withPayerRemainder(expense.amount, shares) : shares,
    });
  };

  const handleAmountChange = (amount) => {
    if (canSplit && splitType === 'value') {
      onChange({
        amount,
        shares: withPayerRemainder(amount, expense.shares || {}),
      });
      return;
    }
    onChange('amount', amount);
  };

  const valueRemainder = splitType === 'value' ? getValueSplit(expense, users).remainder : 0;
  const valueOver = canSplit && splitType === 'value' && valueRemainder < 0;

  const handleSave = () => {
    if (valueOver) return;
    if (canSplit && splitType === 'value') {
      onSave({ ...draft, shares: withPayerRemainder(draft.amount, draft.shares || {}) });
      return;
    }
    onSave(draft);
  };

  return (
    <div
      className={`expense-item ${expanded ? '' : 'is-collapsed'} ${category ? 'has-category' : ''}`}
      style={category ? { '--category-color': category.color } : undefined}
    >
      <div className="expense-item-main">
        {expanded ? (
          <>
            <input
              type="text"
              value={expense.title}
              onChange={(event) => onChange('title', event.target.value)}
              placeholder="Title"
              aria-label="Expense title"
            />
            {category ? (
              <span className="expense-category-chip">{category.title}</span>
            ) : null}
            <input
              type="number"
              min="0"
              step="0.01"
              value={expense.amount}
              placeholder="$0"
              onChange={(event) => handleAmountChange(event.target.value)}
              onWheel={(event) => event.target.blur()}
              aria-label={`${expense.title || 'Expense'} amount`}
            />
          </>
        ) : (
          <>
            <span className="expense-item-summary-title">{expense.title || 'Untitled'}</span>
            <span className="expense-item-summary-date">
              {expense.datePaid
                ? `Paid On: ${formatDate(toPayOnValue(expense.datePaid) || expense.datePaid)}`
                : (expense.dueDate ? formatDate(toPayOnValue(expense.dueDate)) : '')}
            </span>
            <span className="expense-item-summary-amount">{formatMoney(expense.amount)}</span>
          </>
        )}
        <button
          className={`expense-toggle-btn ${expanded ? 'is-open' : ''}`}
          type="button"
          title={expanded ? 'Collapse expense' : 'Expand expense'}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${expense.title || 'expense'}` : `Expand ${expense.title || 'expense'}`}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="expense-toggle-icon">+</span>
        </button>
      </div>

      <div className="expense-item-details">
        <div className="expense-item-details-inner" inert={!expanded || undefined}>
          <textarea
            className="expense-description"
            value={expense.description || ''}
            onChange={(event) => onChange('description', event.target.value)}
            placeholder="Description"
            aria-label={`${expense.title || 'Expense'} description`}
            rows={2}
          />

      <div className="expense-item-options">
        {categories.length > 0 && (
          <div className="expense-field">
            <span>Category</span>
            <select
              className="expense-payer"
              value={expense.categoryId || ''}
              onChange={(event) => onChange('categoryId', event.target.value)}
              aria-label="Expense category"
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {canSplit && (
        <div className="expense-split">
          {/* <div className="expense-split-header">
            <span className="text-small">Split expenses with users</span>
          </div> */}
          <div className="expense-split-options flex gap-10">
            <button
              className={`household-chip ${splitType === 'even' ? 'active' : ''}`}
              type="button"
              onClick={() => changeSplitType('even')}
            >
              Even split
            </button>
            <button
              className={`household-chip ${splitType === 'percent' ? 'active' : ''}`}
              type="button"
              onClick={() => changeSplitType('percent')}
            >
              Set %
            </button>
            <button
              className={`household-chip ${splitType === 'value' ? 'active' : ''}`}
              type="button"
              onClick={() => changeSplitType('value')}
            >
              Set value
            </button>
          </div>

          <div className="expense-split-users">
            {users.map((user) => {
              const included = participants.includes(user);
              const isPayer = user === expense.paidBy;

              return (
                <div
                  key={user}
                  className={`expense-split-row ${included ? 'active' : ''}`}
                >
                  {isPayer ? (
                    <span className="split-user-fixed">
                      <span className="split-user-name is-included">{user}</span>
                    </span>
                  ) : (
                    <label className="split-user-toggle">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleSplitUser(user)}
                        aria-label={`Include ${user} in the split`}
                      />
                      <span className="split-user-slider" aria-hidden="true" />
                      <span className="split-user-name">{user}</span>
                    </label>
                  )}
                  {included && splitType === 'even' && (
                    <span className="split-share-amount">
                      {formatMoney(expenseShares[user])}
                    </span>
                  )}
                  {included && splitType === 'percent' && (
                    <div className="split-share-input">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={expense.shares?.[user] ?? ''}
                        placeholder="0"
                        onChange={(event) =>
                          changeShare(user, event.target.value.replace(/[^\d]/g, ''))
                        }
                        onWheel={(event) => event.target.blur()}
                        aria-label={`${user} percent share`}
                      />
                      <span>%</span>
                    </div>
                  )}
                  {included && splitType === 'value' && isPayer && (
                    <span className="split-share-amount">{formatMoney(Math.max(valueRemainder, 0))}</span>
                  )}
                  {included && splitType === 'value' && !isPayer && (
                    <div className="split-share-input">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={expense.shares?.[user] ?? ''}
                        placeholder="0"
                        onChange={(event) => changeShare(user, event.target.value)}
                        onWheel={(event) => event.target.blur()}
                        aria-label={`${user} dollar share`}
                      />
                    </div>
                  )}
                  {included && isPayer && (
                    <span className="split-paid-label">Paid bill</span>
                  )}
                </div>
              );
            })}
          </div>
          {valueOver && (
            <p className="expense-save-error text-small">
              Shares are {formatMoney(Math.abs(valueRemainder))} over the expense.
            </p>
          )}
        </div>
      )}

      {expense.saveError && (
        <p className="expense-save-error text-small">{expense.saveError}</p>
      )}
      <div className="expense-card-actions">
        <button
          className={`frontend-button save-expense-btn ${saved.savedAt && !isDirty ? 'saved' : ''}`}
          type="button"
          disabled={valueOver}
          onClick={handleSave}
        >
          {saved.savedAt && !isDirty ? 'Saved' : 'Save expense'}
        </button>
        <button
          className="frontend-button delete-expense-btn"
          type="button"
          onClick={onRemove}
        >
          Delete expense
        </button>
      </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;
