import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — LifePivot',
  description: 'LifePivot Privacy Policy and data protection disclosures.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 px-6 py-16 md:px-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border-b border-white/10 pb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-4 hover:underline">
            ← Return to LifePivot
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Privacy Policy</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Last Updated: October 8, 2026</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Information We Collect</h2>
          <p>
            LifePivot (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects information necessary to personalize study curriculums, track daily habit streaks, and maintain account security:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
            <li><strong className="text-slate-200">Account Credentials:</strong> Email address and profile name provided upon sign up or Apple Authentication.</li>
            <li><strong className="text-slate-200">Study Curriculum &amp; Task Data:</strong> Learning goals, study session durations, completed subtasks, and user-authored notes.</li>
            <li><strong className="text-slate-200">Device &amp; Telemetry:</strong> Anonymized crash logs and platform analytics (via Sentry) to resolve software defects.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Use of AI Technologies</h2>
          <p>
            LifePivot integrates Google Generative AI (Gemini) to generate study curriculums, provide Socratic hints, and construct practice drills. Prompts submitted for curriculum generation do not contain personal identifiers and are strictly used for in-session curriculum generation.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. In-App Purchases &amp; Payment Processing</h2>
          <p>
            Payments made via the web platform are securely processed by Stripe. In-app purchases made via iOS are processed exclusively by Apple Media Services (StoreKit). LifePivot does not store or process payment card numbers or banking credentials.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. In-App Account Deletion &amp; Data Rights</h2>
          <p>
            In compliance with Apple App Store Review Guideline 5.1.1(v) and GDPR/CCPA regulations, you may permanently erase your account and all associated data at any time directly inside the app under <em>Profile &gt; Settings &gt; Danger Zone &gt; Delete Account</em>, or by submitting a written request to <span className="text-cyan-400">privacy@lifepivot.app</span>. All cloud records, progress history, and authentication tokens are immediately purged.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">5. Contact Information</h2>
          <p>
            For questions or data inquiries regarding this policy, contact us at <span className="text-cyan-400">privacy@lifepivot.app</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
