"use client";

import Link from "next/link";

export default function TermsPage() {
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
              Terms of Service
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
                  1. Acceptance of Terms
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  By accessing or using Aomi Labs&apos; services, including our widget, API, SDK, 
                  and related tools (collectively, the &quot;Services&quot;), you agree to be bound by these 
                  Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use our Services.
                </p>
                <p className="font-geist text-stone-300 leading-relaxed">
                  If you are using our Services on behalf of an organization, you represent that you have 
                  the authority to bind that organization to these Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  2. Description of Services
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Aomi provides blockchain AI infrastructure that enables developers to integrate 
                  AI-powered features into their applications. Our Services include:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Embeddable widget for blockchain interactions</li>
                  <li>API and SDK for programmatic access</li>
                  <li>AI-powered transaction processing and natural language interfaces</li>
                  <li>Developer documentation and tools</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  3. Account Registration
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  To access certain features, you must create an account. You agree to:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Promptly update your information if it changes</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  4. Acceptable Use
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  You agree not to use our Services to:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Engage in money laundering, fraud, or terrorist financing</li>
                  <li>Circumvent sanctions or trade restrictions</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malicious code or interfere with our systems</li>
                  <li>Attempt to gain unauthorized access to our Services</li>
                  <li>Use automated means to access our Services without permission</li>
                  <li>Engage in market manipulation or wash trading</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  5. API and SDK Usage
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Your use of our API and SDK is subject to:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Rate limits and usage quotas as specified in our documentation</li>
                  <li>Our API documentation and guidelines</li>
                  <li>Attribution requirements where applicable</li>
                  <li>Prohibition on reselling API access without authorization</li>
                </ul>
                <p className="font-geist text-stone-300 leading-relaxed">
                  We reserve the right to modify, suspend, or discontinue API features with reasonable notice.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  6. Fees and Payment
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Some Services may require payment. By using paid Services, you agree to:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Pay all applicable fees as specified</li>
                  <li>Provide accurate billing information</li>
                  <li>Authorize us to charge your payment method</li>
                </ul>
                <p className="font-geist text-stone-300 leading-relaxed">
                  Fees are non-refundable except as required by law or as otherwise stated.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  7. Blockchain Transactions
                </h2>
                <div className="p-4 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 mb-4">
                  <p className="font-geist text-amber-200 text-sm">
                    <strong>Important:</strong> Blockchain transactions are irreversible. You are solely 
                    responsible for verifying transaction details before confirming.
                  </p>
                </div>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  You acknowledge that:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>Blockchain transactions cannot be reversed once confirmed</li>
                  <li>Network fees (gas) are determined by the blockchain network, not by us</li>
                  <li>Transaction timing depends on network conditions</li>
                  <li>You are responsible for maintaining secure custody of your private keys</li>
                  <li>We do not custody your assets or have access to your private keys</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  8. AI-Generated Content
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Our Services use artificial intelligence to process natural language and generate responses. 
                  You acknowledge that:
                </p>
                <ul className="font-geist text-stone-300 list-disc pl-6 mb-4 space-y-2">
                  <li>AI outputs may not always be accurate or complete</li>
                  <li>You should verify AI-generated information before taking action</li>
                  <li>AI suggestions are not financial, legal, or investment advice</li>
                  <li>You are responsible for reviewing and approving all transactions</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  9. Intellectual Property
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  Our Services, including software, documentation, trademarks, and content, are owned by 
                  Aomi Labs and protected by intellectual property laws. We grant you a limited, 
                  non-exclusive, non-transferable license to use our Services in accordance with these Terms.
                </p>
                <p className="font-geist text-stone-300 leading-relaxed">
                  You retain ownership of your data and content. By using our Services, you grant us a 
                  license to process your data as necessary to provide the Services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  10. Disclaimer of Warranties
                </h2>
                <div className="p-4 rounded-xl bg-white/5 ring-1 ring-white/10 mb-4">
                  <p className="font-geist text-stone-300 text-sm uppercase tracking-wide">
                    OUR SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF 
                    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF 
                    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                </div>
                <p className="font-geist text-stone-300 leading-relaxed">
                  We do not guarantee that our Services will be uninterrupted, secure, or error-free.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  11. Limitation of Liability
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, AOMI LABS SHALL NOT BE LIABLE FOR ANY 
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT 
                  NOT LIMITED TO LOSS OF PROFITS, DATA, OR DIGITAL ASSETS, ARISING FROM YOUR USE OF OUR SERVICES.
                </p>
                <p className="font-geist text-stone-300 leading-relaxed">
                  Our total liability shall not exceed the greater of (a) the amount you paid us in the 
                  12 months preceding the claim, or (b) $100.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  12. Indemnification
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed">
                  You agree to indemnify and hold harmless Aomi Labs and its officers, directors, 
                  employees, and agents from any claims, damages, losses, or expenses arising from 
                  your use of our Services or violation of these Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  13. Termination
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed mb-4">
                  We may suspend or terminate your access to our Services at any time for any reason, 
                  including violation of these Terms. You may terminate your account at any time by 
                  contacting us.
                </p>
                <p className="font-geist text-stone-300 leading-relaxed">
                  Upon termination, your right to use our Services ceases immediately. Sections that 
                  by their nature should survive termination shall survive.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  14. Governing Law
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the 
                  State of Delaware, United States, without regard to conflict of law principles.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  15. Changes to Terms
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed">
                  We may modify these Terms at any time. We will notify you of material changes by 
                  posting the updated Terms and updating the &quot;Last updated&quot; date. Your continued use 
                  of our Services constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className="font-geist text-xl font-semibold text-white mb-4">
                  16. Contact Us
                </h2>
                <p className="font-geist text-stone-300 leading-relaxed">
                  If you have questions about these Terms, please contact us at:
                </p>
                <div className="mt-4 p-4 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <p className="font-geist text-stone-300">
                    <strong className="text-white">Aomi Labs</strong><br />
                    Email:{" "}
                    <a href="mailto:legal@aomi.dev" className="text-white underline hover:text-stone-200">
                      legal@aomi.dev
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
              href="/privacy"
              className="font-geist text-xs text-stone-500 transition-colors hover:text-stone-300"
            >
              Privacy Policy
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
