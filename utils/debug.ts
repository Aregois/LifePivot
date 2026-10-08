/**
 * LifePivot · Web Debug Logger
 * ─────────────────────────────────────────────────────────────────────────────
 * Central debug utility for the Next.js web app.
 * - Namespaced, coloured console output (DEV only)
 * - Structured error capture with context
 * - Network request logging wrapper
 * - Supabase error formatter
 * - API route error helper
 *
 * Usage:
 *   import { debug, captureError, logSupabaseError } from '@/utils/debug'
 *   debug.log('shop', 'Purchase attempt', { itemId, cost })
 *   debug.error('economy', 'Balance update failed', err)
 *   logSupabaseError('profiles', error)
 */

const IS_DEV = process.env.NODE_ENV === 'development'

// ─── Namespaces ───────────────────────────────────────────────────────────────
// Every major area of the app has its own namespace for easy filtering in DevTools.
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
  | 'pwa'
  | 'perf'
  | 'general'

// ─── Namespace colours (DevTools) ─────────────────────────────────────────────
const NAMESPACE_COLORS: Record<DebugNamespace, string> = {
  auth:        '#A78BFA', // violet
  economy:     '#34D399', // emerald
  shop:        '#F59E0B', // amber
  haptics:     '#60A5FA', // blue
  soundscapes: '#818CF8', // indigo
  focus:       '#F472B6', // pink
  goals:       '#10B981', // green
  tasks:       '#6EE7B7', // teal
  ai:          '#C084FC', // purple
  api:         '#FB923C', // orange
  db:          '#FCA5A5', // red
  payment:     '#FCD34D', // yellow
  onboarding:  '#67E8F9', // cyan
  profile:     '#A3E635', // lime
  i18n:        '#94A3B8', // slate
  pwa:         '#D4D4D4', // neutral
  perf:        '#F9A8D4', // rose
  general:     '#E2E8F0', // white
}

// ─── Core logger ─────────────────────────────────────────────────────────────
function createLogger(namespace: DebugNamespace) {
  const color = NAMESPACE_COLORS[namespace]
  const prefix = `[LP:${namespace.toUpperCase()}]`

  return {
    log: (msg: string, data?: unknown) => {
      if (!IS_DEV) return
      if (data !== undefined) {
        console.log(`%c${prefix}`, `color:${color};font-weight:bold`, msg, data)
      } else {
        console.log(`%c${prefix}`, `color:${color};font-weight:bold`, msg)
      }
    },
    warn: (msg: string, data?: unknown) => {
      if (!IS_DEV) return
      console.warn(`%c${prefix}`, `color:#FCD34D;font-weight:bold`, msg, ...(data !== undefined ? [data] : []))
    },
    error: (msg: string, err?: unknown, context?: Record<string, unknown>) => {
      // Always log errors — even in production (without sensitive data)
      const errorInfo = formatError(err)
      const entry: ErrorEntry = {
        namespace,
        message: msg,
        error: errorInfo,
        context,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.pathname : 'server',
      }
      console.error(
        `%c${prefix} ERROR`,
        `color:#EF4444;font-weight:bold`,
        msg,
        errorInfo,
        context ?? '',
      )
      // Push to in-memory error log for the session
      errorLog.push(entry)
    },
    group: (label: string, fn: () => void) => {
      if (!IS_DEV) { fn(); return }
      console.group(`%c${prefix} ${label}`, `color:${color};font-weight:bold`)
      fn()
      console.groupEnd()
    },
    time: (label: string) => {
      if (!IS_DEV) return
      console.time(`${prefix} ${label}`)
    },
    timeEnd: (label: string) => {
      if (!IS_DEV) return
      console.timeEnd(`${prefix} ${label}`)
    },
  }
}

// ─── Debug namespace object ───────────────────────────────────────────────────
// import { debug } from '@/utils/debug'
// debug.auth.log('Session restored', { userId })
export const debug = {
  auth:        createLogger('auth'),
  economy:     createLogger('economy'),
  shop:        createLogger('shop'),
  haptics:     createLogger('haptics'),
  soundscapes: createLogger('soundscapes'),
  focus:       createLogger('focus'),
  goals:       createLogger('goals'),
  tasks:       createLogger('tasks'),
  ai:          createLogger('ai'),
  api:         createLogger('api'),
  db:          createLogger('db'),
  payment:     createLogger('payment'),
  onboarding:  createLogger('onboarding'),
  profile:     createLogger('profile'),
  i18n:        createLogger('i18n'),
  pwa:         createLogger('pwa'),
  perf:        createLogger('perf'),
  general:     createLogger('general'),
}

// ─── Error entry shape ────────────────────────────────────────────────────────
export interface ErrorEntry {
  namespace: DebugNamespace
  message: string
  error?: { message: string; stack?: string; code?: string }
  context?: Record<string, unknown>
  timestamp: string
  url: string
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
    return { message: err.message, stack: IS_DEV ? err.stack : undefined }
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

// ─── Supabase error logger ────────────────────────────────────────────────────
/**
 * Log a Supabase query error with table context.
 * @example
 *   const { data, error } = await supabase.from('profiles').select(...)
 *   if (error) logSupabaseError('profiles', error)
 */
export function logSupabaseError(
  table: string,
  error: { message: string; code?: string; details?: string; hint?: string } | null,
  context?: Record<string, unknown>,
) {
  if (!error) return
  debug.db.error(`Supabase [${table}]: ${error.message}`, error, {
    table,
    code: error.code,
    details: error.details,
    hint: error.hint,
    ...context,
  })
}

// ─── API route error helper ───────────────────────────────────────────────────
/**
 * Standard error response formatter for Next.js API routes.
 * Always returns a JSON Response with the correct status code.
 *
 * @example  (inside /app/api/tokens/reward/route.ts)
 *   return apiError('Cooldown active', 429, { cooldownRemaining: 3600 })
 */
export function apiError(
  message: string,
  status: number = 500,
  extra?: Record<string, unknown>,
): Response {
  const body: Record<string, unknown> = { error: message, ...extra }
  if (IS_DEV) {
    debug.api.error(`API ${status}: ${message}`, undefined, extra)
  }
  return Response.json(body, { status })
}

// ─── Performance measurement ──────────────────────────────────────────────────
/**
 * Wrap an async function with performance timing.
 * Result is logged only in DEV.
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!IS_DEV) return fn()
  const start = performance.now()
  try {
    const result = await fn()
    const ms = (performance.now() - start).toFixed(1)
    debug.perf.log(`${label} → ${ms}ms`)
    return result
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1)
    debug.perf.error(`${label} FAILED after ${ms}ms`, err)
    throw err
  }
}

// ─── Network fetch wrapper ────────────────────────────────────────────────────
/**
 * Drop-in replacement for fetch() with automatic debug logging.
 * Logs request + response details in DEV, errors always.
 */
export async function debugFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = input instanceof URL ? input.href : String(input)
  const method = init?.method ?? 'GET'

  if (IS_DEV) {
    debug.api.log(`→ ${method} ${url}`, init?.body ? JSON.parse(String(init.body)) : undefined)
  }

  const start = performance.now()
  try {
    const response = await fetch(input, init)
    const ms = (performance.now() - start).toFixed(1)
    if (IS_DEV) {
      const level = response.ok ? 'log' : 'error'
      debug.api[level](
        `← ${response.status} ${method} ${url} (${ms}ms)`,
        response.ok ? undefined : { status: response.status },
      )
    }
    return response
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1)
    debug.api.error(`✕ NETWORK ${method} ${url} (${ms}ms)`, err)
    throw err
  }
}
