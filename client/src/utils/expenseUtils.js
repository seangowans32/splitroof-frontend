export const CATEGORY_COLORS = [
  '#23a6d5',
  '#ee7752',
  '#e73c7e',
  '#23d5ab',
  '#d4df38',
];

export const createCategory = () => ({
  id: crypto.randomUUID(),
  title: '',
  color: CATEGORY_COLORS[0],
  budget: '',
});

export const getCategoryById = (categories = [], categoryId) =>
  categories.find((category) => category.id === categoryId) || null;

export const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const toDateInputValue = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const toPayOnValue = (value) => {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toDateInputValue(date);
};

export const getNextDueDate = (expense) => toPayOnValue(expense?.dueDate);

export const isUpcomingExpense = (expense) => {
  if (expense?.datePaid) return false;
  const payOn = getNextDueDate(expense);
  return Boolean(payOn && payOn > toDateInputValue());
};

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const createEvenShares = (splitType, amount, participants) => {
  const shares = {};
  if (!participants.length || splitType === 'even') return shares;

  if (splitType === 'percent') {
    const base = Math.floor(100 / participants.length);
    participants.forEach((user, index) => {
      shares[user] =
        index === participants.length - 1
          ? 100 - base * (participants.length - 1)
          : base;
    });
    return shares;
  }

  const total = Number(amount) || 0;
  const base = roundMoney(total / participants.length);
  participants.forEach((user, index) => {
    shares[user] =
      index === participants.length - 1
        ? roundMoney(total - base * (participants.length - 1))
        : base;
  });
  return shares;
};

export const createExpense = (paidBy = '', users = [], kind = '') => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  amount: '',
  paidBy,
  datePaid: toDateInputValue(),
  dueDate: toDateInputValue(),
  splitType: 'even',
  splitWith: paidBy ? [paidBy] : [],
  shares: {},
  payments: {},
  categoryId: '',
  kind,
  savedAt: null,
  saveError: '',
});

export const fromApiExpense = (expense = {}) => ({
  id: expense.id || expense._id,
  title: expense.title || '',
  description: expense.description || '',
  amount: expense.amount ?? '',
  paidBy: expense.paidBy || '',
  datePaid: expense.datePaid || '',
  dueDate: toPayOnValue(expense.dueDate),
  splitType: expense.splitType || 'even',
  splitWith: Array.isArray(expense.splitWith) ? expense.splitWith : [],
  shares: expense.shares || {},
  payments: expense.payments || {},
  categoryId: expense.categoryId || '',
  kind: expense.kind || '',
  savedAt: expense.savedAt || null,
  saveError: '',
});

export const isSavedExpenseId = (id) => /^[a-fA-F0-9]{24}$/.test(String(id || ''));

export const getParticipants = (expense, users) => {
  const splitWith = expense.splitWith?.length ? expense.splitWith : users;
  return users.filter((user) => splitWith.includes(user));
};

export const getValueSplit = (expense, users) => {
  const participants = getParticipants(expense, users);
  const payer = expense.paidBy;
  const amount = roundMoney(expense.amount);
  const assigned = roundMoney(
    participants
      .filter((user) => user !== payer)
      .reduce((sum, user) => sum + (Number(expense.shares?.[user]) || 0), 0)
  );

  return {
    amount,
    assigned,
    remainder: roundMoney(amount - assigned),
  };
};

export const getExpenseShares = (expense, users) => {
  const amount = Number(expense.amount) || 0;
  const participants = getParticipants(expense, users);
  const splitType = expense.splitType || 'even';
  const shares = Object.fromEntries(users.map((user) => [user, 0]));

  if (!amount || !participants.length) return shares;

  if (splitType === 'percent') {
    participants.forEach((user) => {
      const percent = Math.floor(Number(expense.shares?.[user]) || 0);
      shares[user] = roundMoney(amount * (percent / 100));
    });
    return shares;
  }

  if (splitType === 'value') {
    const { remainder } = getValueSplit(expense, users);
    participants.forEach((user) => {
      shares[user] =
        user === expense.paidBy ? Math.max(remainder, 0) : roundMoney(expense.shares?.[user]);
    });
    return shares;
  }

  const base = roundMoney(amount / participants.length);
  participants.forEach((user, index) => {
    shares[user] =
      index === participants.length - 1
        ? roundMoney(amount - base * (participants.length - 1))
        : base;
  });
  return shares;
};

export const sumAmounts = (expenses) =>
  expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

export const getCategorySpent = (expenses, categoryId) =>
  sumAmounts(expenses.filter((expense) => expense.categoryId === categoryId));

export const getOwedToUsers = (expenses, users) => {
  const owedTo = Object.fromEntries(
    users.map((user) => [
      user,
      Object.fromEntries(users.filter((other) => other !== user).map((other) => [other, 0])),
    ])
  );

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const payer = expense.paidBy;
    if (!amount || !users.includes(payer)) return;

    const shares = getExpenseShares(expense, users);
    const payments = expense.payments || {};
    const participants = getParticipants(expense, users);
    const evenHalf = (expense.splitType || 'even') === 'even' && participants.length === 2;
    users.forEach((user) => {
      if (user !== payer && shares[user] > 0 && !payments[user]) {
        const owedShare = evenHalf ? roundMoney((shares[payer] || 0) / 2) : shares[user];
        owedTo[payer][user] += owedShare;
      }
    });
  });

  users.forEach((userA, index) => {
    users.slice(index + 1).forEach((userB) => {
      const bOwesA = owedTo[userA][userB];
      const aOwesB = owedTo[userB][userA];
      const net = bOwesA - aOwesB;

      if (net > 0) {
        owedTo[userA][userB] = net;
        owedTo[userB][userA] = 0;
      } else if (net < 0) {
        owedTo[userB][userA] = -net;
        owedTo[userA][userB] = 0;
      } else {
        owedTo[userA][userB] = 0;
        owedTo[userB][userA] = 0;
      }
    });
  });

  return owedTo;
};
