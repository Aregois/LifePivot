import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabase';

export type AccentType = 'blue' | 'violet' | 'green' | 'sunset';

export interface ThemePalette {
  primary: string;
  secondary: string;
  accentRgb: string;
  primaryGradient: readonly [string, string];
  heroGradient: readonly [string, string];
  surface: string;
  card: string;
  cardElevated: string;
  headerBg: string;
  background: string;
  amber: string;
  emerald: string;
  rose: string;
  orange: string;
  electricBlue: string;
  neonViolet: string;
  glassBorder: string;
  glassBg: string;
  glassBorderSubtle: string;
  glassBorderStrong: string;
  overlayBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  inactive: string;
}

const PALETTES: Record<AccentType, ThemePalette> = {
  blue: {
    primary: '#00F0FF',
    secondary: '#BD00FF',
    accentRgb: '0, 240, 255',
    primaryGradient: ['#00F0FF', '#7DF5FF'] as const,
    heroGradient: ['#1A1F36', '#0B0D17'] as const,
    surface: '#0B0D17',
    card: '#141824',
    cardElevated: '#1A2032',
    headerBg: '#0E111F',
    background: '#050508',
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    orange: '#F97316',
    electricBlue: '#00F0FF',
    neonViolet: '#BD00FF',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBg: 'rgba(255, 255, 255, 0.03)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.05)',
    glassBorderStrong: 'rgba(0, 240, 255, 0.25)',
    overlayBg: 'rgba(5, 5, 8, 0.85)',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B4BA',
    textMuted: '#6B7280',
    placeholder: '#3A4155',
    inactive: '#5A6178',
  },
  violet: {
    primary: '#BD00FF',
    secondary: '#FF00A0',
    accentRgb: '189, 0, 255',
    primaryGradient: ['#BD00FF', '#FF00A0'] as const,
    heroGradient: ['#231238', '#0D0717'] as const,
    surface: '#0D0717',
    card: '#1B112B',
    cardElevated: '#241738',
    headerBg: '#130B21',
    background: '#07030D',
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    orange: '#F97316',
    electricBlue: '#BD00FF',
    neonViolet: '#FF00A0',
    glassBorder: 'rgba(189, 0, 255, 0.15)',
    glassBg: 'rgba(189, 0, 255, 0.04)',
    glassBorderSubtle: 'rgba(189, 0, 255, 0.08)',
    glassBorderStrong: 'rgba(189, 0, 255, 0.35)',
    overlayBg: 'rgba(7, 3, 13, 0.88)',
    textPrimary: '#FFFFFF',
    textSecondary: '#C5B4DB',
    textMuted: '#86729C',
    placeholder: '#4C3B61',
    inactive: '#685582',
  },
  green: {
    primary: '#10B981',
    secondary: '#059669',
    accentRgb: '16, 185, 129',
    primaryGradient: ['#10B981', '#34D399'] as const,
    heroGradient: ['#0E2A1E', '#06140E'] as const,
    surface: '#06140E',
    card: '#0F261C',
    cardElevated: '#143326',
    headerBg: '#091A13',
    background: '#030A07',
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    orange: '#F97316',
    electricBlue: '#10B981',
    neonViolet: '#059669',
    glassBorder: 'rgba(16, 185, 129, 0.15)',
    glassBg: 'rgba(16, 185, 129, 0.04)',
    glassBorderSubtle: 'rgba(16, 185, 129, 0.08)',
    glassBorderStrong: 'rgba(16, 185, 129, 0.35)',
    overlayBg: 'rgba(3, 10, 7, 0.88)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A9CBBF',
    textMuted: '#688F80',
    placeholder: '#345749',
    inactive: '#4B7362',
  },
  sunset: {
    primary: '#F59E0B',
    secondary: '#F97316',
    accentRgb: '245, 158, 11',
    primaryGradient: ['#F59E0B', '#F97316'] as const,
    heroGradient: ['#2E1B0E', '#140C06'] as const,
    surface: '#140C06',
    card: '#29170A',
    cardElevated: '#38200E',
    headerBg: '#1D1109',
    background: '#0A0603',
    amber: '#F59E0B',
    emerald: '#10B981',
    rose: '#F43F5E',
    orange: '#F97316',
    electricBlue: '#F59E0B',
    neonViolet: '#F97316',
    glassBorder: 'rgba(245, 158, 11, 0.15)',
    glassBg: 'rgba(245, 158, 11, 0.04)',
    glassBorderSubtle: 'rgba(245, 158, 11, 0.08)',
    glassBorderStrong: 'rgba(245, 158, 11, 0.35)',
    overlayBg: 'rgba(10, 6, 3, 0.88)',
    textPrimary: '#FFFFFF',
    textSecondary: '#DBC5B4',
    textMuted: '#9C7F6B',
    placeholder: '#614B3B',
    inactive: '#826552',
  },
};

interface ThemeContextProps {
  accent: AccentType;
  setAccent: (accent: AccentType) => Promise<void>;
  colors: ThemePalette;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const SECURE_STORE_KEY = 'lifepivot_app_accent';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccentState] = useState<AccentType>('blue');

  useEffect(() => {
    const loadSavedAccent = async () => {
      try {
        const saved = await SecureStore.getItemAsync(SECURE_STORE_KEY);
        if (saved && PALETTES[saved as AccentType]) {
          setAccentState(saved as AccentType);
          return;
        }

        // Fallback: check profile in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('theme_accent')
            .eq('id', user.id)
            .single();

          if (data?.theme_accent && PALETTES[data.theme_accent as AccentType]) {
            setAccentState(data.theme_accent as AccentType);
            await SecureStore.setItemAsync(SECURE_STORE_KEY, data.theme_accent);
          }
        }
      } catch (err) {
        console.warn('[ThemeProvider] Error loading accent:', err);
      }
    };

    loadSavedAccent();
  }, []);

  const setAccent = async (newAccent: AccentType) => {
    if (!PALETTES[newAccent]) return;
    setAccentState(newAccent);

    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, newAccent);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme_accent: newAccent })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('[ThemeProvider] Error saving accent:', err);
    }
  };

  const colors = PALETTES[accent] || PALETTES.blue;

  return (
    <ThemeContext.Provider value={{ accent, setAccent, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
