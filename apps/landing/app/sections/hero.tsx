import { WidgetFrame } from "@/components/samples/widget-demo";
import type { CSSProperties } from "react";

export function Hero() {
  return (
    <>
      <nav className="fixed flex z-50 pr-4 pl-4 top-6 right-0 left-0 gap-x-4 gap-y-4 items-center justify-center">
      <div className="flex transition-all duration-300 backdrop-blur-[40px] bg-white/10 border-white/20 border-0 rounded-full ring-white/20 ring-1 pt-2.5 pr-5 pb-2.5 pl-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] gap-x-2 gap-y-2 items-center">
        <img
          src="/assets/images/bubble.svg"
          alt="Aomi"
          className="w-6 h-6 drop-shadow-sm invert"
        />
        <span className="text-sm font-semibold text-white tracking-tight font-geist drop-shadow-sm">
          Aomi
        </span>
      </div>
      <div className="flex hidden md:flex transition-all backdrop-blur-[40px] bg-white/5 border-white/10 border-0 ring-white/20 ring-1 rounded-full pt-1.5 pr-1.5 pb-1.5 pl-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] gap-x-6 gap-y-6 items-center">
        <div className="flex items-center gap-6 pr-2">
          <a href="#top" className="transition-colors hover:text-white text-xs font-medium text-white/70 font-geist drop-shadow-sm">
            Overview
          </a>
          <a href="#technology-section" className="text-xs font-medium transition-colors font-geist text-white/70 hover:text-white drop-shadow-sm">
            Technology
          </a>
          <a href="#workflow" className="text-xs font-medium transition-colors font-geist text-white/70 hover:text-white drop-shadow-sm">
            Solutions
          </a>
          <a href="#resources" className="transition-colors hover:text-white text-xs font-medium text-white/70 font-geist drop-shadow-sm">
            Resources
          </a>
        </div>
        <a href="https://github.com/aomi-labs" target="_blank" rel="noreferrer" className="relative overflow-hidden group text-xs font-semibold px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 font-geist bg-white/90 text-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95">
          <span className="relative z-10 flex items-center gap-1.5">
                GitHub
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="arrow-right" className="lucide lucide-arrow-right w-3 h-3"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </span>
          <div className="bg-gradient-to-tr from-white via-neutral-100 to-neutral-200 opacity-100 absolute top-0 right-0 bottom-0 left-0">
          </div>
        </a>
      </div>
      <button className="md:hidden p-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-lg ring-1 ring-white/20 active:scale-95 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="menu" className="lucide lucide-menu w-5 h-5"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>
          </button>
      </nav>
      <div className="flex flex-col animate-fade-in text-center w-full max-w-7xl mr-auto ml-auto pt-36 pr-4 pl-4 items-center">
        <div className="flex backdrop-blur-[20px] hover:bg-white/10 transition-colors cursor-default bg-white/20 border-white/10 border rounded-full ring-white/10 ring-1 mb-8 pt-1.5 pr-2 pb-1.5 pl-2 shadow-lg items-center">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full border border-white/20 overflow-hidden bg-neutral-200">
              <img src="https://i.pravatar.cc/100?img=1" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="w-6 h-6 rounded-full border border-white/20 overflow-hidden bg-neutral-200">
              <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold font-geist bg-white/20 backdrop-blur-sm text-white border border-white/20">
              +
            </div>
          </div>
          <span className="text-[10px] font-medium pr-2 font-geist text-white pl-2">
                500+ daily users
              </span>
        </div>
        <h1 className="leading-[1.1] md:text-7xl lg:text-8xl text-5xl text-neutral-50 tracking-tight font-serif text-center max-w-5xl mb-6 drop-shadow-2xl">
          One prompt away
          <br />
          <span className="italic text-white/80 font-pt-serif">from action.</span>
        </h1>
        <p className="md:text-base leading-relaxed text-sm font-light text-neutral-50 tracking-wide font-geist max-w-xl mr-auto mb-10 ml-auto drop-shadow-lg">
          Your agentic terminal for blockchain automation. Transform
          <br className="hidden md:block" />
              natural language into secure, multi-chain transactions.
        </p>
        <div className="flex gap-4 mb-20 items-center">
          <a href="https://calendly.com/cecilia-foameo/30min" target="_blank" rel="noreferrer" className="landing-button-primary group [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)]">
                <span className="relative z-10">Contact Us</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="arrow-right" className="lucide lucide-arrow-right w-3 h-3 relative z-10"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                <div className="group-hover:opacity-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-opacity bg-gradient-to-r from-[#9D77A8] to-[#ec6b83] opacity-0 absolute top-0 right-0 bottom-0 left-0 shadow-lg"></div>
              </a>
          <a href="/docs/about-aomi" className="group relative overflow-hidden transition-all border hover:bg-white/10 active:scale-95 duration-300 text-xs font-medium text-white font-geist bg-white/30 rounded-full pt-3 pr-8 pb-3 pl-8 shadow-lg backdrop-blur-md">
                <span className="relative z-10">Documentation</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100"></div>
              </a>
        </div>
        <div className="w-full max-w-3xl">
          <div className="glass-panel rounded-[2rem] p-3 relative">
            <WidgetFrame />
          </div>
        </div>
      </div>




      <section className="z-10 sm:py-24 pb-15 relative" id="client-ticker">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-4 pl-4">
          <div className="text-center mb-12">
            <p className="uppercase text-xs font-medium text-white-500 tracking-wide font-geist">
              Trusted by teams at
            </p>
          </div>

          {/* Ticker Container */}
          <div
            className="overflow-hidden relative"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          >
            {/* Gradient Overlays */}
            <div
              className="z-10 pointer-events-none bg-gradient-to-r from-black via-black/80 to-transparent w-15 absolute top-0 bottom-0 left-0"
              style={{ visibility: "hidden" }}
            ></div>

            {/* Animated Ticker */}
            <div
              className="ticker-track flex w-max flex-nowrap pt-2 pb-2 items-center animate-marquee will-change-transform"
              style={
                {
                  "--duration": "15s",
                  "--group-gap": "2rem",
                  gap: "var(--group-gap)",
                } as CSSProperties
              }
            >
              {/* First set of logos */}
              <div className="flex gap-16 shrink-0 gap-x-16 gap-y-16 items-center">
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/solana-sol-logo.png"
                    alt="Solana"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/ethereum-eth-logo.png"
                    alt="Ethereum"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/cosmos-atom-logo.png"
                    alt="Cosmos"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/Metamask-Digital-Asset-Logo-PNG.png"
                    alt="MetaMask"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/polymarket1671006384460.png"
                    alt="Polymarket"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
              </div>

              {/* Duplicate set for seamless loop */}
              <div className="flex items-center gap-16 shrink-0">
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/solana-sol-logo.png"
                    alt="Solana"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/ethereum-eth-logo.png"
                    alt="Ethereum"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/cosmos-atom-logo.png"
                    alt="Cosmos"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/Metamask-Digital-Asset-Logo-PNG.png"
                    alt="MetaMask"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/polymarket1671006384460.png"
                    alt="Polymarket"
                    className="h-[3rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
