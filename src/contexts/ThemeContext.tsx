import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'cosmic' | 'cream' | 'soft' | 'hawkeye' | 'gielinor' | 'forest' | 'nebula' | 'matrix';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  wallpaper: string | null;
  setWallpaper: (url: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Detect system preference on first load
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    const validThemes: Theme[] = ['dark', 'light', 'cosmic', 'cream', 'soft', 'hawkeye', 'gielinor', 'forest', 'nebula', 'matrix'];

    // Validate saved theme
    if (saved && validThemes.includes(saved as Theme)) {
      return saved as Theme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark'; // Default to dark (our current theme)
  });

  const [wallpaper, setWallpaperState] = useState<string | null>(() => {
    return localStorage.getItem('app-wallpaper');
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeToDocument(newTheme);
  };

  const setWallpaper = (url: string | null) => {
    setWallpaperState(url);
    if (url) {
      localStorage.setItem('app-wallpaper', url);
    } else {
      localStorage.removeItem('app-wallpaper');
    }
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'cosmic', 'cream', 'soft', 'hawkeye', 'gielinor', 'forest', 'nebula', 'matrix'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  // Apply theme to document root
  const applyThemeToDocument = (themeName: Theme) => {
    const root = document.documentElement;

    // Remove all theme classes (legacy support)
    root.classList.remove('theme-dark', 'theme-light', 'theme-cosmic', 'theme-cream', 'theme-soft', 'theme-hawkeye', 'theme-gielinor', 'theme-forest', 'theme-nebula', 'theme-matrix');

    // Add current theme class (legacy support)
    root.classList.add(`theme-${themeName}`);

    // Set data-theme attribute (New Noesis Labs system)
    root.setAttribute('data-theme', themeName);
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, wallpaper, setWallpaper }}>
      {children}
    </ThemeContext.Provider>
  );
};
