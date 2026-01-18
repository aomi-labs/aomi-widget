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
      script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
      script.onload = () => {
        if ((window as any).UnicornStudio && !(window as any).UnicornStudio.isInitialized) {
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
      <section className="flex flex-col w-full max-w-7xl mr-auto mb-22  ml-auto px-4" id="solution" data-animate="up" data-delay="200">
      <div className="overflow-hidden w-full  rounded-[2.5rem] pl-12 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-20 relative items-center">
              <div className="flex flex-col justify-between h-full">
                <div className="">
                  <div className="inline-flex bg-stone-100 w-fit border-stone-200 border rounded-full ring-stone-200 ring-1 mt-10 mb-6 pt-1 pr-3 pb-1 pl-3 items-center">
                    <span className="text-[10px] uppercase font-semibold text-stone-800 tracking-wider font-geist mt-1 mb-1">Solution</span>
                  </div>
                  <h2 className="md:text-5xl text-4xl text-stone-800 tracking-tight font-serif mb-2">
                    Leverage intelligence<br />
                    <span className="italic text-stone-600">to Automate.</span>
                  </h2>
                  <p className="text-base font-light text-stone-600 font-geist mb-10">
                    Partner with Aomi for the agentic future.
                  </p>
                  <div className="relative pl-2">
                    <div className="absolute left-[11px] top-3 bottom-8 w-px bg-gradient-to-b from-stone-500/50 via-stone-300 to-transparent">
                    </div>
                    <div className="flex flex-col gap-10 gap-x-10 gap-y-10">
                      <div className="relative flex gap-6 items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border  bg-white z-10 relative mt-1 flex items-center justify-center ring-1">
                          <div className="bg-[#9D77A8] w-2 h-2 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-stone-800 font-geist">
                            Consultation &amp; Strategy
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-stone-600 font-geist mt-2">
                            Contact us to define how we can support your
                            business with AI automation for on-chain
                            transactions, whether you&apos;re building AI x crypto
                            projects, onchain agents, or enhancing UX with
                            chat interfaces.
                          </p>
                        </div>
                      </div>
                      <div className="flex relative gap-x-6 gap-y-6 items-start">
                        <div className="flex-shrink-0 flex bg-white w-6 h-6 z-10 border-stone-300 border rounded-full mt-1 relative shadow-inner items-center justify-center">
                          <div className="bg-stone-400 w-2 h-2 rounded-full">
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-stone-800 font-geist">
                            Custom Build
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-stone-600 font-geist mt-2">
                            We build customized AI applications integrating
                            your APIs and tools, seamlessly deployed within
                            your existing infrastructure.
                          </p>
                        </div>
                      </div>
                      <div className="relative flex gap-6 items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border border-stone-300 bg-white z-10 relative mt-1 flex items-center justify-center shadow-inner">
                          <div className="w-2 h-2 rounded-full bg-stone-400">
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-stone-800 font-geist">
                            Managed Orchestration
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-stone-600 font-geist mt-2">
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
                  <a href="/docs/about-aomi" className="overflow-hidden group transition-all flex items-center gap-2 hover:shadow-lg active:scale-95 text-xs font-semibold text-white font-geist bg-stone-800 w-fit rounded-full pt-3 pr-6 pb-3 pl-6 relative shadow-md">
                    <span className="z-10 flex items-center gap-2 relative">Documentation</span>
                  </a>
                </div>
              </div>
              <div className="hidden lg:flex lg:mt-0 min-h-[420px] w-full relative items-center justify-center">
                <div
                  data-us-project="Vpa6JQ9WnxiC9cgDUWnu"
                  style={{ width: "100%", height: "420px" }}
                ></div>
              </div>
            </div>
          </div>
        </section>
  <section className="mb-20 flex w-full max-w-7xl pb-20 mr-auto ml-auto items-center justify-center" id="resources">
    <div className="grid grid-cols-1 md:grid-cols-2 mx-5 text-stone-50 relative gap-y-16 md:gap-y-0">
        <div className="js-animate group flex flex-col" data-animate="left" data-delay="150">
            <h2 className="text-2xl md:text-3xl text-stone-800 tracking-tight font-thin font-geist pb-2 ml-5 md:ml-20 pl-5">
              AI infrastructure Hosting
            </h2>
            <p className="leading-relaxed text-sm font-light text-stone-700 max-w-90 font-geist mb-10 md:mb-10  ml-5 md:ml-20 pl-5">
              Aomi provides high-performance serverless backend for the agentic lifecycle.
            </p>
      <div className="bg-[#e3d8e6] ml-5 md:ml-20 mr-5 md:mr-15 pt-10 pr-6 md:pr-10 pb-10 pl-6 md:pl-10 rounded-4xl">
          <div className="flex flex-col gap-y-5">
            <p className="leading-relaxed text-sm font-light text-stone-700 font-geist">
            Think of it as &apos;AWS Lambda for Agents.&apos; 
            Eliminate the overhead of managing heavy Python or TypeScript frameworks 
            like LangChain or AI SDK. Simply select your model, 
            configure your system prompts, and define your tools.
            </p>
            <p className="font-geist text-sm font-light leading-relaxed text-stone-700">
            Our proprietary Rust framework is engineered for stateless concurrency, 
            executing agentic loops at native speed. Aomi handles the deployment, scaling, 
            and lifecycle management required for production-grade workloads.
            </p>
          </div>
        <div className="relative flex h-48 w-full mt-5 mb-5">
          <svg className="absolute inset-0 h-full w-full pointer-events-none lg:block" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="sqLineBlack" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,0,0,0.5)"></stop>
                <stop offset="50%" stopColor="rgba(0,0,0,0.5)"></stop>
                <stop offset="100%" stopColor="rgba(0,0,0,0.5)"></stop>
              </linearGradient>
            </defs>
            <g fill="rgba(50,50,50,1)" stroke="rgba(68,64,60,0.5)" strokeWidth="0.6">
              <rect x="85" y="46" width="30" height="30"></rect>
              <rect x="16" y="15" width="16" height="16"></rect>
              <rect x="16" y="85" width="16" height="16"></rect>
              <rect x="168" y="15" width="16" height="16"></rect>
              <rect x="168" y="85" width="16" height="16"></rect>
            </g>
            <g stroke="url(#sqLineBlack)" strokeWidth="0.6" fill="none" strokeDasharray="3 2 1 3">
              <path d="M 32 26 H 88 V 60"></path>
              <path d="M 32 94 H 88 V 60"></path>
              <path d="M 168 26 H 112 V 60"></path>
              <path d="M 168 94 H 112 V 60"></path>
              <animate attributeName="stroke-dashoffset" from="0" to="14" dur="2.2s" repeatCount="indefinite"></animate>
            </g>
          </svg>
        </div>
      </div>
      </div>
      <div className="js-animate group flex flex-col" data-animate="right" data-delay="220">
          <div className="bg-[#e3d8e6] ml-5 md:ml-15 mr-5 md:mr-20 pt-5 pr-6 md:pr-10 pb-10 pl-6 md:pl-10 rounded-4xl">
        <div className="overflow-hidden bg-[#1a1a1a] border border-neutral-800 rounded-2xl mt-5 mb-10 relative shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="p-5">
            <p className="text-sm text-neutral-300 font-mono"><span className="text-emerald-400">$</span> pnpm install @aomi-labs/react</p>
            <p className="text-sm text-neutral-300 font-mono mt-2"><span className="text-emerald-400">$</span> npx shadcn add @aomi/aomi-frame</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-5">
          <p className="font-geist text-sm font-light leading-relaxed text-stone-700">
            Aomi provides a production-ready component library that embeds AI UX
            directly into your UI. Our widgets support persistent memory,
            real-time chat, and interactive tool calling—delivering a true
            plug-and-play experience without sacrificing control.
          </p>
          <p className="font-geist text-sm font-light leading-relaxed text-stone-700">
            Following the shadcn/ui philosophy, components are installed directly
            into your codebase rather than hidden behind a black-box dependency.
            You retain full ownership and styling control.
          </p>
        </div>
                      <div className="mt-10">
                  <a href="https://www.npmjs.com/package/@aomi-labs/widget-lib" target="_blank" rel="noreferrer" className="ml-auto overflow-hidden group transition-all flex items-center gap-2 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 text-xs font-semibold text-neutral-900 font-geist bg-white/90 w-fit rounded-full pt-3 pr-6 pb-3 pl-6 relative shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    <span className="z-10 flex items-center gap-2 relative">Npm package</span>
                    <div className="bg-gradient-to-tr from-white via-neutral-100 to-neutral-200 opacity-100 absolute top-0 right-0 bottom-0 left-0">
                    </div>
                  </a>
                      </div>
      </div>
      <p className="max-w-90 font-geist text-sm font-light leading-relaxed text-stone-700 text-right mt-10 md:mt-10 md:ml-30 mr-10">
            Customized UI as the product surface of intelligence, build AI into your application without complexity.
          </p>
      <h3 className="text-2xl md:text-3xl text-stone-800 tracking-tight font-thin font-geist text-center md:text-right pt-3 md:mr-20 pr-5">
        Seamless frontend integration
      </h3>
      </div>
    </div>
    </section>
    </div>



    
    </>
  );
}
