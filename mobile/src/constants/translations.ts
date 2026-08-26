// Lightweight backward compatibility bridge
export type { Locale, SupportedLocale, TxKeyPath } from '../types/i18n';
export {
  LANGUAGE_NAMES,
  translateGoal,
  translateTask,
  translateTasksArray,
  translateGoalsArray,
} from '../context/LanguageContext';
