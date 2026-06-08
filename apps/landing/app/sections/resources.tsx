export function Resources() {
  return (
    <>
      <section
        id="faq"
        className="w-full border-t border-white/20 pt-20 pr-4 pb-10 pl-4"
        data-animate="up"
        data-delay="300"
      >
        <div className="mr-auto ml-auto max-w-4xl text-center">
          <div>
            <h2 className="mt-1 mb-15 font-serif text-3xl font-medium tracking-tight text-white md:text-4xl">
              FAQ
            </h2>
          </div>

          <div className="glass-panel mx-auto mt-10 divide-y divide-white/10 overflow-hidden rounded-[2rem] text-left">
            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  What&apos;s the difference between LangChain and purpose-built blockchain AI infrastructure?
                </span>
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
                  data-lucide="chevron-down"
                  className="lucide lucide-chevron-down h-4 w-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mx-5 mt-3">
                <p className="font-geist text-sm leading-relaxed text-white/70">
                  LangChain is a general-purpose AI framework that requires you to build blockchain integrations manually. 
                  Aomi is purpose-built for crypto: native multi-chain support, real-time transaction simulation, 
                  wallet integration, and a Rust backend optimized for financial operations. You skip months of custom development.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  How do you prevent AI hallucinations from causing bad transactions?
                </span>
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
                  data-lucide="chevron-down"
                  className="lucide lucide-chevron-down h-4 w-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mx-5 mt-3">
                <p className="font-geist text-sm leading-relaxed text-white/70">
                  Every AI-generated action is simulated in real-time before execution. You see exact token changes, 
                  gas costs, and contract calls before signing anything. Our simulation-first approach catches errors 
                  before they reach your wallet—AI suggests, you verify, then you decide.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  What infrastructure do I need to add AI features to a crypto product?
                </span>
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
                  data-lucide="chevron-down"
                  className="lucide lucide-chevron-down h-4 w-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mx-5 mt-3">
                <p className="font-geist text-sm leading-relaxed text-white/70">
                  You need four components: an LLM orchestration layer, blockchain execution tools, transaction simulation 
                  for safety, and frontend components. Aomi provides all of these as integrated blockchain AI infrastructure—a 
                  single platform that connects AI reasoning to multi-chain execution, with built-in simulation and React 
                  components for embedding.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  How do wallets and DeFi apps integrate AI without building from scratch?
                </span>
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
                  data-lucide="chevron-down"
                  className="lucide lucide-chevron-down h-4 w-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mx-5 mt-3">
                <p className="font-geist text-sm leading-relaxed text-white/70">
                  They use Aomi&apos;s SDK. Install our React component library, configure your API key, and embed the AI 
                  widget in your app. Aomi handles the backend—LLM orchestration, chain connections, transaction simulation, 
                  and scaling. Most teams go from zero to production in under a week.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="relative z-10 mb-10 flex w-full flex-col items-center justify-center pt-20 pb-20 text-center">
        <h2 className="mb-6 font-serif text-3xl tracking-tight text-white md:text-5xl">
          Ready to ship AI features?
        </h2>
        <p className="font-geist mb-8 max-w-lg font-light text-stone-100">
          Start building with Aomi&apos;s blockchain AI infrastructure. Free to try.
        </p>
        <div className="flex items-center gap-x-4 gap-y-4">
          <a
            href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0u-urImwR9Fl5L0v4z8ejVKimYhQUQf8ISYfD9AzR_Fd5ULOoMHSx1o60QuuW3GH9FYFDN4u0S"
            target="_blank"
            rel="noreferrer"
            className="landing-button-primary group [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)]"
          >
            Book a Call
          </a>
        </div>
      </section>
      <footer className="mt-auto w-full border-t border-white/5 bg-[#9d78a8] pt-10">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="mb-12 flex w-full flex-col items-start justify-between md:flex-row md:gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-white">
                <img
                  src="/assets/images/bubble.svg"
                  alt="Aomi"
                  className="h-5 w-5 invert"
                />
                <span className="font-geist font-semibold tracking-tight text-stone-100">
                  Aomi
                </span>
              </div>
              <p className="font-geist max-w-xs text-xs leading-relaxed text-neutral-100">
                The Best Blockchain Harness for Agentic Web. Top-security,
                multi-chain. Land in seconds.
              </p>
            </div>
            <div className="flex gap-x-16 gap-y-16">
              <div className="flex flex-col gap-3 gap-x-3 gap-y-3 text-stone-100">
                <span className="font-geist text-xs font-semibold tracking-wider text-stone-100 uppercase">
                  Product
                </span>
                <a
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-100"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-100"
                >
                  Integrations
                </a>
                <a
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-100"
                >
                  Changelog
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-geist text-xs font-semibold tracking-wider text-stone-100 uppercase">
                  Company
                </span>
                <a
                  href="#"
                  className="font-geist text-xs text-neutral-400 text-stone-100 transition-colors hover:text-stone-100"
                >
                  About
                </a>
                <a
                  href="https://substack.com/@aomilabs"
                  target="_blank"
                  rel="noreferrer"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-400"
                >
                  Blog
                </a>
                <a
                  href="https://www.linkedin.com/company/aomi-labs/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-400"
                >
                  Careers
                </a>
                <a
                  href="/contact"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-400"
                >
                  Contact
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-geist text-xs font-semibold tracking-wider text-stone-100 uppercase">
                  Legal
                </span>
                <a
                  href="/privacy"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-white"
                >
                  Privacy
                </a>
                <a
                  href="/terms"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-white"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between border-t border-white/5 py-6">
            <span className="font-geist text-[10px] text-neutral-200">
              (c) 2026 Aomi Labs. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/aomi_labs"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-200 transition-colors hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
              </a>
              <a
                href="https://discord.gg/YK2sqKDBYh"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-200 transition-colors hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"></path>
                </svg>
              </a>
              <a
                href="https://github.com/aomi-labs"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-200 transition-colors hover:text-white"
              >
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
                  data-lucide="github"
                  className="lucide lucide-github h-4 w-4"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
