'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-6 antialiased">
        <div className="max-w-md w-full bg-[#0E1222]/95 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-5 text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.25em] text-red-400 mb-2">
            System Interruption
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase mb-3">
            Something Went Wrong
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed mb-7">
            {error?.message || 'An unexpected error interrupted your session. Your progress is safely stored in the cloud.'}
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
