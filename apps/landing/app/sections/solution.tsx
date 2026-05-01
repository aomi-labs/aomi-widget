"use client";

import { useEffect } from "react";

export function Solution() {
  useEffect(() => {
    let cancelled = false;

    if (typeof (window as any).UnicornStudio?.init === "function") {
      (window as any).UnicornStudio.init();
      return;
    }

    (window as any).UnicornStudio = { isInitialized: false };
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
    script.onload = () => {
      if (
        !cancelled &&
        (window as any).UnicornStudio &&
        !(window as any).UnicornStudio.isInitialized
      ) {
        (window as any).UnicornStudio.init();
        (window as any).UnicornStudio.isInitialized = true;
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <>
      <div className="w-full bg-stone-100">
        <section
          className="mr-auto mb-16 ml-auto flex w-full max-w-7xl flex-col px-4"
          id="workflow"
          data-animate="up"
          data-delay="200"
        >
          <div className="relative w-full overflow-hidden rounded-[2.5rem] pl-12">
            <div className="relative grid grid-cols-1 items-center lg:grid-cols-2 lg:gap-20">
              <div className="flex h-full flex-col justify-between">
                <div>
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
                    <div className="flex flex-col gap-10">
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
      </div>
    </>
  );
}
