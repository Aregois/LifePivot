/**
 * LifePivot Web Translation Module
 * 
 * Unified translation dictionaries & helpers across all 7 supported locales.
 */

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import ru from '@/locales/ru.json';
import fr from '@/locales/fr.json';
import hy from '@/locales/hy.json';
import ja from '@/locales/ja.json';
import zh from '@/locales/zh.json';

export type Locale = 'en' | 'es' | 'ru' | 'fr' | 'hy' | 'ja' | 'zh';

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
  fr: 'Français',
  hy: 'Հայերեն',
  ja: '日本語',
  zh: '中文',
};

export const TRANSLATIONS: Record<Locale, Record<string, any>> = {
  en,
  es,
  ru,
  fr,
  hy,
  ja,
  zh,
};

// ── Plural Categorization ───────────────────────────────────────────────────

export function selectPluralRule(count: number, locale: string): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  const n = Math.abs(count);

  if (locale === 'ru') {
    const rem10 = n % 10;
    const rem100 = n % 100;
    if (rem10 === 1 && rem100 !== 11) return 'one';
    if (rem10 >= 2 && rem10 <= 4 && (rem100 < 12 || rem100 > 14)) return 'few';
    if (rem10 === 0 || (rem10 >= 5 && rem10 <= 9) || (rem100 >= 11 && rem100 <= 14)) return 'many';
    return 'other';
  }

  if (locale === 'fr') {
    if (n === 0 || n === 1) return 'one';
    return 'other';
  }

  if (locale === 'ja' || locale === 'zh') {
    return 'other';
  }

  // English, Spanish, Armenian
  if (n === 1) return 'one';
  return 'other';
}

// ── Parameter Interpolation ─────────────────────────────────────────────────

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params || Object.keys(params).length === 0) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// ── Re-export Offline Curriculum Translators ─────────────────────────────────

export {
  translatePlanGoal as translateGoal,
  translatePlanTask as translateTask,
  translatePlanTasksArray as translateTasksArray,
  translatePlanGoalsArray as translateGoalsArray,
  translateSubject,
  translateGoalTitle,
  translateTaskTitle,
} from './offlinePlanTranslator';
