export function Technology() {
  return (
    <>
      <div className="text-neutral-200 w-full relative">
      <div className="w-full border-white/20 border-t"> </div>
      <section className="js-animate overflow-hidden w-full pt-10 pr-4 pb-10 pl-4 relative" id="intent" data-animate="right" data-delay="50">
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
              <div className="lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20 text-center  max-w-lg pt-2 pr-2 pb-2 pl-2">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-neutral-200">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-base font-normal text-neutral-50">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-neutral-50">
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
                  <div className="glass-card [--fx-filter:blur(10px)_liquid-glass(1.8,10)_saturate(1.25)_noise(0.5,1,0.5)] text-sm font-normal text-stone-50">
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

      <section className="w-full pr-4 pb-20 pl-4 gap-x-6 gap-y-6" id="technology-section">
        <div className="flex flex-col gap-16 max-w-7xl mr-auto ml-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-6 items-start justify-between">
            <div className="max-w-2xl pl-5">
              <h2 className="leading-[1.1] md:text-5xl text-4xl text-white tracking-tight font-serif pl-10 pt-10 pb-10">
                Emulate real operations
              </h2>
            </div>
            <p className="leading-relaxed text-sm font-light text-neutral-100 font-geist max-w-md mb-10 pr-15">
              Aomi turns complex blockchain operations into a simple, conversational workflow. Move from idea to execution
              without the manual overhead.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 mx-8">
            <div className="js-animate flex flex-col gap-8 group bg-[#e3d8e6] border border-white pt-8 pr-5 pb-8 pl-5" data-animate="up" data-delay="50">
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
            <div className="js-animate flex flex-col gap-8 group bg-[#e3d8e6] border border-white pt-8 pr-5 pb-8 pl-5" data-animate="up" data-delay="150">
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
            <div className="js-animate flex flex-col gap-8 group bg-[#e3d8e6] border border-white pt-8 pr-5 pb-8 pl-5" data-animate="up" data-delay="300">
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
      </div>
    </>
  );
}
