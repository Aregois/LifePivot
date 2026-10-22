import Link from 'next/link'
import { Compass, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-electric-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-neon-violet/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#0E1222]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="h-16 w-16 rounded-2xl bg-electric-blue/10 border border-electric-blue/25 flex items-center justify-center mx-auto mb-5 text-electric-blue shadow-[0_0_25px_rgba(0,240,255,0.2)]">
          <Compass className="h-8 w-8" />
        </div>
        <p className="text-[10px] font-black font-mono uppercase tracking-[0.25em] text-electric-blue mb-2">
          Error 404 • Coordinates Not Found
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase mb-3">
          Off the Learning Path
        </h1>
        <p className="text-xs text-gray-400 leading-relaxed mb-7">
          The page or study plan you are looking for doesn&apos;t exist or has been moved to another trajectory.
        </p>
        <Link
          href="/plan"
          className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-electric-blue text-black font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,240,255,0.25)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
