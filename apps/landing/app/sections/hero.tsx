"use client";

import { useState, type CSSProperties } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { AomiLogo } from "../components/aomi-logo";
import { LandingWalletKitProvider } from "../components/landing-wallet-kit-provider";
import styles from "./hero.module.css";

const DEMO_BACKEND_URL = "/";

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [audienceMode, setAudienceMode] = useState<"human" | "agent">("human");

  return (
    <>
      <nav className="fixed top-6 right-0 left-0 z-50 flex items-center justify-center gap-x-4 gap-y-4 pr-4 pl-4">
        <div className="flex items-center gap-x-2 gap-y-2 rounded-full bg-black/20 pt-2.5 pr-5 pb-2.5 pl-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px] transition-all duration-300">
          <AomiLogo
            className="text-[24px] text-white drop-shadow-sm"
            markClassName="h-6 w-6 invert"
          />
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
              Solutions
            </a>
            <a
              href="#apps-section"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Apps
            </a>
            <a
              href="/docs"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Documentation
            </a>
            <a
              href="#faq"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Resources
            </a>
            <a
              href="/contact"
              className="font-geist text-xs font-medium text-white/70 drop-shadow-sm transition-colors hover:text-white"
            >
              Contact
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
                Solutions
              </a>
              <a
                href="#apps-section"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Apps
              </a>
              <a
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Documentation
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Resources
              </a>
              <a
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="font-geist rounded-xl px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Contact
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
      <div className="mr-auto mb-14 ml-auto flex w-full max-w-7xl flex-col items-center pt-36 pr-4 pl-4 text-center">
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
            500+ developers building with Aomi
          </span>
        </div>

        <h1 className="mb-4 max-w-5xl text-center font-serif text-4xl leading-[1.1] tracking-tight text-neutral-50 drop-shadow-2xl md:text-5xl lg:text-6xl">
          Best Blockchain Harness
          <br />
          <span className="text-white/90">
            for Agentic AI
          </span>
        </h1>
        <p className="mb-6 max-w-5xl text-center font-serif text-2xl leading-[1.2] tracking-tight text-white/70 drop-shadow-lg md:text-3xl lg:text-4xl">
          One prompt away
          <span className="font-pt-serif italic"> from action.</span>
        </p>
        <p className="font-geist mr-auto mb-10 ml-auto max-w-xl text-sm leading-relaxed font-light tracking-wide text-neutral-50 drop-shadow-lg md:text-base">
          Empower your crypto journey with AI. Transact across universal protocols,
          <br className="hidden md:block" />
          top-security, multi-chain. Land in seconds.
        </p>
        <div className="flex w-full max-w-[1500px] flex-col items-center justify-start gap-6 pt-2 pb-0">
          <div className="relative flex h-10 w-full max-w-[316px] rounded-full bg-black/20 p-0.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ring-1 ring-white/20 backdrop-blur-[80px]">
            <div
              className={`absolute top-0.5 left-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full border border-white/40 bg-gradient-to-r from-[#733e83] to-[#ec6b83] transition-transform duration-300 ease-out ${audienceMode === "human" ? "translate-x-0" : "translate-x-full"}`}
            />
            <button
              type="button"
              onClick={() => setAudienceMode("human")}
              className={`font-geist relative z-10 h-full flex-1 rounded-full px-5 text-xs font-medium transition-colors duration-300 ${audienceMode === "human" ? "text-stone-50" : "text-white/75 hover:text-white"}`}
              aria-pressed={audienceMode === "human"}
            >
              I&apos;m a human
            </button>
            <button
              type="button"
              onClick={() => setAudienceMode("agent")}
              className={`font-geist relative z-10 h-full flex-1 rounded-full px-5 text-xs font-medium transition-colors duration-300 ${audienceMode === "agent" ? "text-stone-50" : "text-white/75 hover:text-white"}`}
              aria-pressed={audienceMode === "agent"}
            >
              I&apos;m an Agent
            </button>
          </div>
          {audienceMode === "human" ? (
            <div
              id="terminal-container"
              className="mb-14 h-[680px] w-full max-w-[900px] origin-bottom-left transition-all duration-300"
            >
              <LandingWalletKitProvider>
                <AomiFrame.Root
                  height="100%"
                  width="100%"
                  className={`${styles.demoFrame} aui-suggestions-marquee`}
                  defaultSidebarOpen={false}
                  walletPosition="footer"
                  walletFamilies={["evm", "solana"]}
                  backendUrl={DEMO_BACKEND_URL}
                >
                  <AomiFrame.Header />
                  <AomiFrame.Composer
                    withControl
                    welcomeTitle="What should happen on-chain?"
                    controlBarProps={{ hideApiKey: true, hideNetwork: false }}
                  />
                </AomiFrame.Root>
              </LandingWalletKitProvider>
            </div>
          ) : (
            <div className="mb-14 flex w-full justify-center">
              <div className="w-full max-w-[900px] rounded-[2rem] border border-white/20 bg-black/55 p-5 text-left text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-7">
                <h3 className="mx-4 ml-2 mt-2 font-serif text-2xl leading-[1.1] tracking-tight text-white md:text-md">
                  Onboard your Agent to Aomi
                </h3>
                <div className="mx-2 mt-4 rounded-xl border border-white/15 bg-black px-4 py-3">
                  <code className="font-geist-mono block text-xs leading-6 text-white">
                    $ npx skills add aomi-labs/skills
                  </code>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 md:gap-0">
                  <div className="flex h-full flex-col rounded-[1.75rem] px-3 md:rounded-r-none md:pr-6">
                    <div className="font-geist text-bold font-medium text-white">
                      Build on Aomi
                    </div>
                    <p className="font-geist mt-2 text-sm leading-6 text-white/85">
                      Turn your platform into an agentic application. Bring
                      your APIs - OpenAPI, REST, SDK - Aomi converts them into
                      intent-shaped tools, deployed as an Aomi App hosted on
                      our runtime, with built-in scalability and on-chain
                      harness.
                    </p>

                    <p className="font-geist mt-5 text-sm leading-6 italic text-white/85">
                      Tell your agent
                    </p>
                    <blockquote className="mt-2 border-l-2 border-white/30 pl-4">
                      <p className="font-geist text-sm leading-6 text-white/50">
                        &quot;Read https://aomi.dev/agents/build.md and build an
                        Aomi app for our REST API at api.acme.com, with a
                        ChatGPT-style frontend.&quot;
                      </p>
                    </blockquote>
                    <a
                      href="https://aomi.dev/agents/build.md"
                      target="_blank"
                      rel="noreferrer"
                      className="font-geist mt-3 text-sm font-medium text-white/90 underline underline-offset-4 transition-colors hover:text-white"
                    >
                      → aomi.dev/agents/build.md
                    </a>

                    <div className="font-geist text-bold mt-5 text-sm font-medium text-white">
                      Scaffolding
                    </div>

                    <div className="mt-2">
                      <div className="font-geist text-sm font-sm text-white/90">
                        Backend in Rust
                      </div>
                      <div className="mt-3 rounded-xl border border-white/15 bg-black px-3 py-2">
                        <code className="font-geist-mono block text-xs leading-6 text-white">
                          $ cargo new my-aomi-app --lib &amp;&amp; cd my-aomi-app
                        </code>
                        <code className="font-geist-mono block text-xs leading-6 text-white">
                          $ cargo add aomi-sdk
                        </code>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="font-geist text-sm text-white/90">
                        Frontend with ShadCN
                      </div>
                      <div className="mt-3 rounded-xl border border-white/15 bg-black px-4 py-2">
                        <code className="font-geist-mono block text-xs leading-6 text-white">
                          npx shadcn add https://aomi.dev/r/aomi-frame.json
                        </code>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="font-geist text-sm text-white/90">
                        Or build with our React TypeScript client
                      </div>
                      <div className="mt-3 rounded-xl border border-white/15 bg-black px-4 py-2">
                        <code className="font-geist-mono block text-xs leading-6 text-white">
                          pnpm install @aomi-labs/react
                        </code>
                      </div>
                      <p className="font-geist mt-3 text-sm leading-6 text-white/85">
                        Aomi support headless cli, web ui, telegram, discord,
                        and iOS frontend.
                      </p>
                    </div>

                  </div>

                  <div className="flex h-full flex-col rounded-[1.75rem] p-3 md:rounded-l-none md:border-l md:border-white/12 md:pl-8">
                    <div className="font-geist text-bold font-medium text-white">
                      Transact with Aomi
                    </div>
                    <p className="font-geist mt-2 text-sm leading-6 text-white/85">
                      Run on-chain operations from one chat. Swap, send, stake,
                      lend, sign EIP-712 - across any EVM protocol on Ethereum,
                      Base, Arbitrum, Polygon, Optimism, and Sepolia. Aomi
                      handles the routing and simulation. You sign locally.
                    </p>

                    <p className="font-geist mt-5 text-sm leading-6 italic text-white/85">
                      Tell your agent
                    </p>
                    <blockquote className="mt-2 border-l-2 border-white/30 pl-4">
                      <p className="font-geist text-sm leading-6 text-white/50">
                        &quot;Read https://aomi.dev/agents/transact.md and find the highest-APY USDC vault on Morpho across
                        Ethereum and Base, bridge $100 of USDC there if needed,
                        simulate the deposit, then ask me before signing.&quot;
                      </p>
                    </blockquote>
                    <a
                      href="https://aomi.dev/agents/transact.md"
                      target="_blank"
                      rel="noreferrer"
                      className="font-geist mt-3 text-sm font-medium text-white/90 underline underline-offset-4 transition-colors hover:text-white"
                    >
                      → aomi.dev/agents/transact.md
                    </a>

                    <div className="font-geist text-bold text-sm mt-5 font-medium text-white">
                      Installation
                    </div>
                    <p className="font-geist mt-2 text-sm leading-6 text-white/85">
                      Get Aomi&apos;s TypeScript cli client
                    </p>

                    <div className="mt-3 rounded-xl border border-white/15 bg-black px-4 py-3">
                      <code className="font-geist-mono block text-xs leading-6 text-white">
                        $ npm install -g @aomi-labs/client
                      </code>
                    </div>

                    <p className="font-geist mt-3 text-sm leading-6 text-white/85">
                      State your intent
                    </p>

                    <div className="mt-3 rounded-xl border border-white/15 bg-black px-4 py-3">
                      <code className="font-geist-mono block text-xs leading-6 text-white">
                        $ aomi chat &quot;Stake 50% of my USDC into the Steakhouse
                        USDC vault on Morpho. Simulate before signing.&quot;
                      </code>
                    </div>

                    <p className="font-geist mt-3 text-sm leading-6 text-white/85">
                      Aomi builds and simulates the transaction. You sign locally — non-custodial by design. Account abstraction is on by default; bring a BYOK provider for gas sponsorship on L2s.
                    </p>

                  </div>
                </div>

                <div className="mx-3 mt-6 border-t border-white/12 pt-4">
                  <a
                    href="https://github.com/aomi-labs"
                    target="_blank"
                    rel="noreferrer"
                    className="font-geist text-sm font-medium text-white/85 underline underline-offset-4 transition-colors hover:text-white"
                  >
                    Or visit → github.com/aomi-labs
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="relative z-10 bg-stone-100 pt-36" id="client-ticker">
        <div className="mr-auto ml-auto max-w-7xl pr-4 pl-4 sm:px-6 lg:px-8">
          <div className="mb-22 text-center">
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
                    src="/assets/logos/solana-sol-logo.png"
                    alt="Solana"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/logos/ethereum-eth-logo.png"
                    alt="Ethereum"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/logos/cosmos-atom-logo.png"
                    alt="Cosmos"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/logos/Metamask-Digital-Asset-Logo-PNG.png"
                    alt="MetaMask"
                    className="h-[2.5rem] w-auto object-contain transition-opacity duration-300 hover:opacity-100"
                  />
                </div>
                <div className="flex items-center">
                  <img
                    src="/assets/logos/polymarket.png"
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
