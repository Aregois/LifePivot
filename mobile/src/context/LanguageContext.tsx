import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { supabase } from '../utils/supabase';
import type {
  Locale,
  SupportedLocale,
  TxKeyPath,
  TranslationParams,
  LanguageContextProps,
} from '../types/i18n';

// Synchronously load English base dictionary (ensures immediate boot & zero-latency fallback)
import enJson from '../locales/en.json';

export type { SupportedLocale, TxKeyPath };

export const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
  fr: 'Français',
  hy: 'Հայերեն',
  ja: '日本語',
  zh: '简体中文',
};

const SECURE_STORE_KEY = 'lifepivot_app_locale';

// Dynamic on-demand locale chunk loaders
const localeLoaders: Record<SupportedLocale, () => Promise<{ default: Record<string, any> }>> = {
  en: () => Promise.resolve({ default: enJson }),
  es: () => import('../locales/es.json'),
  ru: () => import('../locales/ru.json'),
  fr: () => import('../locales/fr.json'),
  hy: () => import('../locales/hy.json'),
  ja: () => import('../locales/ja.json'),
  zh: () => import('../locales/zh.json'),
};

// Flatten nested object keys once into an O(1) hash map
function flattenDict(obj: Record<string, any>, prefix = '', target: Record<string, string> = {}): Record<string, string> {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      flattenDict(val, path, target);
    } else if (typeof val === 'string') {
      target[path] = val;
    }
  }
  return target;
}

// In-memory O(1) flattened cache
const flattenedCache: Partial<Record<SupportedLocale, Record<string, string>>> = {
  en: flattenDict(enJson),
};

// Cached Intl instances to avoid recreation overhead
const pluralRulesCache = new Map<string, any>();
const numberFormatCache = new Map<string, any>();
const dateTimeFormatCache = new Map<string, any>();

// Safe 100% pure-JS Plural Rules Selector (Hermes & React Native compatible)
function selectPluralRule(locale: string, count: number): string {
  const n = Math.abs(count);

  // Russian / Slavic cardinal plural rules
  if (locale === 'ru' || locale.startsWith('ru-')) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return 'one'; // 1, 21, 31, ...
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'few'; // 2..4, 22..24, ...
    }
    if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) {
      return 'many'; // 0, 5..20, 25..30, ...
    }
    return 'other';
  }

  // French rules: 0 and 1 are 'one'
  if (locale === 'fr' || locale.startsWith('fr-')) {
    return n >= 0 && n < 2 ? 'one' : 'other';
  }

  // East Asian languages (no plural forms)
  if (locale === 'ja' || locale === 'zh') {
    return 'other';
  }

  // Armenian rule
  if (locale === 'hy') {
    return n === 1 ? 'one' : 'other';
  }

  // English / Spanish / Default: 1 is 'one', rest are 'other'
  return n === 1 ? 'one' : 'other';
}

// Fast single-pass string interpolation (< 15 lines, zero dynamic RegExp compilation)
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const val = params[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load locale dictionary into memory on demand
  const loadDictionary = useCallback(async (targetLocale: SupportedLocale) => {
    if (flattenedCache[targetLocale]) return;
    try {
      const loader = localeLoaders[targetLocale];
      if (loader) {
        const mod = await loader();
        flattenedCache[targetLocale] = flattenDict(mod.default);
      }
    } catch (err) {
      console.warn(`[LanguageContext] Failed to load locale "${targetLocale}":`, err);
    }
  }, []);

  // Initialize saved or device locale on boot
  useEffect(() => {
    let isMounted = true;

    const initLocale = async () => {
      try {
        let initialLocale: SupportedLocale = 'en';

        // 1. Check SecureStore
        const saved = await SecureStore.getItemAsync(SECURE_STORE_KEY);
        if (saved && localeLoaders[saved as SupportedLocale]) {
          initialLocale = saved as SupportedLocale;
        } else {
          // 2. Check Device Locale
          const deviceLocales = Localization.getLocales();
          const deviceCode = deviceLocales[0]?.languageCode;
          if (deviceCode && localeLoaders[deviceCode as SupportedLocale]) {
            initialLocale = deviceCode as SupportedLocale;
          }
        }

        // 3. Fallback: Check Supabase Profile
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('profiles')
              .select('language')
              .eq('id', user.id)
              .single();

            if (data?.language && localeLoaders[data.language as SupportedLocale]) {
              initialLocale = data.language as SupportedLocale;
            }
          }
        } catch {
          // Non-blocking network check
        }

        if (initialLocale !== 'en') {
          await loadDictionary(initialLocale);
        }

        if (isMounted) {
          setLocaleState(initialLocale);
          setIsLoaded(true);
        }
      } catch (err) {
        console.warn('[LanguageContext] Init error:', err);
        if (isMounted) setIsLoaded(true);
      }
    };

    initLocale();
    return () => {
      isMounted = false;
    };
  }, [loadDictionary]);

  // Set Locale with persistence & async loading
  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (!localeLoaders[newLocale]) return;

      if (newLocale !== 'en' && !flattenedCache[newLocale]) {
        await loadDictionary(newLocale);
      }

      setLocaleState(newLocale);

      try {
        await SecureStore.setItemAsync(SECURE_STORE_KEY, newLocale);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ language: newLocale })
            .eq('id', user.id);
        }
      } catch (err) {
        console.warn('[LanguageContext] Error saving locale preference:', err);
      }
    },
    [loadDictionary]
  );

  // Fast O(1) Translation Function with Slavic Plural Routing
  const t = useCallback(
    (path: TxKeyPath | string, params?: TranslationParams): string => {
      const activeDict = flattenedCache[locale] || flattenedCache['en']!;
      const baseDict = flattenedCache['en']!;

      let rawString: string | undefined;

      // Handle Pluralization if count is supplied
      if (params && typeof params.count === 'number') {
        const count = params.count;
        const rule = selectPluralRule(locale, count); // 'one', 'few', 'many', 'other', 'zero'

        // 1. Check locale specific plural rule key (e.g. tokens_few)
        rawString = activeDict[`${path}_${rule}`];

        // 2. Fallback to _other plural rule
        if (!rawString && rule !== 'other') {
          rawString = activeDict[`${path}_other`];
        }

        // 3. Fallback to English plural rule
        if (!rawString) {
          const enRule = selectPluralRule('en', count);
          rawString = baseDict[`${path}_${enRule}`] || baseDict[`${path}_other`];
        }
      }

      // Standard translation lookup (direct O(1) map read)
      if (!rawString) {
        rawString = activeDict[path] || baseDict[path] || String(path);
      }

      return interpolate(rawString, params);
    },
    [locale]
  );

  // Number Formatter (Safe for Hermes / React Native)
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        if (typeof Intl !== 'undefined' && typeof (Intl as any).NumberFormat === 'function') {
          const cacheKey = `${locale}_${JSON.stringify(options || {})}`;
          if (!numberFormatCache.has(cacheKey)) {
            try {
              numberFormatCache.set(cacheKey, new (Intl as any).NumberFormat(locale, options));
            } catch {
              try {
                numberFormatCache.set(cacheKey, new (Intl as any).NumberFormat('en', options));
              } catch {}
            }
          }
          const formatter = numberFormatCache.get(cacheKey);
          if (formatter && typeof formatter.format === 'function') {
            return formatter.format(value);
          }
        }
      } catch {}
      return String(value);
    },
    [locale]
  );

  // Date Formatter (Safe for Hermes / React Native)
  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      try {
        if (typeof Intl !== 'undefined' && typeof (Intl as any).DateTimeFormat === 'function') {
          const cacheKey = `${locale}_${JSON.stringify(options || {})}`;
          if (!dateTimeFormatCache.has(cacheKey)) {
            try {
              dateTimeFormatCache.set(cacheKey, new (Intl as any).DateTimeFormat(locale, options));
            } catch {
              try {
                dateTimeFormatCache.set(cacheKey, new (Intl as any).DateTimeFormat('en', options));
              } catch {}
            }
          }
          const formatter = dateTimeFormatCache.get(cacheKey);
          if (formatter && typeof formatter.format === 'function') {
            return formatter.format(d);
          }
        }
      } catch {}
      return d?.toLocaleDateString?.() || d?.toDateString?.() || String(date);
    },
    [locale]
  );

  // Currency Formatter
  const formatCurrency = useCallback(
    (amount: number, currency = 'USD'): string => {
      return formatNumber(amount, {
        style: 'currency',
        currency,
      });
    },
    [formatNumber]
  );

  const value = useMemo<LanguageContextProps>(
    () => ({
      locale,
      setLocale,
      t,
      formatNumber,
      formatDate,
      formatCurrency,
      isRTL: locale === ('ar' as any),
    }),
    [locale, setLocale, t, formatNumber, formatDate, formatCurrency]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextProps {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// ── Database & Curriculum Dynamic Content Translation Helpers ────────────────
export {
  translatePlanGoal as translateGoal,
  translatePlanTask as translateTask,
  translatePlanTasksArray as translateTasksArray,
  translatePlanGoalsArray as translateGoalsArray,
  translateSubject,
  translateGoalTitle,
  translateTaskTitle,
} from '../utils/offlinePlanTranslator';
