"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1c1917] text-stone-200 antialiased selection:bg-stone-500/30 selection:text-white">
      {/* Background */}
      <div
        className="pointer-events-none fixed top-0 z-0 h-screen w-full bg-cover bg-center"
        style={{ backgroundImage: 'url("/assets/hero-bg.jpg")' }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(8px)",
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/40" />

      {/* Navigation */}
      <nav className="fixed top-6 right-0 left-0 z-50 flex items-center justify-center gap-x-4 gap-y-4 pr-4 pl-4">
        <Link
          href="/"
          className="flex items-center gap-x-2 gap-y-2 rounded-full bg-black/20 pt-2.5 pr-5 pb-2.5 pl-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px] transition-all duration-300 hover:bg-black/30"
        >
          <img
            src="/assets/images/bubble.svg"
            alt="Aomi"
            className="h-6 w-6 drop-shadow-sm invert"
          />
          <span className="font-geist text-sm font-semibold tracking-tight text-white drop-shadow-sm">
            Aomi
          </span>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center px-4 pt-32 pb-16">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-serif text-4xl font-medium tracking-tight text-white md:text-5xl">
              Privacy Policy
            </h1>
            <p className="font-geist text-stone-400">
              Last updated: March 23, 2026
            </p>
          </div>

          {/* Content */}
          <div className="glass-panel overflow-hidden rounded-[2rem] bg-black/20 p-8 ring-1 ring-white/10 backdrop-blur-xl md:p-12">
            <div className="prose prose-invert prose-stone max-w-none">
              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  1. Introduction
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Aomi Labs (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                  when you use our blockchain AI infrastructure services, including our widget, API, and related tools.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  2. Information We Collect
                </h2>
                <h3 className="font-geist text-lg font-medium text-white/90 mb-2">
                  2.1 Information You Provide
                </h3>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Account information (email address, organization name)</li>
                  <li>API keys and integration credentials</li>
                  <li>Communications with our support team</li>
                  <li>Feedback and survey responses</li>
                </ul>

                <h3 className="font-geist text-lg font-medium text-white/90 mb-2">
                  2.2 Automatically Collected Information
                </h3>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Usage data and analytics (API calls, feature usage)</li>
                  <li>Device and browser information</li>
                  <li>IP addresses and geolocation data</li>
                  <li>Log data and error reports</li>
                </ul>

                <h3 className="font-geist text-lg font-medium text-white/90 mb-2">
                  2.3 Blockchain Data
                </h3>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We process publicly available blockchain data to provide our services. 
                  Wallet addresses and transaction data are used solely to execute your requested operations 
                  and are not stored longer than necessary for service delivery.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  3. How We Use Your Information
                </h2>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>To provide, maintain, and improve our services</li>
                  <li>To process transactions and send related notifications</li>
                  <li>To respond to your inquiries and support requests</li>
                  <li>To detect, prevent, and address technical issues and fraud</li>
                  <li>To comply with legal obligations</li>
                  <li>To send service updates and marketing communications (with consent)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  4. Data Sharing and Disclosure
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your data with:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li><strong className="text-white/90">Service Providers:</strong> Third parties who assist in operating our services (hosting, analytics, support)</li>
                  <li><strong className="text-white/90">Blockchain Networks:</strong> Transaction data is broadcast to public blockchain networks as required</li>
                  <li><strong className="text-white/90">Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong className="text-white/90">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  5. Data Security
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We implement industry-standard security measures including encryption, access controls, 
                  and secure infrastructure. However, no method of transmission over the Internet is 100% secure, 
                  and we cannot guarantee absolute security.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  6. Data Retention
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We retain your information for as long as necessary to provide our services and fulfill 
                  the purposes outlined in this policy. Account data is retained until you request deletion. 
                  Some data may be retained longer for legal or legitimate business purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  7. Your Rights
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Depending on your jurisdiction, you may have the right to:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p className="font-geist text-stone-300 leading-relaxed">
                  To exercise these rights, contact us at{" "}
                  <a href="mailto:privacy@aomi.dev" className="text-white underline hover:text-stone-200">
                    privacy@aomi.dev
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  8. International Transfers
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Your information may be transferred to and processed in countries other than your own. 
                  We ensure appropriate safeguards are in place for such transfers in accordance with applicable law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  9. Children&apos;s Privacy
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Our services are not directed to individuals under 18. We do not knowingly collect 
                  personal information from children. If we become aware that we have collected data 
                  from a child, we will take steps to delete it.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  10. Changes to This Policy
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of material changes 
                  by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  11. Contact Us
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed">
                  If you have questions about this Privacy Policy, please contact us at:
                </p>
                <div className="mt-4 p-4 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <p className="font-geist text-stone-300">
                    <strong className="text-white">Aomi Labs</strong><br />
                    Email:{" "}
                    <a href="mailto:privacy@aomi.dev" className="text-white underline hover:text-stone-200">
                      privacy@aomi.dev
                    </a>
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="font-geist text-sm text-stone-400 transition-colors hover:text-white"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-black/20 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <p className="font-geist text-xs text-stone-500">
            © {new Date().getFullYear()} Aomi Labs. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/terms"
              className="font-geist text-xs text-stone-500 transition-colors hover:text-stone-300"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="font-geist text-xs text-stone-500 transition-colors hover:text-stone-300"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
