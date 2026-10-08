/**
 * LifePivot · Mobile Debug Logger
 * ─────────────────────────────────────────────────────────────────────────────
 * Central debug utility for the Expo / React Native app.
 * Works alongside Sentry (utils/sentry.ts) — Sentry handles crash reporting,
 * this module handles structured DEV console output + in-memory error log.
 *
 * Usage:
 *   import { debug, logApiError, measureAsync } from '@/utils/debug'
 *   debug.focus.log('Timer started', { duration: 25 })
 *   debug.api.error('Token reward failed', err, { path: '/api/tokens/reward' })
 */

import { Platform } from 'react-native'
import { captureError } from './sentry'

const IS_DEV = __DEV__

// ─── Namespaces ───────────────────────────────────────────────────────────────
export type DebugNamespace =
  | 'auth'
  | 'economy'
  | 'shop'
  | 'haptics'
  | 'soundscapes'
  | 'focus'
  | 'goals'
  | 'tasks'
  | 'ai'
  | 'api'
  | 'db'
  | 'payment'
  | 'onboarding'
  | 'profile'
  | 'i18n'
  | 'notifications'
  | 'perf'
  | 'general'

// ─── Error entry shape ────────────────────────────────────────────────────────
export interface ErrorEntry {
  namespace: DebugNamespace
  message: string
  error?: { message: string; stack?: string; code?: string }
  context?: Record<string, unknown>
  timestamp: string
  platform: string
}

// ─── In-memory error log ──────────────────────────────────────────────────────
const errorLog: ErrorEntry[] = []

export function getErrorLog(): ErrorEntry[] {
  return [...errorLog]
}

export function clearErrorLog(): void {
  errorLog.length = 0
}

// ─── Error formatter ──────────────────────────────────────────────────────────
function formatError(err: unknown): ErrorEntry['error'] {
  if (!err) return undefined
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: IS_DEV ? err.stack : undefined,
    }
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message ?? e.error ?? 'Unknown error'),
      code: e.code as string | undefined,
    }
  }
  return { message: String(err) }
}

// ─── Core logger factory ──────────────────────────────────────────────────────
function createLogger(namespace: DebugNamespace) {
  const tag = `[LP:${namespace.toUpperCase()}]`

  return {
    log: (msg: string, data?: unknown) => {
      if (!IS_DEV) return
      if (data !== undefined) {
        console.log(tag, msg, data)
      } else {
        console.log(tag, msg)
      }
    },

    warn: (msg: string, data?: unknown) => {
      if (!IS_DEV) return
      console.warn(tag, msg, ...(data !== undefined ? [data] : []))
    },

    error: (
      msg: string,
      err?: unknown,
      context?: Record<string, unknown>,
      sendToSentry = true,
    ) => {
      const errorInfo = formatError(err)
      const entry: ErrorEntry = {
        namespace,
        message: msg,
        error: errorInfo,
        context,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      }

      console.error(tag, 'ERROR', msg, errorInfo, context ?? '')
      errorLog.push(entry)

      // Forward to Sentry for non-dev builds (or any runtime error in dev that has a real Error)
      if (sendToSentry && err instanceof Error) {
        captureError(err, { namespace, message: msg, ...context })
      }
    },

    group: (label: string, fn: () => void) => {
      if (!IS_DEV) { fn(); return }
      console.group(`${tag} ${label}`)
      fn()
      console.groupEnd()
    },

    time: (label: string) => {
      if (!IS_DEV) return
      console.time(`${tag} ${label}`)
    },

    timeEnd: (label: string) => {
      if (!IS_DEV) return
      console.timeEnd(`${tag} ${label}`)
    },
  }
}

// ─── Debug namespace object ───────────────────────────────────────────────────
// import { debug } from '../utils/debug'
// debug.haptics.log('Tier 3 celebrate triggered')
export const debug = {
  auth:          createLogger('auth'),
  economy:       createLogger('economy'),
  shop:          createLogger('shop'),
  haptics:       createLogger('haptics'),
  soundscapes:   createLogger('soundscapes'),
  focus:         createLogger('focus'),
  goals:         createLogger('goals'),
  tasks:         createLogger('tasks'),
  ai:            createLogger('ai'),
  api:           createLogger('api'),
  db:            createLogger('db'),
  payment:       createLogger('payment'),
  onboarding:    createLogger('onboarding'),
  profile:       createLogger('profile'),
  i18n:          createLogger('i18n'),
  notifications: createLogger('notifications'),
  perf:          createLogger('perf'),
  general:       createLogger('general'),
}

// ─── Supabase error logger ────────────────────────────────────────────────────
/**
 * Log a Supabase query error with table context.
 * @example
 *   const { data, error } = await supabase.from('tasks').select(...)
 *   if (error) logSupabaseError('tasks', error)
 */
export function logSupabaseError(
  table: string,
  error: { message: string; code?: string; details?: string; hint?: string } | null,
  context?: Record<string, unknown>,
) {
  if (!error) return
  debug.db.error(
    `Supabase [${table}]: ${error.message}`,
    new Error(error.message),
    { table, code: error.code, details: error.details, hint: error.hint, ...context },
  )
}

// ─── API error logger ─────────────────────────────────────────────────────────
/**
 * Log a failed apiRequest() response with path + status context.
 * @example
 *   try { await apiRequest('/api/tokens/reward', ...) }
 *   catch (err) { logApiError('/api/tokens/reward', err) }
 */
export function logApiError(
  path: string,
  err: unknown,
  context?: Record<string, unknown>,
) {
  debug.api.error(`API Error [${path}]`, err instanceof Error ? err : new Error(String(err)), {
    path,
    ...context,
  })
}

// ─── Performance measurement ──────────────────────────────────────────────────
/**
 * Wrap an async function with performance timing (DEV only).
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!IS_DEV) return fn()
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    debug.perf.log(`${label} → ${ms}ms`)
    return result
  } catch (err) {
    const ms = Date.now() - start
    debug.perf.error(`${label} FAILED after ${ms}ms`, err instanceof Error ? err : undefined)
    throw err
  }
}

// ─── Assertion helper ─────────────────────────────────────────────────────────
/**
 * Soft assertion — logs a warning if condition is false (DEV only, never throws).
 * Useful for validating assumptions without crashing.
 */
export function assert(condition: boolean, msg: string, context?: Record<string, unknown>) {
  if (!IS_DEV) return
  if (!condition) {
    debug.general.warn(`⚠ ASSERTION FAILED: ${msg}`, context)
  }
}
