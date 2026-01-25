'use client';

import Cookies from 'js-cookie';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useCallback,
} from 'react';

// Map color names to their Tailwind CSS variable shades
const TAILWIND_COLOR_SHADES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

export type ColorName = (typeof TAILWIND_COLOR_SHADES)[number];

type ThemeContextType = {
  primaryColor: ColorName;
  setPrimaryColor: (color: ColorName) => void;
  availableColors: ColorName[];
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({
  children,
  initialColor,
}: {
  children: React.ReactNode;
  initialColor: ColorName;
}) {
  const [primaryColor, setPrimaryColorState] = useState(initialColor);

  const setStyles = useCallback((color: ColorName) => {
    const root = document.documentElement;

    // Reference Tailwind's built-in CSS variables
    root.style.setProperty(
      '--color-primary-lightest',
      `var(--color-${color}-50)`,
    );
    root.style.setProperty(
      '--color-primary-lighter',
      `var(--color-${color}-200)`,
    );
    root.style.setProperty(
      '--color-primary-light',
      `var(--color-${color}-300)`,
    );
    root.style.setProperty('--color-primary', `var(--color-${color}-500)`);
    root.style.setProperty('--color-primary-dark', `var(--color-${color}-600)`);
    root.style.setProperty(
      '--color-primary-darker',
      `var(--color-${color}-700)`,
    );
    root.style.setProperty(
      '--color-primary-darkest',
      `var(--color-${color}-800)`,
    );
  }, []);

  // Apply CSS variables whenever color changes
  useLayoutEffect(() => {
    setStyles(primaryColor);
  }, [primaryColor, setStyles]);

  const setPrimaryColor = useCallback(
    (color: ColorName) => {
      Cookies.set('primaryColor', color, { path: '/', expires: 365 * 5 });
      setStyles(color);
      setPrimaryColorState(color);
    },
    [setStyles],
  );

  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        setPrimaryColor,
        availableColors: TAILWIND_COLOR_SHADES as unknown as ColorName[],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
