import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — LifePivot',
  description: 'LifePivot Terms of Service and End User License Agreement (EULA).',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 px-6 py-16 md:px-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border-b border-white/10 pb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-4 hover:underline">
            ← Return to LifePivot
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Terms of Service</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Last Updated: October 8, 2026</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Agreement to Terms</h2>
          <p>
            By creating an account or accessing LifePivot on iOS, Android, or Web, you agree to these Terms of Service and the standard Apple End User License Agreement (EULA). If you do not agree to these terms, do not access or use the application.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Subscriptions &amp; Digital Currency</h2>
          <p>
            LifePivot offers a premium &quot;Power Tier&quot; subscription granting unlimited curriculum generation, customization cosmetics, and AI Socratic dialogues. Subscriptions renew automatically unless cancelled at least 24 hours prior to the conclusion of the active billing period. You may manage or cancel your subscription at any time in your Apple App Store Account Settings (for iOS) or the Billing Portal (for Web).
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Acceptable Use &amp; Community Standards</h2>
          <p>
            Users participating in Tutor Cohorts and Public Marketplace Curriculums must not publish defamatory, abusive, infringing, or harmful content. LifePivot reserves the right to terminate accounts that violate academic integrity or acceptable community guidelines.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Disclaimer of Warranties</h2>
          <p>
            LifePivot is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. AI-generated curriculums and Socratic study hints are supplemental learning tools and do not substitute for certified academic qualifications or institutional course grading.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">5. Governing Law &amp; Contact</h2>
          <p>
            These terms are governed by the laws of the jurisdiction of operation. For legal questions or support, contact <span className="text-cyan-400">support@lifepivot.app</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
