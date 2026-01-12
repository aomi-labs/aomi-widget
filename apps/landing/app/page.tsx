import { WidgetFrame } from "@/components/samples/widget-demo";

export default function HomePage() {
  return (
    <div className="antialiased min-h-screen overflow-x-hidden selection:bg-stone-500/30 selection:text-white text-stone-200 relative bg-[#1c1917]">
<div className="fixed top-0 w-full h-screen bg-cover bg-center z-0 pointer-events-none" style={{ backgroundImage: "url(\"/assets/hero-bg.jpg\")" }}></div>
{/* <div className="fixed inset-0 bg-slate-900/10 mix-blend-multiply"></div> */}
<div className="fixed inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-slate-900/40"></div>

    {/* <div className="absolute top-0 left-0 w-full h-screen z-0 pointer-events-none">
      <img src="/assets/hero-bg.jpg" alt="Background" className="w-full h-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-[#1c1917]"></div>
    </div> */}
    <nav className="fixed flex z-50 pr-4 pl-4 top-6 right-0 left-0 gap-x-4 gap-y-4 items-center justify-center">
      <div className="flex transition-all duration-300 backdrop-blur-[40px] bg-white/10 border-white/20 border-0 rounded-full ring-white/20 ring-1 pt-2.5 pr-5 pb-2.5 pl-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] gap-x-2 gap-y-2 items-center">
        <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-stone-50 w-[24px] h-[24px] drop-shadow-sm" strokeWidth="2" style={{ width: "24px", height: "24px" }} data-icon-replaced="true">
          <circle cx="45" cy="55" r="35" stroke="currentColor" strokeWidth="14" className=""></circle>
          <circle cx="75" cy="25" r="14" stroke="currentColor" strokeWidth="14"></circle>
        </svg>
        <span className="text-sm font-semibold text-white tracking-tight font-geist drop-shadow-sm">
              Aomi
            </span>
      </div>
      <div className="flex hidden md:flex transition-all backdrop-blur-[40px] bg-white/5 border-white/10 border-0 ring-white/20 ring-1 rounded-full pt-1.5 pr-1.5 pb-1.5 pl-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] gap-x-6 gap-y-6 items-center">
        <div className="flex items-center gap-6 pr-2">
          <a href="#" className="transition-colors hover:text-white text-xs font-medium text-white/70 font-geist drop-shadow-sm">
            Home
          </a>
          <a href="#intent" className="text-xs font-medium transition-colors font-geist text-white/70 hover:text-white drop-shadow-sm">
            Features
          </a>
          <a href="#workflow" className="text-xs font-medium transition-colors font-geist text-white/70 hover:text-white drop-shadow-sm">
            Workflow
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
    <main className="flex flex-col min-h-screen z-10 w-full relative">
      <div className="flex flex-col animate-fade-in text-center w-full max-w-7xl mr-auto ml-auto pt-36 pr-4 pb-10 pl-4 items-center">
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
        <p className="md:text-base leading-relaxed text-sm font-normal text-neutral-50 tracking-wide font-geist max-w-xl mr-auto mb-10 ml-auto drop-shadow-lg">
          Your agentic terminal for blockchain automation. Transform
          <br className="hidden md:block" />
              natural language into secure, multi-chain transactions.
        </p>
        <div className="flex gap-4 mb-20 items-center">
          <a href="https://calendly.com/cecilia-foameo/30min" target="_blank" rel="noreferrer" className="group overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 flex [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)] text-xs font-semibold text-stone-50 font-geist bg-gradient-to-r from-[#733e83] to-[#ec6b83] rounded-full ring-1 pt-3 pr-8 pb-3 pl-8 relative shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] items-center">
                <span className="relative z-10">Contact Us</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide="arrow-right" className="lucide lucide-arrow-right w-3 h-3 relative z-10"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                <div className="group-hover:opacity-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-opacity bg-gradient-to-r from-[#733e83] to-[#ec6b83] opacity-0 absolute top-0 right-0 bottom-0 left-0 shadow-lg"></div>
              </a>
          <a href="/docs/about-aomi" className="group relative overflow-hidden transition-all border hover:bg-white/10 active:scale-95 duration-300 text-xs font-medium text-white font-geist bg-white/30 rounded-full pt-3 pr-8 pb-3 pl-8 shadow-lg backdrop-blur-md">
                <span className="relative z-10">Documentation</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100"></div>
              </a>
        </div>
        <div className="animate-fade-in delay-200 transform hover:scale-[1.01] transition-all duration-1000 overflow-hidden w-full max-w-3xl rounded-[2.5rem] pt-4 pr-4 pb-4 pl-4 relative gap-x-8 gap-y-8" id="chat-transparant-padding">
          <div className="backdrop-blur-[50px] bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 border rounded-[2.5rem] ring-white/20 ring-1 pt-2 pr-2 pb-2 pl-2 absolute top-0 right-0 bottom-0 left-0 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] space-x-0 space-y-0 gap-x-4 gap-y-4">
          </div>
          <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen">
          </div>
          <div className="flex flex-col z-0 font-geist bg-[#f5f5f4] ring-stone-200 ring-1 rounded-3xl pt-6 pr-6 pb-6 pl-6 relative shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)] gap-x-4 gap-y-6">
            <WidgetFrame />
          </div>
        </div>
      </div>




      <section className="z-10 sm:py-24 pt-8 pb-8 relative" id="client-ticker">
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
              className="z-10 pointer-events-none bg-gradient-to-r from-black via-black/80 to-transparent w-20 absolute top-0 bottom-0 left-0"
              style={{ visibility: "hidden" }}
            ></div>

            {/* Animated Ticker */}
            <div className="ticker-track flex gap-16 pt-2 pb-2 gap-x-16 gap-y-16 items-center">
              {/* First set of logos */}
              <div className="flex gap-16 shrink-0 gap-x-16 gap-y-16 items-center">
                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter">TechFlow</span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-bricolage">
                    Solana
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-merriweather">
                    Ethereum
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter font-instrument-serif">
                    Delta
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-playfair">
                    CloudBase
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter">InnovateTech</span>
                </div>

                <div className="flex items-center gap-3 text-white hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter">FlowState</span>
                </div>
              </div>

              {/* Duplicate set for seamless loop */}
              <div className="flex items-center gap-16 shrink-0">
                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter">TechFlow</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-bricolage">
                    Nexus Labs
                  </span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-merriweather">
                    DataSync
                  </span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter font-instrument-serif">
                    VisionCorp
                  </span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter font-playfair">
                    CloudBase
                  </span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-normal tracking-tighter">InnovateTech</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300">
                  <span className="text-lg font-semibold tracking-tighter">FlowState</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>




      <div className="text-neutral-200 w-full relative">
      <section className="w-full border-white/20 border-t pt-10 pr-4 pb-20 pl-4 gap-x-6 gap-y-6" id="technology-section">
        <div className="flex flex-col gap-16 max-w-7xl mr-auto ml-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-6 items-start justify-between">
            <div className="max-w-2xl pl-5">
              <h2 className="leading-[1.1] md:text-5xl text-4xl text-white tracking-tight font-serif pt-10 pb-10">
                Emulate real operations
              </h2>
            </div>
            <p className="leading-relaxed text-sm font-light text-neutral-100 font-geist max-w-md mb-10 px-5">
              Aomi turns complex blockchain operations into a simple, conversational workflow. Move from idea to execution
              without the manual overhead.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 mx-8 gap-x-3   bg-[#e3d8e6] pt-8 pr-5 pb-8 pl-5">
            <div className="flex flex-col gap-8 group">
              <div className="flex select-none w-full h-48 relative perspective-1000 items-center justify-center">
                <div className="absolute bg-neutral-200 text-neutral-900 rounded-xl px-4 py-3 shadow-2xl transform -rotate-12 translate-y-2 translate-x-4 border border-white/20 z-10 w-48 flex items-center gap-3 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
                  <div className="bg-neutral-900 rounded-full p-1.5 text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h5v5" className=""></path>
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold font-geist leading-tight">Rebalance</span>
                    <span className="text-[10px] font-medium font-geist opacity-60">my Portfolio</span>
                  </div>
                </div>
                <div className="absolute bg-white text-neutral-900 rounded-xl px-4 py-3 shadow-xl transform rotate-6 -translate-y-4 -translate-x-4 border border-white/20 z-20 w-48 flex items-center gap-3 transition-transform duration-500 group-hover:rotate-3 group-hover:scale-105">
                  <div className="bg-neutral-900 rounded-full p-1.5 text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 20l10-10"></path>
                      <path d="M17 20l-10-10"></path>
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold font-geist leading-tight">Find the</span>
                    <span className="text-[10px] font-medium font-geist opacity-60">best yield</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-stone-800 font-serif text-center">Contextual Intent Sanitization</h3>
                <p className="leading-relaxed -multi text-sm font-light text-stone-600 font-geist">
                  Resolve intents through natural language and extrapolate input into a structured set of actionable
                  items. Prioritizing type-safety, Aomi converts sementic steps to sanitized machine logic, ensuring
                  deterministic execution.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-8 group">
              <div className="h-48 w-full relative flex items-end justify-center overflow-hidden">
                <svg className="w-[413px] h-[192px]" viewBox="0 0 200 120" fill="none" strokeWidth="2" style={{ width: "413px", height: "192px", color: "rgb(250, 250, 249)" }} data-icon-replaced="true">
                              <animate attributeName="stroke-dashoffset" from="0" to="30" dur="2s" repeatCount="indefinite" className=""></animate>
                  <path id="arc-outer" d="M 20 120 A 80 80 0 0 1 180 120" stroke="rgba(0,00,0,0.4)" strokeDasharray="6 3 1 4 8 2" strokeWidth="1" className="">
                  </path>
                  <path id="arc-middle" d="M 50 120 A 50 50 0 0 1 150 120" stroke="rgba(0,00,0,0.5)" strokeWidth="1" fill="none" className="">
                  </path>
                  <path id="arc-inner" d="M 80 120 A 20 20 0 0 1 120 120" stroke="rgba(0,00,0,0.5)" strokeDasharray="6 3 1 4 8 2" strokeWidth="1" fill="none" className="">
                  </path>
                  <g style={{ offsetPath: "path('M 20 120 A 80 80 0 0 1 180 120')", offsetDistance: "65%" }} className="">
                    <circle cx="0" cy="0" r="10" fill="white" stroke="rgba(0,00,0,0.3)" className=""></circle>
                    <text x="0" y="5" textAnchor="middle" fontSize="10" fontFamily="Geist" fill="black" className="">?</text>
                  </g>
                  <g style={{ offsetPath: "path('M 50 120 A 50 50 0 0 1 150 120')", offsetDistance: "30%" }} className="">
                    <circle cx="0" cy="0" r="10" fill="white" stroke="rgba(0,00,0,0.3)" className=""></circle>
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontFamily="Geist" fill="black" className="">?</text>
                  </g>
                  <g style={{ offsetPath: "path('M 80 120 A 20 20 0 0 1 120 120')", offsetDistance: "60%" }} className="">
                    <circle cx="0" cy="0" r="10" fill="white" stroke="rgba(0,00,0,0.3)" className=""></circle>
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontFamily="Geist" fill="black" className="">?</text>
                  </g>
                </svg>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-stone-800 font-serif text-center">Hierarchical Tree Synthesis</h3>
                <p className="leading-relaxed text-sm font-light text-stone-700 font-geist">
                  Intents are decomposed into a hierarchical execution tree. Aomi generates precise code block per node by
                  referencing verified, open-source smart contracts. This recursive orchestration manages dependencies
                  across multiple steps.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-8 group">
              <div className="h-48 w-full relative flex items-center justify-center">
                <svg className="w-[413px] h-[192px] top-0 right-0 bottom-0 left-0" viewBox="0 0 200 150" fill="none" strokeWidth="2" style={{ width: "413px", height: "192px", color: "rgb(250, 250, 249)" }} data-icon-replaced="true">
                              <animate attributeName="stroke-dashoffset" from="0" to="30" dur="2s" repeatCount="indefinite" className=""></animate>
                  <path d="M 0 0 Q 100 0 100 75" stroke="rgba(0,0,0,0.5)" strokeDasharray="6 3 1 4 8 2" strokeWidth="1" fill="none" className="">
                  </path>
                  <path d="M 200 0 Q 100 0 100 75" stroke="rgba(0,0,0,0.5)" strokeWidth="1" fill="none" className=""></path>
                  <path d="M 0 150 Q 100 150 100 75" stroke="rgba(0,0,0,0.5)" strokeWidth="1" fill="none" className=""></path>
                  <path d="M 200 150 Q 100 150 100 75" stroke="rgba(0,0,0,0.5)" strokeDasharray="6 3 1 4 8 2" strokeWidth="1" fill="none" className=""></path>
                </svg>
                <div className="border-black/50 border rounded-full pt-3 pr-3 pb-3 pl-3 absolute top-0 right-10">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                    <path d="M8 3 4 7l4 4"></path>
                    <path d="M4 7h16"></path>
                    <path d="m16 21 4-4-4-4"></path>
                    <path d="M20 17H4"></path>
                  </svg>
                </div><div className="group-hover:scale-105 transition-transform z-10 bg-gradient-to-r from-black/0 via-black/10 to-black/0 ring-stone-300 ring-1 
                  rounded-lg pt-2 pr-5 pb-2 pl-5 absolute shadow-lg backdrop-blur-sm [--fx-filter:blur(10px)_liquid-glass(3,10)_saturate(1.25)_noise(0.5,1,0.6)] 
                  items-center justify-center">
                  <span className="text-xs font-semibold text-stone-50 font-geist">Authorize</span>
                  <div className="absolute -bottom-4 -right-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                      <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="white" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                </div>
              </div>
                <div className="absolute -bottom-3 left-10 p-3 rounded-full border border-black/50">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                    <path d="M16 3h5v5"></path>
                    <path d="M21 3 9 15" className=""></path>
                    <path d="M21 13v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8" className=""></path>
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-stone-800 font-serif text-center">Seamless Frontend Integration</h2>
                <p className="leading-relaxed text-sm font-light text-stone-700 font-geist">Finalize the operations through concurrent stateless function calls. Aomi triggers a light-client native runtime across domains, bundling the sequence of transactions through EIP-7702, requiring only one signature to fire on-chain.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
        <section className="overflow-hidden w-full pt-10 pr-4 pb-10 pl-4 relative" id="intent">
          <div className="lg:h-[400px] z-10 h-[600px] max-w-[1400px] mr-auto ml-auto relative">
            <svg className="hidden lg:block w-full h-full absolute top-0 right-0 bottom-0 left-0" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
              <defs className="">
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.02)"></stop>
                  <stop offset="50%" stopColor="rgba(255,255,255,0.15)"></stop>
                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)"></stop>
                </linearGradient>
              </defs>
              <animate attributeName="stroke-dashoffset" from="0" to="30" dur="2s" repeatCount="indefinite" className=""></animate>
              <path d="M 180 115 L 0 115" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2">
              </path>
              <path d="M 180 115 L 340 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 0 250 L 340 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2" className="">
              </path>
              <path d="M 220 385 L 0 385" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2">
              </path>
              <path d="M 220 385 L 340 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 820 115 L 1000 115" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 820 115 L 660 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 1000 250 L 660 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 780 385 L 1000 385" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
              <path d="M 780 385 L 660 250" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="6 3 1 4 8 2"></path>
            </svg>
            <div className="flex flex-col lg:block z-10 w-full h-full relative items-center justify-center">
              <div className="lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20 text-center bg-[#9d78a8] max-w-lg pt-2 pr-2 pb-2 pl-2">
                <h2 className="md:text-5xl text-4xl text-stone-50 tracking-tight font-serif mb-6">
                  Intent-first interaction
                </h2>
                <p className="leading-relaxed text-sm font-light text-stone-50 font-geist">Traditional interfaces force you to navigate menus; we focus on what you want to achieve. By prioritizing user intent, we remove the friction between a thought and its execution.</p>
              </div>
              <div className="hidden lg:block">
                <div className="absolute top-[23%] left-[15%] -translate-x-1/2 -translate-y-1/2 group">
                  <div className="-top-1 -left-2 flex text-white/90 rounded-full absolute shadow-lg items-center justify-center scale-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" className=""></path>
                      <path d="M16 16h5v5" className=""></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-neutral-200 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Swap
              </div>
                </div>
                <div className="absolute top-[50%] left-[10%] -translate-x-1/2 -translate-y-1/2 group">
                  <div className="-top-3 -left-3 flex text-white/90 w-8 h-8 z-20 rounded-full absolute scale-150 items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign">
                      <line x1="12" x2="12" y1="2" y2="22"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-base font-normal text-neutral-50 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Buy
              </div>
                </div>
                <div className="absolute top-[75%] left-[17%] -translate-x-1/2 -translate-y-1/2 group">
                  <div className="-bottom-5 -left-4 flex text-white/90 w-8 h-8 z-20 rounded-full absolute scale-150 items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
                      <path d="m22 2-7 20-4-9-9-4Z" className=""></path>
                      <path d="M22 2 11 13"></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Send
              </div>
                </div>
                <div className="absolute top-[22%] right-[18%] translate-x-1/2 -translate-y-1/2 group">
                  <div className="absolute -top-3 right-20 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/90 scale-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layers">
                      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" className="">
                      </path>
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Assemble
              </div>
                </div>
                <div className="absolute top-[50%] right-[10%] translate-x-1/2 -translate-y-1/2 group">
                  <div className="absolute -bottom-3 -right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/90 scale-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right">
                      <path d="M8 3 4 7l4 4"></path>
                      <path d="M4 7h16"></path>
                      <path d="m16 21 4-4-4-4"></path>
                      <path d="M20 17H4"></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-neutral-50 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Exchange
              </div>
                </div>
                <div className="absolute top-[75%] right-[20%] translate-x-1/2 -translate-y-1/2 group">
                  <div className="absolute -bottom-3 -right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/90 scale-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-branch">
                      <line x1="6" x2="6" y1="3" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                  </div>
                  <div className="glass-card flex transition-all duration-300 backdrop-blur-[40px] hover:bg-white/10 cursor-default [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50 bg-white/10 border-white/20 border-0 rounded-xl ring-white/20 ring-1 pt-2 pr-4 pb-2 pl-4">
                    Route
              </div>
                </div>
              </div>
              <div className="lg:hidden w-full mt-12 grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h5v5"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Swap</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign">
                      <line x1="12" x2="12" y1="2" y2="22"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Buy</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
                      <path d="m22 2-7 20-4-9-9-4Z"></path>
                      <path d="M22 2 11 13"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white-400 font-medium">Send</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layers">
                      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z">
                      </path>
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Assemble</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right">
                      <path d="M8 3 4 7l4 4"></path>
                      <path d="M4 7h16"></path>
                      <path d="m16 21 4-4-4-4"></path>
                      <path d="M20 17H4"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Exchange</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-white/10 flex items-center justify-center text-black shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-branch">
                      <line x1="6" x2="6" y1="3" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Route</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="w-full border-white/20 border-t"></div>

      <div className="max-w-7xl mt-20 mr-auto ml-auto pr-4 pl-4">
        <section className="flex flex-col w-full max-w-7xl mr-auto mb-32 ml-auto pr-4 pl-4" id="workflow">
          <div className="backdrop-blur-[40px] overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent w-full border-white/20 border rounded-[2.5rem] ring-white/20 ring-1 mt-10 pl-12 relative shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]">
            <div className="-top-40 -right-40 blur-[120px] pointer-events-none bg-indigo-500/20 mix-blend-screen w-96 h-96 rounded-full absolute">
            </div>
            <div className="-bottom-40 -left-40 blur-[120px] pointer-events-none bg-blue-500/10 mix-blend-screen w-96 h-96 rounded-full absolute">
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-20 relative items-center">
              <div className="flex flex-col justify-between h-full">
                <div className="">
                  <div className="inline-flex bg-white/10 w-fit border-white/20 border rounded-full ring-white/10 ring-1 mt-10 mb-6 pt-1 pr-3 pb-1 pl-3 backdrop-blur-md items-center">
                    <span className="text-[10px] uppercase font-semibold text-white tracking-wider font-geist mt-1 mb-1">Workflow</span>
                  </div>
                  <h2 className="md:text-5xl text-4xl text-white tracking-tight font-serif mb-2">
                    From intent to
                    <span className="italic text-white/70">implementation.</span>
                  </h2>
                  <p className="text-base font-light text-neutral-50 font-geist mb-10">
                    A seamless partnership model designed for the agentic
                    future.
                  </p>
                  <div className="relative pl-2">
                    <div className="absolute left-[11px] top-3 bottom-8 w-px bg-gradient-to-b from-indigo-500/50 via-white/10 to-transparent">
                    </div>
                    <div className="flex flex-col gap-10 gap-x-10 gap-y-10">
                      <div className="relative flex gap-6 items-start group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border border-indigo-500/50 bg-[#1c1917] z-10 relative mt-1 shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center ring-1 ring-indigo-500/20">
                          <div className="bg-[#9D77A8] w-2 h-2 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="transition-colors duration-300 text-lg font-semibold text-white font-geist group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#ec6b83] group-hover:to-[#733e83]">
                            Consultation &amp; Strategy
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-neutral-50 font-geist mt-2">
                            Contact us to define how we can support your
                            business with AI automation for on-chain
                            transactions, whether you're building AI x crypto
                            projects, onchain agents, or enhancing UX with
                            chat interfaces.
                          </p>
                        </div>
                      </div>
                      <div className="flex group relative gap-x-6 gap-y-6 items-start">
                        <div className="flex-shrink-0 group-hover:border-transparent transition-colors duration-300 flex bg-[#1c1917] w-6 h-6 z-10 border-white/20 border rounded-full mt-1 relative shadow-inner items-center justify-center">
                          <div className="transition-colors duration-300 bg-neutral-600 w-2 h-2 rounded-full group-hover:bg-gradient-to-r group-hover:from-[#ec6b83] group-hover:to-[#733e83]">
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white font-geist transition-colors duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#ec6b83] group-hover:to-[#733e83]">
                            Custom Build
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-stone-50 font-geist mt-2">
                            We build customized AI applications integrating
                            your APIs and tools, seamlessly deployed within
                            your existing infrastructure.
                          </p>
                        </div>
                      </div>
                      <div className="relative flex gap-6 items-start group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border border-white/20 bg-[#1c1917] z-10 relative mt-1 group-hover:border-transparent transition-colors duration-300 flex items-center justify-center shadow-inner">
                          <div className="w-2 h-2 rounded-full bg-neutral-600 transition-colors duration-300 group-hover:bg-gradient-to-r group-hover:from-[#ec6b83] group-hover:to-[#733e83]">
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white font-geist transition-colors duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#ec6b83] group-hover:to-[#733e83]">
                            Managed Orchestration
                          </h3>
                          <p className="leading-relaxed text-sm font-light text-neutral-50 font-geist mt-2">
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
                  <a href="/docs/about-aomi" className="overflow-hidden group transition-all flex items-center gap-2 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 text-xs font-semibold text-neutral-900 font-geist bg-white/90 w-fit rounded-full pt-3 pr-6 pb-3 pl-6 relative shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    <span className="z-10 flex items-center gap-2 relative">Documentation</span>
                    <div className="bg-gradient-to-tr from-white via-neutral-100 to-neutral-200 opacity-100 absolute top-0 right-0 bottom-0 left-0">
                    </div>
                  </a>
                </div>
              </div>
              <div className="lg:mt-0 flex flex-col h-full min-h-[420px] mt-0 relative justify-between">
                                <div className="transition-opacity duration-500 bg-center opacity-100 bg-[url(/assets/workflow-bg.jpg)] bg-cover absolute top-0 right-0 bottom-0 left-0">
                                </div>
              </div>
            </div>
          </div>
        </section>
  <section className="pb-20" id="resources">
    <div className="grid grid-cols-1 md:grid-cols-2 mx-5 text-stone-50 relative">
        <div className="group flex flex-col">
            <h2 className="md:text-4xl font-normal text-white font-pt-serif mb-10">
        AI infrastructure Hosting
      </h2>
      <div className="bg-[#e3d8e6] ml-5 mr-10 pt-10 pr-10 pl-10">
          <div className="flex flex-col gap-y-5">
            <p className="leading-relaxed text-sm font-light text-stone-700 font-geist">
              Aomi provides a serverless backend for the agentic lifecycle,
              functioning as a high-performance “Amazon Lambda for Agents.”
              Eliminate the overhead of managing Python or TypeScript frameworks
              like LangChain or AI SDK. Simply select your model, configure your
              system prompts, and define your tools.
            </p>
            <p className="font-geist text-sm font-light leading-relaxed text-stone-700">
              Our proprietary Rust framework is engineered to be stateless and
              concurrent, executing agentic loops at native speed. Aomi handles
              deployment, scaling, and lifecycle management for production-grade
              workloads.
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
            <g fill="rgba(0,0,0,0.9)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6">
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
      <div className="group flex flex-col">
          <div className="bg-[#e3d8e6] ml-10 mr-5 pt-5 pr-10 pb-10 pl-10">
        <div className="overflow-hidden backdrop-blur-[40px] bg-neutral-600 border-stone-400/20 border  rounded-[2rem] mt-5 mb-10 pr-5 pl-8 relative shadow-[0px_0px_0px_1px_rgba(0,0,0,0.12),0px_1px_1px_-0.5px_rgba(0,0,0,0.12),0px_3px_3px_-1.5px_rgba(0,0,0,0.12),0px_6px_6px_-3px_rgba(0,0,0,0.12),0px_12px_12px_-6px_rgba(0,0,0,0.12),0px_24px_24px_-12px_rgba(0,0,0,0.12)]">
          <p className="text-sm font-light text-stone-200 font-space-mono mt-2 mb-2">$ pnpm install @aomi-labs/react</p><p className="text-sm font-light text-stone-200 font-space-mono mb-2">$ npx shadcn add @aomi/aomi-frame</p>
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
                                  <h3 className="md:text-4xl font-normal text-stone-50 font-pt-serif text-right mt-20 absolute right-0">
                                    Seamless frontend integration
                                  </h3>
      </div>
      </div>
    </div></section></div>



    <section id="faq" className="border-white/20 border-t pt-20 pr-4 pb-10 pl-4 w-full">
        <div className="mr-auto ml-auto max-w-4xl text-center">
          <div>
            <h2 className="mt-1 mb-15 text-3xl md:text-4xl tracking-tight font-serif font-medium text-white">
              FAQ
            </h2>
          </div>

          <div className="mt-10 divide-y divide-white/10 rounded-[2rem] border border-white/10 bg-white/[0.03] text-left backdrop-blur-[40px] ring-1 ring-white/10 overflow-hidden mx-auto">
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
            <a href="https://calendly.com/cecilia-foameo/30min" target="_blank" rel="noreferrer" className="group overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 flex text-xs font-semibold text-stone-50 font-geist bg-gradient-to-r from-[#733e83] to-[#ec6b83] ring-1 rounded-full pt-3 pr-8 pb-3 pl-8 relative shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] [--fx-filter:blur(10px)_liquid-glass(1.9,10)_saturate(1.25)_noise(0.5,1,0)] items-center">
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
    </main>
<style>{`
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Geist:wght@300;400;500;600;700&family=PT+Serif:wght@400;700&display=swap");
html {
  scroll-behavior: smooth;
}
.font-serif {
  font-family: "Playfair Display", serif;
}
.font-sans {
  font-family: "Inter", sans-serif;
}
.font-geist {
  font-family: "Geist", "Inter", sans-serif;
}
.font-pt-serif {
  font-family: "PT Serif", serif;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.delay-100 {
  animation-delay: 100ms;
}
.delay-200 {
  animation-delay: 200ms;
}
.delay-300 {
  animation-delay: 300ms;
}
@keyframes flow {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}
.animate-flow {
  animation: flow 3s linear infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}
.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 3s;
}
.liquid-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.1),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
}
.perspective-1000 {
  perspective: 1000px;
}
`}</style>
    </div>
  );
}
