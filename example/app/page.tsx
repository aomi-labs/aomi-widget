 "use client";

import { useState } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { WalletFooter } from "@/components/wallet";

const highlights = [
  "Ship a full-stack, LLM-ready onchain assistant in one import.",
  "Guided UX powered by @assistant-ui + Radix primitives.",
  "Secure transaction automation with your backend guardrails.",
];

const features = [
  {
    title: "Natural language to transactions",
    body: "Let users describe intents while we translate to safe transaction flows with inline confirmations.",
  },
  {
    title: "Wallet friendly",
    body: "Built-in wallet footer keeps balances and network context close, no extra wiring needed.",
  },
  {
    title: "Themeable",
    body: "Use your Tailwind tokens or CSS variables to make AomiFrame feel native to your product.",
  },
];

const steps = [
  "Install the widget library from npm.",
  "Wrap your app in the provided providers (already wired here).",
  "Drop <AomiFrame /> anywhere you want the AI assistant to live.",
];

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const frameHeight = "640px";
  const containerWidthClass = isExpanded ? "max-w-8xl" : "max-w-7xl";

  return (
    <main className="relative min-h-screen bg-[#05060f] text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(80,134,255,0.14),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(94,234,212,0.12),transparent_40%),radial-gradient(circle_at_60%_70%,rgba(236,72,153,0.12),transparent_38%)]" />

      <div
        className={`relative mx-auto flex w-full ${containerWidthClass} flex-col gap-16 px-10 sm:px-16 xl:px-24 py-14 sm:py-18 lg:py-20 transition-[max-width] duration-200`}
      >
        <section className="grid items-center gap-10 rounded-3xl border border-white/5 bg-white/5 px-6 py-10 shadow-[0_24px_80px_rgba(5,6,15,0.55)] backdrop-blur-md lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-12">
          <div className="ml-5 mr-3 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
              Aomi Widget · React
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
                Natural language meets onchain automation.
              </h1>
              <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
                Embed our conversational agent anywhere in your product to help users inspect assets, craft and simulate
                transactions, and execute with guardrails. No iframe needed—drop the React component and ship.
              </p>
            </div>

            <ul className="grid gap-2 text-sm text-slate-200">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                href="https://www.npmjs.com/package/@aomi-labs/widget-lib"
                target="_blank"
                rel="noreferrer"
              >
                npm i @aomi-labs/widget-lib
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:text-emerald-100"
                href="https://github.com/aomi-labs"
                target="_blank"
                rel="noreferrer"
              >
                View docs
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-emerald-400/10 via-blue-500/8 to-fuchsia-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-slate-300">
                <span>Live widget preview</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/35 hover:bg-white/10"
                  >
                    {isExpanded ? "Desktop" : "Mobil"}
                  </button>
                </div>
              </div>
              <div
                className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 pb-5 pt-4 sm:px-6"
                style={{
                  transition: "height 180ms ease, max-height 180ms ease",
                }}
              >
                <div
                  className="aomi-frame-embed text-slate-900"
                  data-mode={isExpanded ? "desktop" : "mobile"}
                >
                  <AomiFrame
                    height={frameHeight} 
                    width="100%"
                    walletFooter={(props) => <WalletFooter {...props} />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
              Why AomiFrame
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Purpose-built for AI + onchain</h2>
            <p className="mt-3 text-sm text-slate-200 sm:text-base">
              We designed the widget to replace the old iframe demo: same quick theme control, now with native React,
              faster hydration, and simpler integration.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-emerald-500/5"
                >
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-200">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
              Three steps
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Embed in minutes</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-200 sm:text-base">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-semibold text-emerald-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-emerald-100 shadow-inner shadow-emerald-500/10 sm:text-sm">
              <div className="flex items-center justify-between pb-2 text-[0.78rem] uppercase tracking-[0.16em] text-slate-300">
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`import { AomiFrame } from "@aomi-labs/widget-lib";

export function AIWallet() {
  return (
    <AomiFrame height="640px" width="100%">
      {/* optional slots like WalletSystemMessenger */}
    </AomiFrame>
  );
}`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
