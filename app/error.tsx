'use client'

/**
 * LifePivot · Web Global Error Boundary
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop this into app/error.tsx (Next.js 13+ App Router convention).
 * It catches any unhandled render error in the web app and shows a
 * polished, branded recovery screen instead of the raw Next.js error overlay.
 *
 * Usage: place this file at  app/error.tsx  (already the correct path if you
 * put it there, Next.js auto-registers it as the error boundary).
 */

import { useEffect } from 'react'
import { debug } from '@/utils/debug'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log to our debug system. In production this will still record to the
    // in-memory error log and output to the console for any open DevTools.
    debug.general.error('Unhandled render error', error, {
      digest: error.digest,
      url: window.location.pathname,
    })
  }, [error])

  return (
    <div className="min-h-screen bg-[#0E111F] flex flex-col items-center justify-center p-6 text-white">
      {/* ── Bug icon ── */}
      <div className="text-6xl mb-4 animate-bounce select-none">🪲</div>

      {/* ── Title ── */}
      <h1 className="text-2xl font-bold text-[#00F0FF] mb-2 text-center">
        Something went wrong
      </h1>

      {/* ── Subtitle ── */}
      <p className="text-[#94A3B8] text-sm text-center max-w-xs mb-6">
        An unexpected error occurred. Your data is safe.
      </p>

      {/* ── Error details (DEV only) ── */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-[#1A1F35] border border-red-500/30 rounded-xl p-4 max-w-lg w-full mb-6 text-left">
          <p className="text-red-400 text-xs font-mono font-bold mb-1">
            {error.name}: {error.message}
          </p>
          {error.digest && (
            <p className="text-[#94A3B8] text-xs font-mono">
              digest: {error.digest}
            </p>
          )}
          {error.stack && (
            <pre className="text-[#64748B] text-xs font-mono mt-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {error.stack}
            </pre>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 bg-[#00F0FF] text-[#0E111F] font-bold rounded-full text-sm
                     hover:bg-[#00F0FF]/80 transition-colors active:scale-95"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.assign('/')}
          className="px-5 py-2 bg-white/10 text-white font-medium rounded-full text-sm
                     hover:bg-white/20 transition-colors active:scale-95"
        >
          Go home
        </button>
      </div>

      {/* ── Bug report hint ── */}
      <p className="mt-8 text-xs text-[#475569] text-center">
        If this keeps happening, copy the error above and send a Bug Report.
      </p>
    </div>
  )
}
