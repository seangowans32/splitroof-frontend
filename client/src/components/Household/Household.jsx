import { useEffect, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './Household.css';
import HouseholdDashboard from './HouseholdDashboard.jsx';
import HouseholdSidebar, {
  CategoriesPanel,
  ExpensesPanel,
  HistoryPanel,
  HouseholdsPanel,
} from './HouseholdSidebar.jsx';
import { AuthAPI, ExpenseAPI, UserAPI } from '../../api.js';
import {
  CATEGORY_COLORS,
  createCategory,
  createExpense,
  fromApiExpense,
  isSavedExpenseId,
  toDateInputValue,
  toPayOnValue,
} from '../../utils/expenseUtils.js';
import {
  applyServerUser,
  getHouseholdUsers,
  getStoredUser,
  isSharedHousehold,
  loadProfileData,
  makeJoinCode,
  saveProfileData,
  syncStoredUsername,
} from '../../utils/profileStorage.js';

const Household = () => {
  const [users, setUsers] = useState([]);
  const [sharedExpenses, setSharedExpenses] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [username, setUsername] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [householdMessage, setHouseholdMessage] = useState('');
  const [savingAccount, setSavingAccount] = useState('');
  const [household, setHousehold] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activePanel, setActivePanel] = useState('expenses');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [categoryBudget, setCategoryBudget] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [savingCategory, setSavingCategory] = useState('');
  const [expenseLogs, setExpenseLogs] = useState([]);

  const hydrateFromProfile = (profile) => {
    const nextHousehold = profile.household || null;
    const nextHouseholds = profile.households?.length
      ? profile.households
      : (nextHousehold ? [nextHousehold] : []);
    const nextUsers = getHouseholdUsers(profile);
    const preferred = profile.username || nextUsers[0];

    setHousehold(nextHousehold);
    setHouseholds(nextHouseholds);
    setUsers(nextUsers);
    setUsername(profile.username || '');
    setCurrentUser(nextUsers.includes(preferred) ? preferred : (nextUsers[0] || ''));
  };

  const persistHousehold = (nextHousehold, nextHouseholds = households) => {
    const list = (nextHouseholds || []).map((item) =>
      item.id === nextHousehold?.id ? nextHousehold : item
    );
    const withCurrent = nextHousehold && !list.some((item) => item.id === nextHousehold.id)
      ? [...list, nextHousehold]
      : list;

    setHousehold(nextHousehold);
    setHouseholds(withCurrent);
    saveProfileData({ household: nextHousehold, households: withCurrent });
  };

  const loadExpenseHistory = async () => {
    const response = await ExpenseAPI.history();
    setExpenseLogs(response.history || []);
  };

  const loadExpenses = async () => {
    const expenses = await ExpenseAPI.list();
    setSharedExpenses((expenses.shared || []).map(fromApiExpense));
    await loadExpenseHistory();
  };

  useEffect(() => {
    AOS.init();
    hydrateFromProfile(loadProfileData());

    if (!getStoredUser()) return undefined;

    Promise.all([AuthAPI.getUser(), ExpenseAPI.list(), ExpenseAPI.history()])
      .then(([{ user }, expenses, history]) => {
        if (user) hydrateFromProfile(applyServerUser(user));
        setSharedExpenses((expenses.shared || []).map(fromApiExpense));
        setExpenseLogs(history.history || []);
      })
      .catch((error) => {
        setLoadError(error.message || 'Could not load household data.');
      });

    return undefined;
  }, []);

  const updateList = (setter) => (id, field, value) => {
    setter((current) =>
      current.map((expense) => {
        if (expense.id !== id) return expense;
        if (typeof field === 'object' && field !== null) {
          return { ...expense, ...field };
        }
        return { ...expense, [field]: value, saveError: '' };
      })
    );
  };

  const addToList = (setter, paidBy = '', nextUsers = [], kind = '') => () => {
    setter((current) => [...current, createExpense(paidBy, nextUsers, kind)]);
  };

  const removeFromList = (setter) => async (id) => {
    if (getStoredUser() && isSavedExpenseId(id)) {
      try {
        await ExpenseAPI.remove(id);
        await loadExpenseHistory();
      } catch (error) {
        setter((current) =>
          current.map((expense) =>
            expense.id === id
              ? { ...expense, saveError: error.message || 'Could not delete expense.' }
              : expense
          )
        );
        return;
      }
      setter((current) => current.filter((expense) => expense.id !== id));
      return;
    }

    setter((current) => {
      const previous = current.find((expense) => expense.id === id);
      if (previous?.savedAt) appendExpenseLog('deleted', previous, previous.kind);
      return current.filter((expense) => expense.id !== id);
    });
  };

  const appendExpenseLog = (action, payload, kind) => {
    setExpenseLogs((current) => [
      {
        id: crypto.randomUUID(),
        action,
        at: new Date().toISOString(),
        kind: payload.kind || kind,
        title: payload.title || '',
        amount: payload.amount || 0,
        dueDate: toPayOnValue(payload.dueDate),
        datePaid: payload.datePaid || '',
        categoryId: payload.categoryId || '',
        paidBy: payload.paidBy || '',
      },
      ...current,
    ]);
  };

  const logActionFromUpdate = (previous, next) => {
    const wasPaid = Boolean(previous?.datePaid);
    const isPaid = Boolean(next?.datePaid);
    if (!wasPaid && isPaid) return 'paid';
    if (wasPaid && !isPaid) return 'unpaid';
    return 'updated';
  };

  const saveExpense = (kind, setter) => async (payload) => {
    if (!payload?.id) return;
    const id = payload.id;

    if (!String(payload.title || '').trim() || !(Number(payload.amount) > 0)) {
      setter((current) =>
        current.map((expense) =>
          expense.id === id
            ? { ...expense, saveError: 'Add a title and amount to save.' }
            : expense
        )
      );
      return;
    }

    if (!getStoredUser()) {
      setter((current) => {
        const previous = current.find((expense) => expense.id === id);
        appendExpenseLog(
          previous?.savedAt ? logActionFromUpdate(previous, payload) : 'created',
          payload,
          kind
        );
        return current.map((expense) =>
          expense.id === id
            ? {
                ...payload,
                kind,
                datePaid: toPayOnValue(payload.datePaid) || toDateInputValue(),
                dueDate: toPayOnValue(payload.dueDate),
                savedAt: new Date().toISOString(),
                saveError: '',
              }
            : expense
        );
      });
      return;
    }

    try {
      const paidOn = toPayOnValue(payload.datePaid) || toDateInputValue();
      const response = isSavedExpenseId(id)
        ? await ExpenseAPI.update(id, { ...payload, kind, datePaid: paidOn, dueDate: toPayOnValue(payload.dueDate) })
        : await ExpenseAPI.create({ ...payload, kind, datePaid: paidOn, dueDate: toPayOnValue(payload.dueDate) });
      const saved = fromApiExpense(response.expense);
      setter((current) =>
        current.map((expense) =>
          expense.id === id
            ? { ...saved, dueDate: saved.dueDate || toPayOnValue(payload.dueDate) }
            : expense
        )
      );
      await loadExpenseHistory();
    } catch (error) {
      setter((current) =>
        current.map((expense) =>
          expense.id === id
            ? { ...expense, saveError: error.message || 'Could not save expense.' }
            : expense
        )
      );
    }
  };

  const recordPayment = async ({ from, to, amount, date }) => {
    const payload = {
      kind: 'payment',
      title: `Payment from ${from}`,
      description: `Payment to ${to}`,
      amount,
      paidBy: from,
      datePaid: date,
      dueDate: date,
      splitType: 'value',
      splitWith: [to],
      shares: { [to]: amount },
      payments: {},
      categoryId: '',
    };

    if (!getStoredUser()) {
      const local = {
        ...createExpense(from, [to], 'payment'),
        ...payload,
        savedAt: new Date().toISOString(),
        saveError: '',
      };
      setSharedExpenses((current) => [...current, local]);
      appendExpenseLog('created', local, 'payment');
      return;
    }

    const response = await ExpenseAPI.create(payload);
    setSharedExpenses((current) => [...current, fromApiExpense(response.expense)]);
    await loadExpenseHistory();
  };

  const handleSwitchHousehold = async (householdId) => {
    if (!householdId || householdId === household?.id) return;
    setLoadError('');

    if (!getStoredUser()) {
      const selected = households.find((item) => item.id === householdId);
      if (selected) {
        hydrateFromProfile(saveProfileData({ household: selected, households }));
      }
      return;
    }

    try {
      const response = await UserAPI.selectHousehold(householdId);
      hydrateFromProfile(saveProfileData({
        household: response.household,
        households: response.households,
      }));
      await loadExpenses();
    } catch (error) {
      setLoadError(error.message || 'Could not switch household.');
    }
  };

  const handleCopyJoinCode = async () => {
    if (!household?.joinCode) return;
    try {
      await navigator.clipboard.writeText(household.joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setLoadError('Could not copy join code.');
    }
  };

  const handleUpdateUsername = async (event) => {
    event.preventDefault();
    setAccountMessage('');

    const nextUsername = username.trim();
    if (!nextUsername) {
      setAccountMessage('Enter a username to update.');
      return;
    }

    setSavingAccount('username');
    const saved = saveProfileData({ username: nextUsername });
    syncStoredUsername(nextUsername);
    hydrateFromProfile(saved);

    if (!getStoredUser()) {
      setAccountMessage('Username updated.');
      setSavingAccount('');
      return;
    }

    try {
      await UserAPI.updateUsername(nextUsername);
      setAccountMessage('Username updated.');
    } catch (error) {
      setAccountMessage(error.message || 'Could not update username on the server.');
    } finally {
      setSavingAccount('');
    }
  };

  const handleCreateHousehold = async (event) => {
    event.preventDefault();
    setHouseholdMessage('');

    const nextUsername = username.trim();
    if (!nextUsername) {
      setHouseholdMessage('Set a username before creating a household.');
      return;
    }

    const name = householdName.trim();
    if (!name) {
      setHouseholdMessage('Enter a household name.');
      return;
    }

    const nextHousehold = {
      id: `local-${Date.now()}`,
      name,
      joinCode: makeJoinCode(),
      members: [nextUsername],
      createdAt: new Date().toISOString(),
    };

    setSavingAccount('household');

    if (!getStoredUser()) {
      hydrateFromProfile(saveProfileData({
        username: nextUsername,
        household: nextHousehold,
        households: [...households, nextHousehold],
      }));
      setHouseholdName('');
      setHouseholdMessage('Household created.');
      setSavingAccount('');
      return;
    }

    try {
      const response = await UserAPI.createHousehold(name);
      const created = response.household || nextHousehold;
      hydrateFromProfile(saveProfileData({
        username: nextUsername,
        household: created,
        households: response.households || [...households, created],
      }));
      setHouseholdName('');
      setHouseholdMessage('Household created.');
    } catch (error) {
      setHouseholdMessage(error.message || 'Could not create household on the server.');
    } finally {
      setSavingAccount('');
    }
  };

  const handleJoinHousehold = async (event) => {
    event.preventDefault();
    setJoinMessage('');

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinMessage('Enter a join code.');
      return;
    }

    if (!getStoredUser()) {
      setJoinMessage('Sign in to join a household.');
      return;
    }

    setJoiningHousehold(true);

    try {
      const response = await UserAPI.joinHousehold(code);
      hydrateFromProfile(saveProfileData({
        household: response.household,
        households: response.households,
      }));
      await loadExpenses();
      setJoinCode('');
      setJoinMessage('Joined household.');
    } catch (error) {
      setJoinMessage(error.message || 'Could not join household.');
    } finally {
      setJoiningHousehold(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryTitle('');
    setCategoryColor(CATEGORY_COLORS[0]);
    setCategoryBudget('');
    setCategoryError('');
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setCategoryError('');

    const title = categoryTitle.trim();
    if (!title) {
      setCategoryError('Enter a category title.');
      return false;
    }
    if (!household) {
      setCategoryError('Create or join a household first.');
      return false;
    }

    const payload = {
      title,
      color: categoryColor,
      budget: Number(categoryBudget) || 0,
    };

    setSavingCategory('create');

    if (!getStoredUser()) {
      persistHousehold({
        ...household,
        categories: [...(household.categories || []), { ...createCategory(), ...payload }],
      });
      resetCategoryForm();
      setSavingCategory('');
      return true;
    }

    try {
      const response = await UserAPI.createCategory(payload);
      persistHousehold(response.household, response.households);
      resetCategoryForm();
      return true;
    } catch (error) {
      setCategoryError(error.message || 'Could not create category.');
      return false;
    } finally {
      setSavingCategory('');
    }
  };

  const handleUpdateCategory = (category, field, value) => {
    persistHousehold({
      ...household,
      categories: (household.categories || []).map((item) =>
        item.id === category.id ? { ...item, [field]: value } : item
      ),
    });
  };

  const persistCategory = async (category) => {
    if (!getStoredUser() || !category?.id) return;

    const title = String(category.title || '').trim();
    if (!title) {
      setCategoryError('Enter a category title.');
      return;
    }

    setCategoryError('');
    setSavingCategory(category.id);

    try {
      const response = await UserAPI.updateCategory(category.id, {
        title,
        color: category.color,
        budget: Number(category.budget) || 0,
      });
      persistHousehold(response.household, response.households);
    } catch (error) {
      setCategoryError(error.message || 'Could not update category.');
    } finally {
      setSavingCategory('');
    }
  };

  const handleRemoveCategory = async (id) => {
    setCategoryError('');
    setSavingCategory(id);

    if (!getStoredUser()) {
      persistHousehold({
        ...household,
        categories: (household.categories || []).filter((item) => item.id !== id),
      });
      setSavingCategory('');
      return;
    }

    try {
      const response = await UserAPI.removeCategory(id);
      persistHousehold(response.household, response.households);
    } catch (error) {
      setCategoryError(error.message || 'Could not delete category.');
    } finally {
      setSavingCategory('');
    }
  };

  const showExpenses = isSharedHousehold(household);
  const categories = household?.categories || [];
  const budgetExpenses = sharedExpenses;
  const savedExpenses = budgetExpenses.filter((expense) => expense.savedAt);
  const historyItems = expenseLogs;

  return (
    <div className="App">
      <div className="App-body">
        <div className="dotted-bg" aria-hidden="true" />
        <div className="container expenses-page" data-aos="zoom-in-up">
          <div className="household-header">
            <div className="household-header-row">
              <h2>{household?.name || 'Household'}</h2>
            </div>
            {loadError ? <p className="info-box error">{loadError}</p> : null}
          </div>

          <HouseholdDashboard
            categories={categories}
            expenses={savedExpenses}
            users={users}
            currentUser={currentUser}
          />

          <div className="household-layout">
            <HouseholdSidebar activePanel={activePanel} onPanelChange={setActivePanel} />

            <div className="household-main">
              {activePanel === 'expenses' ? (
                <ExpensesPanel
                  showSharedSplit={showExpenses}
                  expenses={sharedExpenses}
                  users={users}
                  categories={categories}
                  currentUser={currentUser}
                  onUpdate={updateList(setSharedExpenses)}
                  onAdd={addToList(setSharedExpenses, currentUser, users, 'shared')}
                  onRemove={removeFromList(setSharedExpenses)}
                  onSave={saveExpense('shared', setSharedExpenses)}
                  onRecordPayment={recordPayment}
                />
              ) : null}

              {activePanel === 'categories' ? (
                <CategoriesPanel
                  categories={categories}
                  categoryTitle={categoryTitle}
                  categoryColor={categoryColor}
                  categoryBudget={categoryBudget}
                  categoryError={categoryError}
                  savingCategory={savingCategory}
                  onTitleChange={setCategoryTitle}
                  onColorChange={setCategoryColor}
                  onBudgetChange={setCategoryBudget}
                  onCreate={handleCreateCategory}
                  onUpdate={handleUpdateCategory}
                  onPersist={persistCategory}
                  onRemove={handleRemoveCategory}
                />
              ) : null}

              {activePanel === 'households' ? (
                <HouseholdsPanel
                  username={username}
                  accountMessage={accountMessage}
                  savingAccount={savingAccount}
                  onUsernameChange={setUsername}
                  onUpdateUsername={handleUpdateUsername}
                  household={household}
                  households={households}
                  householdName={householdName}
                  householdMessage={householdMessage}
                  copied={copied}
                  joinCode={joinCode}
                  joinMessage={joinMessage}
                  joiningHousehold={joiningHousehold}
                  onHouseholdNameChange={setHouseholdName}
                  onCreateHousehold={handleCreateHousehold}
                  onCopyJoinCode={handleCopyJoinCode}
                  onJoinCodeChange={setJoinCode}
                  onJoinHousehold={handleJoinHousehold}
                  onSwitchHousehold={handleSwitchHousehold}
                />
              ) : null}

              {activePanel === 'history' ? (
                <HistoryPanel items={historyItems} categories={categories} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Household;