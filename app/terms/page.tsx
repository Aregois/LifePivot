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
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Effective &amp; Last Updated: April 19, 2026</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Agreement to Terms</h2>
          <p>
            By creating an account or accessing LifePivot on Web, iOS, or Android, you agree to these Terms of Service and, where applicable, the standard Apple End User License Agreement (EULA). If you do not agree to these terms, do not access or use the application.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Subscriptions, Billing &amp; Virtual Tokens</h2>
          <p>
            LifePivot offers a premium &quot;Solo Power&quot; subscription (billed monthly or annually via Stripe on Web or Apple StoreKit on iOS) granting unlimited curriculum generation, document uploads, customization cosmetics, and AI Socratic personas. Subscriptions renew automatically unless cancelled prior to the conclusion of the active billing period. You may manage or cancel your web subscription at any time via <em>Profile &gt; Settings &gt; Manage Subscription</em> (Stripe Billing Portal).
          </p>
          <p>
            Virtual Focus Tokens and Gems acquired through in-app achievements or purchased via Token Packs have no monetary value outside LifePivot, cannot be redeemed for cash, and are non-transferable. Except as required by applicable consumer law, consumable Token Pack purchases are final.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Acceptable Use &amp; Community Standards</h2>
          <p>
            Users creating study plans or utilizing AI Socratic dialogues must not submit defamatory, abusive, infringing, or harmful content, nor attempt to manipulate virtual currency balances or abuse AI generation endpoints. LifePivot reserves the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Disclaimer of Warranties</h2>
          <p>
            LifePivot is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. AI-generated curriculums and Socratic study hints are supplemental learning tools and do not substitute for certified academic qualifications, medical advice, or institutional course grading.
          </p>
        </section>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">5. Governing Law &amp; Contact</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable federal and international digital commerce laws, without regard to conflict of law principles. For billing, legal inquiries, or support, contact <span className="text-cyan-400">support@lifepivot.app</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
