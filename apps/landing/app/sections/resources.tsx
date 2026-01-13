export function Resources() {
  return (
    <>
      <section
        id="faq"
        className="js-animate border-white/20 border-t pt-20 pr-4 pb-10 pl-4 w-full"
        data-animate="up"
        data-delay="300"
      >
        <div className="mr-auto ml-auto max-w-4xl text-center">
          <div>
            <h2 className="mt-1 mb-15 text-3xl md:text-4xl tracking-tight font-serif font-medium text-white">
              FAQ
            </h2>
          </div>

          <div className="glass-panel mt-10 divide-y divide-white/10 rounded-[2rem] text-left overflow-hidden mx-auto">
            <details className="mx-5 group p-5">
              <summary className="w-full flex items-center justify-between text-left cursor-pointer list-none">
                <span className="text-sm md:text-base font-geist font-normal tracking-tight text-white">
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
                  className="lucide lucide-chevron-down w-4 h-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mt-3 mx-5 ">
                <p className="text-sm text-white/70 font-geist leading-relaxed">
                  Unlike generic wrappers, Aomi is protocol-native. We use deep
                  execution layers per blockchain architecture to enable true
                  interoperability, rather than relying on fragile surface-level
                  APIs. Our agentic runtime integrates with blockchain clients in one single process.
                </p>
              </div>
            </details>

            <details className="mx-5 group p-5">
              <summary className="w-full flex items-center justify-between text-left cursor-pointer list-none">
                <span className="text-sm md:text-base font-geist font-normal tracking-tight text-white">
                  How do you prevent LLM hallucinations in financial transactions?
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
                  className="lucide lucide-chevron-down w-4 h-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mt-3 mx-5">
                <p className="text-sm text-white/70 font-geist leading-relaxed">
                  We utilize a security-first design with real-time simulation.
                  Every AI-generated intent is simulated against the blockchain
                  state to verify correctness and type safety before execution. 
                  We employ LLM-as-a-judge in addition to deterministic hard checks to filter away malformed transactions.
                </p>
              </div>
            </details>

            <details className="mx-5 group p-5">
              <summary className="w-full flex items-center justify-between text-left cursor-pointer list-none">
                <span className="text-sm md:text-base font-geist font-normal tracking-tight text-white">
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
                  className="lucide lucide-chevron-down w-4 h-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mt-3 mx-5">
                <p className="text-sm text-white/70 font-geist leading-relaxed">
                  No. While we power conversational interfaces, Aomi is the
                  infrastructure layer for all agentic software. This includes
                  background automation for smart wallets, yield routing, and
                  institutional data analysis. Aomi is can be a high-performance alternative of Langchain.
                </p>
              </div>
            </details>

            <details className="mx-5 group p-5">
              <summary className="w-full flex items-center justify-between text-left cursor-pointer list-none">
                <span className="text-sm md:text-base font-geist font-normal tracking-tight text-white">
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
                  className="lucide lucide-chevron-down w-4 h-4 text-white/60 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </summary>
              <div className="mt-3 mx-5">
                <p className="text-sm text-white/70 font-geist leading-relaxed">
                  Aomi supports generic EVM transaction executions with native
                  tool sets. We enable multi-chain operations with configurable
                  RPC endpoints for networks like Ethereum, Base, and Polygon.
                  We plan to support non-EVM chains such as Solana on our roadmap.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>


    
        <section className="flex flex-col text-center w-full z-10 mb-10 pt-20 pb-20 relative items-center justify-center">
          <h2 className="md:text-5xl text-3xl text-white tracking-tight font-serif mb-6">
            Ready to automate?
          </h2>
          <p className="font-light text-stone-100 font-geist max-w-lg mb-8">
            Join thousands of traders and developers building the next
            generation of on-chain agents.
          </p>
          <div className="flex gap-x-4 gap-y-4 items-center">
            <a href="https://calendly.com/cecilia-foameo/30min" target="_blank" rel="noreferrer" className="landing-button-primary group [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)]">
                    Book a Call              
              </a>
          </div>
        </section>
        <footer className="bg-[#9d78a8] w-full border-white/5 border-t mt-auto pt-10">
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="flex flex-col md:flex-row md:gap-4 w-full mb-12 items-start justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-white">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-stone-100 w-[20px] h-[20px]" strokeWidth="2" style={{ width: "20px", height: "20px" }} data-icon-replaced="true">
                  <circle cx="45" cy="55" r="35" stroke="currentColor" strokeWidth="14" className=""></circle>
                  <circle cx="75" cy="25" r="14" stroke="currentColor" strokeWidth="14" className=""></circle>
                </svg>
                <span className="font-semibold text-stone-100 tracking-tight font-geist">
                        Aomi
                      </span>
              </div>
              <p className="text-xs text-neutral-100 max-w-xs font-geist leading-relaxed">
                The interface for the agentic web. Automating complex
                blockchain interactions with simple natural language.
              </p>
            </div>
            <div className="flex gap-x-16 gap-y-16">
              <div className="flex flex-col gap-3 text-stone-100 gap-x-3 gap-y-3">
                <span className="uppercase text-xs font-semibold text-stone-100 tracking-wider font-geist">
                        Product
                      </span>
                <a href="#" className="hover:text-stone-100 transition-colors text-xs text-stone-100 font-geist">
                  Features
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-stone-100 transition-colors font-geist">
                  Integrations
                </a>
                <a href="#" className="hover:text-white transition-colors text-xs text-stone-100 font-geist">
                  Pricing
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-stone-100 transition-colors font-geist">
                  Changelog
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="uppercase text-xs font-semibold text-stone-100 tracking-wider font-geist">
                        Company
                      </span>
                <a href="#" className="text-stone-100 hover:text-stone-100 transition-colors text-xs text-neutral-400 font-geist">
                  About
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-stone-400 transition-colors font-geist">
                  Blog
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-stone-400 transition-colors font-geist">
                  Careers
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-stone-400 transition-colors font-geist">
                  Contact
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="uppercase text-xs font-semibold text-stone-100 tracking-wider font-geist">
                        Legal
                      </span>
                <a href="#" className="text-xs text-stone-100 hover:text-white transition-colors font-geist">
                  Privacy
                </a>
                <a href="#" className="text-xs text-stone-100 hover:text-white transition-colors font-geist">
                  Terms
                </a>
              </div>
            </div>
          </div>
            <div className="w-full flex items-center justify-between py-6 border-t border-white/5">
              <span className="text-[10px] text-neutral-200 font-geist">
                      (c) 2024 Aomi Inc. All rights reserved.
                    </span>
              <div className="flex items-center gap-4">
                <a href="https://github.com/aomi-labs" target="_blank" rel="noreferrer" className="text-neutral-200 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="twitter" className="lucide lucide-twitter w-4 h-4"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                </a>
                <a href="#" className="text-neutral-200 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="github" className="lucide lucide-github w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
    
    </>
  );
}
