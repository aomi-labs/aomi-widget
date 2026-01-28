export function Technology() {
  return (
    <>
      <div className="relative w-full bg-stone-100 text-stone-800">
        <section
          className="js-animate relative w-full overflow-hidden bg-stone-100 pr-4 pb-10 pl-4"
          id="intent"
          data-animate="right"
          data-delay="50"
        >
          <div className="relative z-10 mr-auto ml-auto h-[600px] max-w-[1400px] lg:h-[400px]">
            <svg
              className="absolute top-0 right-0 bottom-0 left-0 hidden h-full w-full lg:block"
              viewBox="-100 0 1200 500"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs className="">
                <linearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="rgba(68,64,60,0.02)"></stop>
                  <stop offset="50%" stopColor="rgba(68,64,60,0.15)"></stop>
                  <stop offset="100%" stopColor="rgba(68,64,60,0.02)"></stop>
                </linearGradient>
              </defs>
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="30"
                dur="2s"
                repeatCount="indefinite"
                className=""
              ></animate>
              <path
                d="M 180 115 L -100 115"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 180 115 L 340 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M -100 250 L 340 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
                className=""
              ></path>
              <path
                d="M 220 385 L -100 385"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 220 385 L 340 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 820 115 L 1100 115"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 820 115 L 660 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 1100 250 L 660 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 780 385 L 1100 385"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
              <path
                d="M 780 385 L 660 250"
                stroke="rgba(68,64,60,0.5)"
                strokeWidth="1"
                strokeDasharray="6 3 1 4 8 2"
              ></path>
            </svg>
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center lg:block">
              <div className="z-20 max-w-lg pt-2 pr-2 pb-2 pl-2 text-center lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
                <h2 className="mb-6 font-serif text-4xl tracking-tight text-stone-800 md:text-5xl">
                  Intent-first interaction
                </h2>
                <p className="font-geist text-sm leading-relaxed font-light text-stone-600">
                  Traditional interfaces force you to navigate menus; we focus
                  on what you want to achieve. By prioritizing user intent, we
                  remove the friction between a thought and its execution.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="group absolute top-[23%] left-[15%] -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -top-1 -left-2 flex scale-150 items-center justify-center rounded-full text-stone-700 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-refresh-ccw"
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path
                        d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"
                        className=""
                      ></path>
                      <path d="M16 16h5v5" className=""></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Swap
                  </div>
                </div>
                <div className="group absolute top-[50%] left-[10%] -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -top-3 -left-3 z-20 flex h-8 w-8 scale-150 items-center justify-center rounded-full text-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-dollar-sign"
                    >
                      <line x1="12" x2="12" y1="2" y2="22"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Buy
                  </div>
                </div>
                <div className="group absolute top-[75%] left-[17%] -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -bottom-5 -left-4 z-20 flex h-8 w-8 scale-150 items-center justify-center rounded-full text-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-send"
                    >
                      <path d="m22 2-7 20-4-9-9-4Z" className=""></path>
                      <path d="M22 2 11 13"></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Send
                  </div>
                </div>
                <div className="group absolute top-[22%] right-[18%] translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -top-3 right-20 z-20 flex h-8 w-8 scale-150 items-center justify-center rounded-full text-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-layers"
                    >
                      <path
                        d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
                        className=""
                      ></path>
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Assemble
                  </div>
                </div>
                <div className="group absolute top-[50%] right-[10%] translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -right-3 -bottom-3 z-20 flex h-8 w-8 scale-150 items-center justify-center rounded-full text-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-left-right"
                    >
                      <path d="M8 3 4 7l4 4"></path>
                      <path d="M4 7h16"></path>
                      <path d="m16 21 4-4-4-4"></path>
                      <path d="M20 17H4"></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Exchange
                  </div>
                </div>
                <div className="group absolute top-[75%] right-[20%] translate-x-1/2 -translate-y-1/2">
                  <div className="absolute -right-3 -bottom-3 z-20 flex h-8 w-8 scale-150 items-center justify-center rounded-full text-stone-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-git-branch"
                    >
                      <line x1="6" x2="6" y1="3" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                  </div>
                  <div className="border-stone rounded-full border-0 bg-stone-100 py-2 pr-3 pl-3 text-sm font-semibold text-stone-800 shadow-md ring-1 ring-stone-200">
                    Route
                  </div>
                </div>
              </div>
              <div className="mt-12 grid w-full grid-cols-2 gap-6 md:grid-cols-3 lg:hidden">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-refresh-ccw"
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h5v5"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Swap
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-dollar-sign"
                    >
                      <line x1="12" x2="12" y1="2" y2="22"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Buy
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-send"
                    >
                      <path d="m22 2-7 20-4-9-9-4Z"></path>
                      <path d="M22 2 11 13"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Send
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-layers"
                    >
                      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"></path>
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Assemble
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-left-right"
                    >
                      <path d="M8 3 4 7l4 4"></path>
                      <path d="M4 7h16"></path>
                      <path d="m16 21 4-4-4-4"></path>
                      <path d="M20 17H4"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Exchange
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-800 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-git-branch"
                    >
                      <line x1="6" x2="6" y1="3" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-stone-800">
                    Route
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="w-full gap-x-6 gap-y-6 bg-stone-100 pr-4 pb-20 pl-4"
          id="technology-section"
        >
          <div className="mr-auto ml-auto flex max-w-7xl flex-col gap-16">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end md:items-start">
              <div className="max-w-2xl px-4 md:px-5">
                <h2 className="pl-12 font-serif text-4xl leading-[1.1] tracking-tight text-stone-800 md:text-4xl">
                  AI Engineering meets
                  <br className="hidden md:block" />
                  <span className="text-stone-600 italic md:pl-12">
                    Simulation Guardrails
                  </span>
                </h2>
              </div>
              <p className="font-geist max-w-md px-4 pl-10 text-sm leading-relaxed font-light text-stone-600 md:px-0 md:pt-5 md:pr-20 md:text-right">
                The value of blockchains to AI is verifiable settlement outcome.
                Aomi brings that to the forefront.
              </p>
            </div>
            <div className="mx-8 grid grid-cols-1 overflow-hidden rounded-[2rem] md:grid-cols-3">
              <div
                className="js-animate group flex flex-col gap-8 bg-[#e3d8e6] pt-8 pr-5 pb-8 pl-5"
                data-animate="up"
                data-delay="50"
              >
                <div className="perspective-1000 relative flex h-48 w-full items-center justify-center select-none">
                  <div className="absolute z-10 flex w-48 translate-x-4 translate-y-2 -rotate-12 transform items-center gap-3 rounded-xl border border-white/20 bg-neutral-200 px-4 py-3 text-neutral-900 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-6">
                    <div className="rounded-full bg-neutral-900 p-1.5 text-white">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className=""
                      >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                        <path d="M16 16h5v5" className=""></path>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-geist text-[10px] leading-tight font-bold">
                        Rebalance
                      </span>
                      <span className="font-geist text-[10px] font-medium opacity-60">
                        my Portfolio
                      </span>
                    </div>
                  </div>
                  <div className="absolute z-20 flex w-48 -translate-x-4 -translate-y-4 rotate-6 transform items-center gap-3 rounded-xl bg-white px-4 py-3 text-neutral-900 shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                    <div className="rounded-full bg-neutral-900 p-1.5 text-white">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 20l10-10"></path>
                        <path d="M17 20l-10-10"></path>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-geist text-[10px] leading-tight font-bold">
                        USDC
                      </span>
                      <span className="font-geist text-[10px] font-medium opacity-60">
                        10% yield
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="font-geist text-center text-lg font-light text-stone-800">
                    Contextual Intent Sanitization
                  </h3>
                  <p className="-multi font-geist px-5 text-sm leading-relaxed font-light text-stone-600">
                    Our conversational UX bridges the gap between natural
                    language and structured action. By mapping semantic steps to
                    type-safe, sanitized logic, Aomi ensures every interaction
                    results in predictable, deterministic execution.
                  </p>
                </div>
              </div>
              <div
                className="js-animate group flex flex-col gap-8 bg-[#e3d8e6] pt-8 pr-5 pb-8 pl-5"
                data-animate="up"
                data-delay="150"
              >
                <div className="relative flex h-48 w-full items-end justify-center overflow-hidden">
                  <svg
                    className="h-[192px] w-[413px]"
                    viewBox="0 0 200 120"
                    fill="none"
                    strokeWidth="2"
                    style={{
                      width: "413px",
                      height: "192px",
                      color: "rgb(250, 250, 249)",
                    }}
                    data-icon-replaced="true"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="30"
                      dur="2s"
                      repeatCount="indefinite"
                      className=""
                    ></animate>
                    <path
                      id="arc-outer"
                      d="M 20 120 A 80 80 0 0 1 180 120"
                      stroke="rgba(0,00,0,0.4)"
                      strokeDasharray="6 3 1 4 8 2"
                      strokeWidth="1"
                      className=""
                    ></path>
                    <path
                      id="arc-middle"
                      d="M 50 120 A 50 50 0 0 1 150 120"
                      stroke="rgba(0,00,0,0.5)"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                    <path
                      id="arc-inner"
                      d="M 80 120 A 20 20 0 0 1 120 120"
                      stroke="rgba(0,00,0,0.5)"
                      strokeDasharray="6 3 1 4 8 2"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                    <g
                      style={{
                        offsetPath: "path('M 20 120 A 80 80 0 0 1 180 120')",
                        offsetDistance: "65%",
                      }}
                      className=""
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="white"
                        stroke="rgba(0,00,0,0.3)"
                        className=""
                      ></circle>
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="Geist"
                        fill="black"
                        className=""
                      >
                        ?
                      </text>
                    </g>
                    <g
                      style={{
                        offsetPath: "path('M 50 120 A 50 50 0 0 1 150 120')",
                        offsetDistance: "30%",
                      }}
                      className=""
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="white"
                        stroke="rgba(0,00,0,0.3)"
                        className=""
                      ></circle>
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="Geist"
                        fill="black"
                        className=""
                      >
                        ?
                      </text>
                    </g>
                    <g
                      style={{
                        offsetPath: "path('M 80 120 A 20 20 0 0 1 120 120')",
                        offsetDistance: "60%",
                      }}
                      className=""
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="white"
                        stroke="rgba(0,00,0,0.3)"
                        className=""
                      ></circle>
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="Geist"
                        fill="black"
                        className=""
                      >
                        ?
                      </text>
                    </g>
                  </svg>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="font-geist text-center text-lg font-light text-stone-800">
                    Hierarchical Tree Synthesis
                  </h3>
                  <p className="font-geist px-5 text-sm leading-relaxed font-light text-stone-700">
                    Intents resolve into a hierarchical execution tree where
                    Aomi generates targeted code blocks based on cached,
                    verified contracts. By utilizing recursive orchestration,
                    the system automatically handles complex dependency mapping
                    and execution flow.
                  </p>
                </div>
              </div>
              <div
                className="js-animate group flex flex-col gap-8 bg-[#e3d8e6] pt-8 pr-5 pb-8 pl-5"
                data-animate="up"
                data-delay="300"
              >
                <div className="relative flex h-48 w-full items-center justify-center">
                  <svg
                    className="top-0 right-0 bottom-0 left-0 h-[192px] w-[413px]"
                    viewBox="0 0 200 150"
                    fill="none"
                    strokeWidth="2"
                    style={{
                      width: "413px",
                      height: "192px",
                      color: "rgb(250, 250, 249)",
                    }}
                    data-icon-replaced="true"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="30"
                      dur="2s"
                      repeatCount="indefinite"
                      className=""
                    ></animate>
                    <path
                      d="M 0 0 Q 100 0 100 75"
                      stroke="rgba(0,0,0,0.5)"
                      strokeDasharray="6 3 1 4 8 2"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                    <path
                      d="M 200 0 Q 100 0 100 75"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                    <path
                      d="M 0 150 Q 100 150 100 75"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                    <path
                      d="M 200 150 Q 100 150 100 75"
                      stroke="rgba(0,0,0,0.5)"
                      strokeDasharray="6 3 1 4 8 2"
                      strokeWidth="1"
                      fill="none"
                      className=""
                    ></path>
                  </svg>
                  <div className="absolute top-0 right-10 rounded-full border border-black/50 pt-3 pr-3 pb-3 pl-3">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-black"
                    >
                      <path d="M8 3 4 7l4 4"></path>
                      <path d="M4 7h16"></path>
                      <path d="m16 21 4-4-4-4"></path>
                      <path d="M20 17H4"></path>
                    </svg>
                  </div>
                  <div className="absolute z-10 items-center justify-center rounded-full bg-gradient-to-r from-black/10 via-black/20 to-black/10 pt-1 pr-5 pb-2 pl-5 shadow-lg ring-0 ring-stone-200 backdrop-blur-sm transition-transform [--fx-filter:blur(10px)_liquid-glass(3,10)_saturate(1.25)_noise(0.5,1,0.6)] group-hover:scale-105">
                    <span className="font-geist text-xs font-bold text-white">
                      Authorize
                    </span>
                    <div className="absolute -right-3 -bottom-4">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className=""
                      >
                        <path
                          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                          fill="white"
                          stroke="#1c1917"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute -bottom-3 left-10 rounded-full border border-black/50 p-3">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-black"
                    >
                      <path d="M16 3h5v5"></path>
                      <path d="M21 3 9 15" className=""></path>
                      <path
                        d="M21 13v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8"
                        className=""
                      ></path>
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="font-geist text-center text-lg font-light text-stone-800">
                    Batched Simulation & Execution
                  </h2>
                  <p className="font-geist px-5 text-sm leading-relaxed font-light text-stone-700">
                    With our stateless runtime for concurrent simulation, Aomi
                    invokes native light-client across domains. By bundling
                    transactions with EIP-7702, we collapses complex multi-step
                    operations into a single-signature on-chain execution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
