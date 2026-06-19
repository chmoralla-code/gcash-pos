import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from './constants';
import { getAppSetting, setAppSetting } from './database';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getAppSetting('darkMode');
      if (saved !== null) {
        setIsDark(saved === 'true');
      } else {
        setIsDark(systemScheme === 'dark');
      }
      setLoaded(true);
    })();
  }, []);

  const toggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    await setAppSetting('darkMode', String(next));
  };

  const colors = isDark ? DARK_COLORS : COLORS;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
