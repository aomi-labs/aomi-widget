"use client";

import { useEffect } from "react";

export function Solution() {
  useEffect(() => {
    const loadUnicornStudio = () => {
      if (typeof window === "undefined") return;

      if ((window as any).UnicornStudio) {
        (window as any).UnicornStudio.init();
        return;
      }

      (window as any).UnicornStudio = { isInitialized: false };
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
      script.onload = () => {
        if (
          (window as any).UnicornStudio &&
          !(window as any).UnicornStudio.isInitialized
        ) {
          (window as any).UnicornStudio.init();
          (window as any).UnicornStudio.isInitialized = true;
        }
      };
      document.body.appendChild(script);
    };

    loadUnicornStudio();
  }, []);

  return (
    <>
      <div className="w-full bg-stone-100">
        <section
          className="mr-auto mb-22 ml-auto flex w-full max-w-7xl flex-col px-4"
          id="solution"
          data-animate="up"
          data-delay="200"
        >
          <div className="relative w-full overflow-hidden rounded-[2.5rem] pl-12">
            <div className="relative grid grid-cols-1 items-center lg:grid-cols-2 lg:gap-20">
              <div className="flex h-full flex-col justify-between">
                <div className="">
                  <div className="mt-10 mb-6 inline-flex w-fit items-center rounded-full border border-stone-200 bg-stone-100 pt-1 pr-3 pb-1 pl-3 ring-1 ring-stone-200">
                    <span className="font-geist mt-1 mb-1 text-[10px] font-semibold tracking-wider text-stone-800 uppercase">
                      Solution
                    </span>
                  </div>
                  <h2 className="mb-2 font-serif text-4xl tracking-tight text-stone-800 md:text-5xl">
                    Leverage intelligence
                    <br />
                    <span className="text-stone-600 italic">to Automate.</span>
                  </h2>
                  <p className="font-geist mb-10 text-base font-light text-stone-600">
                    Partner with Aomi for the agentic future.
                  </p>
                  <div className="relative pl-2">
                    <div className="absolute top-3 bottom-8 left-[11px] w-px bg-gradient-to-b from-stone-500/50 via-stone-300 to-transparent"></div>
                    <div className="flex flex-col gap-10 gap-x-10 gap-y-10">
                      <div className="relative flex items-start gap-6">
                        <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-white ring-1">
                          <div className="h-2 w-2 rounded-full bg-[#9D77A8]"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-geist text-lg font-semibold text-stone-800">
                            Consultation &amp; Strategy
                          </h3>
                          <p className="font-geist mt-2 text-sm leading-relaxed font-light text-stone-600">
                            Contact us to define how we can support your
                            business with AI automation for on-chain
                            transactions, whether you&apos;re building AI x
                            crypto projects, onchain agents, or enhancing UX
                            with chat interfaces.
                          </p>
                        </div>
                      </div>
                      <div className="relative flex items-start gap-x-6 gap-y-6">
                        <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white shadow-inner">
                          <div className="h-2 w-2 rounded-full bg-stone-400"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-geist text-lg font-semibold text-stone-800">
                            Custom Build
                          </h3>
                          <p className="font-geist mt-2 text-sm leading-relaxed font-light text-stone-600">
                            We build customized AI applications integrating your
                            APIs and tools, seamlessly deployed within your
                            existing infrastructure.
                          </p>
                        </div>
                      </div>
                      <div className="relative flex items-start gap-6">
                        <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white shadow-inner">
                          <div className="h-2 w-2 rounded-full bg-stone-400"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-geist text-lg font-semibold text-stone-800">
                            Managed Orchestration
                          </h3>
                          <p className="font-geist mt-2 text-sm leading-relaxed font-light text-stone-600">
                            In production, we host the LLM infrastructure
                            including agentic orchestration, allowing you to
                            focus purely on your backend logic.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-12 mb-12">
                  <a
                    href="/docs/about-aomi"
                    className="group font-geist relative flex w-fit items-center gap-2 overflow-hidden rounded-full bg-stone-800 pt-3 pr-6 pb-3 pl-6 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Documentation
                    </span>
                  </a>
                </div>
              </div>
              <div className="relative hidden min-h-[420px] w-full items-center justify-center lg:mt-0 lg:flex">
                <div
                  data-us-project="Vpa6JQ9WnxiC9cgDUWnu"
                  style={{ width: "100%", height: "420px" }}
                ></div>
              </div>
            </div>
          </div>
        </section>
        <section
          className="mr-auto mb-20 ml-auto flex w-full max-w-7xl items-center justify-center pb-20"
          id="resources"
        >
          <div className="relative mx-5 grid grid-cols-1 gap-y-16 text-stone-50 md:grid-cols-2 md:gap-y-0">
            <div
              className="js-animate group flex flex-col"
              data-animate="left"
              data-delay="150"
            >
              <h2 className="font-geist ml-5 pb-2 pl-5 text-2xl font-thin tracking-tight text-stone-800 md:ml-20 md:text-3xl">
                AI infrastructure Hosting
              </h2>
              <p className="font-geist mb-10 ml-5 max-w-90 pl-5 text-sm leading-relaxed font-light text-stone-700 md:mb-10 md:ml-20">
                Aomi provides high-performance serverless backend for the
                agentic lifecycle.
              </p>
              <div className="mr-5 ml-5 rounded-4xl bg-[#e3d8e6] pt-10 pr-6 pb-10 pl-6 md:mr-15 md:ml-20 md:pr-10 md:pl-10">
                <div className="flex flex-col gap-y-5">
                  <p className="font-geist text-sm leading-relaxed font-light text-stone-700">
                    Think of it as &apos;AWS Lambda for Agents.&apos; Eliminate
                    the overhead of managing heavy Python or TypeScript
                    frameworks like LangChain or AI SDK. Simply select your
                    model, configure your system prompts, and define your tools.
                  </p>
                  <p className="font-geist text-sm leading-relaxed font-light text-stone-700">
                    Our proprietary Rust framework is engineered for stateless
                    concurrency, executing agentic loops at native speed. Aomi
                    handles the deployment, scaling, and lifecycle management
                    required for production-grade workloads.
                  </p>
                </div>
                <div className="relative mt-5 mb-5 flex h-48 w-full">
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full lg:block"
                    viewBox="0 0 200 120"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient
                        id="sqLineBlack"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="rgba(0,0,0,0.5)"></stop>
                        <stop offset="50%" stopColor="rgba(0,0,0,0.5)"></stop>
                        <stop offset="100%" stopColor="rgba(0,0,0,0.5)"></stop>
                      </linearGradient>
                    </defs>
                    <g
                      fill="rgba(50,50,50,1)"
                      stroke="rgba(68,64,60,0.5)"
                      strokeWidth="0.6"
                    >
                      <rect x="85" y="46" width="30" height="30"></rect>
                      <rect x="16" y="15" width="16" height="16"></rect>
                      <rect x="16" y="85" width="16" height="16"></rect>
                      <rect x="168" y="15" width="16" height="16"></rect>
                      <rect x="168" y="85" width="16" height="16"></rect>
                    </g>
                    <g
                      stroke="url(#sqLineBlack)"
                      strokeWidth="0.6"
                      fill="none"
                      strokeDasharray="3 2 1 3"
                    >
                      <path d="M 32 26 H 88 V 60"></path>
                      <path d="M 32 94 H 88 V 60"></path>
                      <path d="M 168 26 H 112 V 60"></path>
                      <path d="M 168 94 H 112 V 60"></path>
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="14"
                        dur="2.2s"
                        repeatCount="indefinite"
                      ></animate>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <div
              className="js-animate group flex flex-col"
              data-animate="right"
              data-delay="220"
            >
              <div className="mr-5 ml-5 rounded-4xl bg-[#e3d8e6] pt-5 pr-6 pb-10 pl-6 md:mr-20 md:ml-15 md:pr-10 md:pl-10">
                <div className="relative mt-5 mb-10 overflow-hidden rounded-2xl border border-neutral-800 bg-[#1a1a1a] shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/50 px-4 py-3">
                    <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-sm text-neutral-300">
                      <span className="text-emerald-400">$</span> pnpm install
                      @aomi-labs/react
                    </p>
                    <p className="mt-2 font-mono text-sm text-neutral-300">
                      <span className="text-emerald-400">$</span> npx shadcn add
                      @aomi/aomi-frame
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-y-5">
                  <p className="font-geist text-sm leading-relaxed font-light text-stone-700">
                    Aomi provides a production-ready component library that
                    embeds AI UX directly into your UI. Our widgets support
                    persistent memory, real-time chat, and interactive tool
                    calling—delivering a true plug-and-play experience without
                    sacrificing control.
                  </p>
                  <p className="font-geist text-sm leading-relaxed font-light text-stone-700">
                    Following the shadcn/ui philosophy, components are installed
                    directly into your codebase rather than hidden behind a
                    black-box dependency. You retain full ownership and styling
                    control.
                  </p>
                </div>
                <div className="mt-10">
                  <a
                    href="https://www.npmjs.com/package/@aomi-labs/widget-lib"
                    target="_blank"
                    rel="noreferrer"
                    className="group font-geist relative ml-auto flex w-fit items-center gap-2 overflow-hidden rounded-full bg-white/90 pt-3 pr-6 pb-3 pl-6 text-xs font-semibold text-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Npm package
                    </span>
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-tr from-white via-neutral-100 to-neutral-200 opacity-100"></div>
                  </a>
                </div>
              </div>
              <p className="font-geist mt-10 mr-10 max-w-90 text-right text-sm leading-relaxed font-light text-stone-700 md:mt-10 md:ml-30">
                Customized UI as the product surface of intelligence, build AI
                into your application without complexity.
              </p>
              <h3 className="font-geist pt-3 pr-5 text-center text-2xl font-thin tracking-tight text-stone-800 md:mr-20 md:text-right md:text-3xl">
                Seamless frontend integration
              </h3>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
