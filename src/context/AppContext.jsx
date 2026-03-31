import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Initialize from localStorage or fallback to defaults
  const [appName, setAppNameState] = useState(() => {
    return localStorage.getItem('ssv_app_name') || 'SSV Food Tech';
  });

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('ssv_theme') || 'light';
  });

  // Persist appName to localStorage when it changes
  const setAppName = (newName) => {
    setAppNameState(newName);
    localStorage.setItem('ssv_app_name', newName);
  };

  // Persist theme to localStorage and update HTML class
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('ssv_theme', newTheme);
  };

  // Effect to apply the theme to the <html> tag globally
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [theme]);

  // Initial mount setup
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, []); // Run once on mount

  return (
    <AppContext.Provider value={{ appName, setAppName, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
