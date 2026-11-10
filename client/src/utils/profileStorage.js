const STORAGE_KEY = 'splitroof-profile';

const emptyProfile = {
  username: '',
  household: null,
  households: [],
};

export const makeJoinCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const isSharedHousehold = (household) => (household?.members || []).length > 1;

export const getHouseholdUsers = (profile = loadProfileData()) => {
  const username = profile.username || getStoredUser()?.username || '';
  const members = profile.household?.members || [];

  if (members.length) {
    return Array.from(new Set([...members, username].filter(Boolean)));
  }

  return username ? [username] : [];
};

export const applyServerUser = (user) => {
  if (!user) return loadProfileData();

  localStorage.setItem('user', JSON.stringify({
    _id: user._id,
    username: user.username,
    email: user.email,
  }));

  const next = saveProfileData({
    username: user.username || '',
    household: user.household || null,
    households: Array.isArray(user.households) ? user.households : (user.household ? [user.household] : []),
  });

  window.dispatchEvent(new Event('authChange'));
  return next;
};

export const loadProfileData = () => {
  if (typeof localStorage === 'undefined') return { ...emptyProfile };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyProfile };

    const data = JSON.parse(raw);
    return {
      ...emptyProfile,
      ...data,
      household: data.household || null,
      households: Array.isArray(data.households)
        ? data.households
        : (data.household ? [data.household] : []),
    };
  } catch {
    return { ...emptyProfile };
  }
};

export const saveProfileData = (data) => {
  const next = {
    ...emptyProfile,
    ...loadProfileData(),
    ...data,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('profileChange'));
  return next;
};

export const syncStoredUsername = (username) => {
  const user = getStoredUser();
  if (user) {
    localStorage.setItem('user', JSON.stringify({ ...user, username }));
    window.dispatchEvent(new Event('authChange'));
  }
};
