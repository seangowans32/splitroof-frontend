export const THEME_KEY = 'splitroof-theme';

export const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'color', label: 'Color' },
];

export const readTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return THEMES.some((theme) => theme.id === stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme) => {
  const next = THEMES.some((item) => item.id === theme) ? theme : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage can be unavailable in private browsing.
  }
  return next;
};
