"use client";

import { useState, type CSSProperties } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-6 right-0 left-0 z-50 flex items-center justify-center gap-x-4 gap-y-4 pr-4 pl-4">
        <div className="flex items-center gap-x-2 gap-y-2 rounded-full bg-black/20 pt-2.5 pr-5 pb-2.5 pl-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px] transition-all duration-300">
          <img
            src="/assets/images/bubble.svg"
            alt="Aomi"
            className="h-6 w-6 drop-shadow-sm invert"
          />
          <span className="font-geist text-sm font-semibold tracking-tight text-white drop-shadow-sm">
            Aomi
          </span>
        </div>
        <div className="flex hidden items-center gap-x-6 gap-y-6 rounded-full bg-black/20 pt-1.5 pr-1.5 pb-1.5 pl-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px] transition-all md:flex">
          <div className="flex items-center gap-6 pr-2">
            <a
              href="#top"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Overview
            </a>
            <a
              href="#technology-section"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Technology
            </a>
            <a
              href="#workflow"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Solutions
            </a>
            <a
              href="#resources"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Resources
            </a>
          </div>
          <a
            href="https://github.com/aomi-labs"
            target="_blank"
            rel="noreferrer"
            className="group font-geist relative flex items-center gap-1.5 overflow-hidden rounded-full bg-white/90 px-5 py-2.5 text-xs font-semibold text-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              GitHub
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
                data-lucide="arrow-right"
                className="lucide lucide-arrow-right h-3 w-3"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </span>
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-tr from-white via-neutral-100 to-neutral-200 opacity-100"></div>
          </a>
        </div>
        <button
          className="rounded-full bg-black/20 p-2.5 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px] transition-transform active:scale-95 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
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
              className="h-5 w-5"
            >
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          ) : (
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
              className="h-5 w-5"
            >
              <path d="M4 5h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 19h16"></path>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[80px]"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
        <div
          className={`fixed top-0 right-0 z-50 h-full w-full border-l border-white/10 bg-black/30 pt-5 text-center shadow-2xl backdrop-blur-[80px] transition-transform duration-300 ease-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex h-full flex-col px-6 pt-20 pb-8">
            <div className="flex flex-col gap-2">
              <a
                href="#top"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Overview
              </a>
              <a
                href="#technology-section"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Technology
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Solutions
              </a>
              <a
                href="#resources"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Resources
              </a>
            </div>
            <div className="mt-auto">
              <a
                href="https://github.com/aomi-labs"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist block rounded-full bg-white/90 px-5 py-3 text-center text-sm font-semibold text-neutral-900 shadow-lg"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="animate-fade-in mr-auto mb-30 ml-auto flex w-full max-w-7xl flex-col items-center pt-36 pr-4 pl-4 text-center">
        <div className="mb-8 flex cursor-default items-center rounded-full border-0 bg-black/20 pt-1.5 pr-2 pb-1.5 pl-2 shadow-lg ring-1 ring-white/10 backdrop-blur-[80px] transition-colors">
          <div className="flex -space-x-2">
            <div className="h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-neutral-200">
              <img
                src="https://i.pravatar.cc/100?img=1"
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-neutral-200">
              <img
                src="https://i.pravatar.cc/100?img=5"
                alt="User"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="font-geist flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold">
              +
            </div>
          </div>
          <span className="font-geist pr-2 pl-2 text-[10px] font-medium text-white">
            500+ daily users
          </span>
        </div>

        <h1 className="mb-6 max-w-5xl text-center font-serif text-5xl leading-[1.1] tracking-tight text-neutral-50 drop-shadow-2xl md:text-7xl lg:text-8xl">
          One prompt away
          <br />
          <span className="font-pt-serif text-white/80 italic">
            from action.
          </span>
        </h1>
        <p className="font-geist mr-auto mb-10 ml-auto max-w-xl text-sm leading-relaxed font-light tracking-wide text-neutral-50 drop-shadow-lg md:text-base">
          Your agentic terminal for blockchain automation. Transform
          <br className="hidden md:block" />
          natural language into secure, multi-chain transactions.
        </p>
        <div className="mb-25 flex items-center gap-4">
          <a
            href="https://calendly.com/cecilia-foameo/30min"
            target="_blank"
            rel="noreferrer"
            className="landing-button-primary group [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)]"
          >
            <span className="relative z-10">Contact Us</span>
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
              data-lucide="arrow-right"
              className="lucide lucide-arrow-right relative z-10 h-3 w-3"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
            {/* <div className="group-hover:opacity-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-opacity bg-gradient-to-r from-[#9D77A8] to-[#ec6b83] opacity-0 absolute top-0 right-0 bottom-0 left-0 shadow-lg"></div> */}
          </a>
          <a
            href="/docs/about-aomi"
            className="group font-geist relative overflow-hidden rounded-full bg-black/20 pt-3 pr-8 pb-3 pl-8 text-xs font-medium text-white shadow-lg ring-1 ring-white/20 backdrop-blur-[80px] transition-all duration-300 hover:bg-white/20 active:scale-95"
          >
            <span className="relative z-10">Documentation</span>
          </a>
        </div>
        <div className="flex w-full max-w-[1500px] flex-col items-center justify-start pt-10 pb-10">
          <div
            id="terminal-container"
            className="h-[680px] w-full max-w-[900px] origin-bottom-left transform transition-all duration-300"
          >
            <AomiFrame height="100%" width="100%" walletPosition="footer" />
          </div>
        </div>
      </div>

      <section className="relative z-10 bg-stone-100 pt-20" id="client-ticker">
        <div className="mr-auto ml-auto max-w-7xl pr-4 pl-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="font-geist text-xs font-medium tracking-wide text-stone-800 uppercase">
              Trusted by teams at
            </p>
          </div>

          {/* Ticker Container */}
          <div
            className="relative overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          >
            {/* Gradient Overlays */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-15 bg-gradient-to-r from-black via-black/80 to-transparent"
              style={{ visibility: "hidden" }}
            ></div>

            {/* Animated Ticker */}
            <div
              className="ticker-track flex flex-nowrap items-center justify-center pt-2 pb-2"
              style={
                {
                  gap: "4rem",
                } as CSSProperties
              }
            >
              {/* First set of logos */}
              <div className="flex shrink-0 items-center gap-16 gap-x-16 gap-y-16">
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/solana-sol-logo.png"
                    alt="Solana"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/ethereum-eth-logo.png"
                    alt="Ethereum"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/cosmos-atom-logo.png"
                    alt="Cosmos"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/Metamask-Digital-Asset-Logo-PNG.png"
                    alt="MetaMask"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/trusted/polymarket1671006384460.png"
                    alt="Polymarket"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
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
