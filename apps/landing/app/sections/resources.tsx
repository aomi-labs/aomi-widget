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
                  How is Aomi different from generic AI frameworks?
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
                  Unlike generic wrappers, Aomi is protocol-native. We use deep
                  execution layers per blockchain architecture to enable true
                  interoperability, rather than relying on fragile surface-level
                  APIs. Our agentic runtime integrates with blockchain clients
                  in one single process.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  How do you prevent LLM hallucinations in financial
                  transactions?
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
                  We utilize a security-first design with real-time simulation.
                  Every AI-generated intent is simulated against the blockchain
                  state to verify correctness and type safety before execution.
                  We employ LLM-as-a-judge in addition to deterministic hard
                  checks to filter away malformed transactions.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  Is Aomi purely for chatbots?
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
                  No. While we power conversational interfaces, Aomi is the
                  infrastructure layer for all agentic software. This includes
                  background automation for smart wallets, yield routing, and
                  institutional data analysis. Aomi is can be a high-performance
                  alternative of Langchain.
                </p>
              </div>
            </details>

            <details className="group mx-5 p-5">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between text-left">
                <span className="font-geist text-sm font-normal tracking-tight text-white md:text-base">
                  Which networks do you support?
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
                  Aomi supports generic EVM transaction executions with native
                  tool sets. We enable multi-chain operations with configurable
                  RPC endpoints for networks like Ethereum, Base, and Polygon.
                  We plan to support non-EVM chains such as Solana on our
                  roadmap.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="relative z-10 mb-10 flex w-full flex-col items-center justify-center pt-20 pb-20 text-center">
        <h2 className="mb-6 font-serif text-3xl tracking-tight text-white md:text-5xl">
          Ready to automate?
        </h2>
        <p className="font-geist mb-8 max-w-lg font-light text-stone-100">
          Join thousands of traders and developers building the next generation
          of on-chain agents.
        </p>
        <div className="flex items-center gap-x-4 gap-y-4">
          <a
            href="https://calendly.com/cecilia-foameo/30min"
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
                The interface for the agentic web. Automating complex blockchain
                interactions with simple natural language.
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
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-white"
                >
                  Pricing
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
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-400"
                >
                  Blog
                </a>
                <a
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-stone-400"
                >
                  Careers
                </a>
                <a
                  href="#"
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
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-white"
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="font-geist text-xs text-stone-100 transition-colors hover:text-white"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between border-t border-white/5 py-6">
            <span className="font-geist text-[10px] text-neutral-200">
              (c) 2024 Aomi Inc. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
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
                  data-lucide="twitter"
                  className="lucide lucide-twitter h-4 w-4"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a
                href="#"
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
