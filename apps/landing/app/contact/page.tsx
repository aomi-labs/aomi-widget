"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1c1917] text-stone-200 antialiased selection:bg-stone-500/30 selection:text-white">
      {/* Background */}
      <div
        className="pointer-events-none fixed top-0 z-0 h-screen w-full bg-cover bg-center"
        style={{ backgroundImage: 'url("/assets/hero-bg.jpg")' }}
      />
      {/* Glassmorphic overlay - static blur for contact page */}
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
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-4 pt-24 pb-16">
        <div className="mx-auto w-full max-w-2xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-serif text-4xl font-medium tracking-tight text-white md:text-5xl">
              Get in Touch
            </h1>
            <p className="font-geist text-lg text-white">
              Have questions about Aomi? We&apos;d love to hear from you.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="glass-panel mx-auto overflow-hidden rounded-[2rem]">
            <div className="grid gap-px bg-white/10 md:grid-cols-2">
              {/* Email Card */}
              <a
                href="mailto:contact@aomi.dev"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-white"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    Email Us
                  </h3>
                  <p className="font-geist text-sm text-stone-400">
                    contact@aomi.dev
                  </p>
                </div>
              </a>

              {/* Business Email Card */}
              <a
                href="mailto:business@foameo.ai"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-white"
                  >
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    Business Inquiries
                  </h3>
                  <p className="font-geist text-sm text-stone-400">
                    business@foameo.ai
                  </p>
                </div>
              </a>

              {/* Twitter/X Card */}
              <a
                href="https://twitter.com/aomi_labs"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 text-white"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    Twitter / X
                  </h3>
                  <p className="font-geist text-sm text-stone-400">@aomi_labs</p>
                </div>
              </a>

              {/* Discord Card */}
              <a
                href="https://discord.gg/Ngz4KXgn"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-white"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    Discord
                  </h3>
                  <p className="font-geist text-sm text-stone-400">
                    Join our community
                  </p>
                </div>
              </a>

              {/* Telegram Card */}
              <a
                href="https://t.me/aomi_sendit_bot"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-white"
                  >
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    Telegram
                  </h3>
                  <p className="font-geist text-sm text-stone-400">@aomi_sendit_bot</p>
                </div>
              </a>

              {/* GitHub Card */}
              <a
                href="https://github.com/aomi-labs"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center gap-4 bg-black/20 p-8 text-center transition-all hover:bg-black/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-white"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-geist mb-1 text-lg font-semibold text-white">
                    GitHub
                  </h3>
                  <p className="font-geist text-sm text-stone-400">aomi-labs</p>
                </div>
              </a>
            </div>
          </div>

          {/* Book a Call CTA */}
          <div className="mt-12 text-center">
            <a
              href="https://calendly.com/aomi-labs/30min"
              target="_blank"
              rel="noreferrer"
              className="landing-button-primary group inline-flex items-center gap-2"
            >
              Book a Call
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-black/20 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <p className="font-geist text-xs text-stone-500">
            © {new Date().getFullYear()} Aomi Labs. All rights reserved.
          </p>
          <Link
            href="/"
            className="font-geist text-xs text-stone-500 transition-colors hover:text-stone-300"
          >
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
