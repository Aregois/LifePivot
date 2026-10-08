'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Flame, BookOpen, Compass, ArrowRight, Zap, CheckCircle2 } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* ── Background Ambient Glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-cyan-500/30">
            <Image
              src="/logo.png"
              alt="LifePivot"
              fill
              className="object-cover"
              sizes="36px"
              priority
            />
          </div>
          <span className="text-base font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            LifePivot
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-12 pb-24 text-center">
        {/* Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-cyan-300">
            Native Plus Cognitive Learning Ecosystem
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[1.08] max-w-4xl mx-auto"
        >
          Master Complex Skills.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">
            Never Break A Streak.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          Phone-first AI curriculum generation paired with Richard Feynman Socratic dialogue,
          Void Day timeline protection, and a 3-Tier Pivot Reschedule engine.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 transition-all active:scale-95"
          >
            <span>Start Learning Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl transition-all"
          >
            <span>Open Existing Account</span>
          </Link>
        </motion.div>

        {/* ── Interactive Phone Mockup Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-sm mx-auto p-4 rounded-[36px] bg-gradient-to-b from-white/10 to-white/0 border border-white/10 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl"
        >
          <div className="bg-[#0B0D1B] rounded-[28px] p-5 text-left border border-white/5 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-black text-amber-400">14 DAY STREAK</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>LEVEL 4 SCHOLAR</span>
              </div>
            </div>

            {/* Active task pill */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider">
                  TODAY&apos;S FOCUS • P5 THEORY
                </span>
                <span className="text-[10px] text-slate-500">45 MIN</span>
              </div>
              <p className="text-sm font-bold text-white">
                Distributed Consensus &amp; Raft Leader Election
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>3 of 4 subtasks verified</span>
              </div>
            </div>

            {/* Socratic Mentor Teaser */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-purple-200">Richard Feynman Mentor</p>
                <p className="text-[10px] text-slate-400">&quot;Why does a split brain happen?&quot;</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </motion.div>

        {/* ── Feature Highlights Grid ── */}
        <section className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-wider text-white">
              AI Curriculum Architect
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transform any complex subject into prioritized daily modules with actionable subtasks,
              first-principles theory, and hands-on milestones.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-wider text-white">
              Socratic Micro-Drills
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Richard Feynman, Socrates, and Stoic personas question your mental models,
              identifying cognitive gaps with instant feedback loops.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-wider text-white">
              3-Tier Pivot Engine
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Life happens. If you fall behind, our algorithmic slide safely reschedules
              overdue tasks into Void Days without penalizing your streak or progress.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mt-32 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© 2026 LifePivot. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-cyan-400 transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:support@lifepivot.app" className="hover:text-cyan-400 transition-colors">
              Support
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
