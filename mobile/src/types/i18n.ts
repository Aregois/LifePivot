// Strict type definitions for LifePivot i18n
import type enJson from '../locales/en.json';

export type Locale = 'en' | 'es' | 'ru' | 'fr' | 'hy' | 'ja' | 'zh';
export type SupportedLocale = Locale;

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
  : '';

export type RawTxKeyPath = NestedKeyOf<typeof enJson>;

// Strip plural suffixes (_one, _few, _many, _other, _zero) so t('tokens', { count }) is valid
export type StripPluralSuffix<T extends string> = T extends `${infer Base}_${'one' | 'few' | 'many' | 'other' | 'zero'}`
  ? Base
  : T;

export type TxKeyPath = StripPluralSuffix<RawTxKeyPath> | RawTxKeyPath;

export interface TranslationParams extends Record<string, string | number | undefined> {
  count?: number;
}

export interface LanguageContextProps {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: (path: TxKeyPath | string, params?: TranslationParams) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  isRTL: boolean;
}
