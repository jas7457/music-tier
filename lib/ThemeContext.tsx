'use client';

import Cookies from 'js-cookie';
import { createContext, useContext, useState, useCallback } from 'react';

// Screen palettes, named after the hardware they imitate. The colours live in
// globals.css under :root[data-gb-palette=…].
export const GAME_BOY_PALETTES = [
  { id: 'dmg', name: 'Classic', light: '#cadc9f', dark: '#0f380f' },
  { id: 'pocket', name: 'Pocket', light: '#c5c7b3', dark: '#1c1c1a' },
  { id: 'light', name: 'Light', light: '#7df2cf', dark: '#00352a' },
  { id: 'sgb', name: 'Super', light: '#f8e8c8', dark: '#301850' },
] as const;

export type GameBoyPalette = (typeof GAME_BOY_PALETTES)[number]['id'];

type ThemeContextType = {
  palette: GameBoyPalette;
  setPalette: (palette: GameBoyPalette) => void;
  palettes: typeof GAME_BOY_PALETTES;
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
  initialPalette,
}: {
  children: React.ReactNode;
  initialPalette: GameBoyPalette;
}) {
  const [palette, setPaletteState] = useState<GameBoyPalette>(
    GAME_BOY_PALETTES.some((p) => p.id === initialPalette)
      ? initialPalette
      : 'dmg',
  );

  const setPalette = useCallback((next: GameBoyPalette) => {
    Cookies.set('gbPalette', next, { path: '/', expires: 365 * 5 });
    document.documentElement.dataset.gbPalette = next;
    setPaletteState(next);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ palette, setPalette, palettes: GAME_BOY_PALETTES }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
