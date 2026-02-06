import React from 'react';
import { useThemeStore } from '../store/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="destijl-border px-3 py-2 font-black text-xs uppercase transition-all hover:scale-105"
      style={{
        backgroundColor: theme === 'light' ? '#000' : '#fff',
        color: theme === 'light' ? '#fff' : '#000',
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '◐ DARK' : '◑ LIGHT'}
    </button>
  );
};

export default ThemeToggle;
