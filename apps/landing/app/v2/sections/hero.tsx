"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { hero, logoCloud } from "../copy";
import styles from "../v2.module.css";
import { AgentPanel } from "./agent-panel";

const HumanDemo = dynamic(
  () => import("./human-demo").then((mod) => mod.HumanDemo),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[520px] w-full max-w-[1040px] items-center justify-center rounded-2xl border border-[color:var(--v2-border)] bg-[color:var(--v2-card)] md:h-[590px]"
        data-testid="human-demo"
        aria-busy="true"
        aria-label="Loading Aomi demo"
      >
        <span className={`${styles.ui} text-sm text-[color:var(--v2-fg)]`}>
          Loading demo…
        </span>
      </div>
    ),
  },
);

export function V2Hero() {
  const [audienceMode, setAudienceMode] = useState<"human" | "agent">("human");

  return (
    <section className="relative bg-[color:var(--v2-bg)] text-[color:var(--v2-heading)]">
      <div className="relative overflow-hidden text-white">
        <div
          className={`${styles.heroLandscapePhoto} absolute inset-0 bg-cover bg-center opacity-90`}
          style={{ backgroundImage: 'url("/assets/hero-landscape.jpg")' }}
          aria-hidden
        />
        <div className={styles.heroUpperScrim} aria-hidden />
        <div className={styles.heroWhiteFade} aria-hidden />

        <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-5 pt-16 pb-32 md:px-8 md:pt-20 md:pb-40">
          <p className={`${styles.eyebrow} ${styles.eyebrowInvert}`}>
            {hero.eyebrow}
          </p>

          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 pt-6 text-center md:pt-8">
            <h1 className={`${styles.display} ${styles.onPhoto} max-w-[760px]`}>
              {hero.headline}
            </h1>
            <p className={`${styles.lede} ${styles.ledeOnPhoto} max-w-[640px]`}>
              {hero.support}
            </p>
          </div>

          <div
            className={`${styles.heroControls} mx-auto mt-0 flex max-w-[1100px] flex-col items-center gap-8 pt-10 pb-1 md:pt-12`}
          >
            <div className={styles.heroControlsScrim} aria-hidden />
            <div className={styles.logoMarquee}>
              <div className={styles.logoMarqueeTrack}>
                {[0, 1, 2, 3].map((copy) => (
                  <div
                    key={copy}
                    className={
                      copy > 0
                        ? `${styles.logoMarqueeGroup} ${styles.logoMarqueeDuplicate}`
                        : styles.logoMarqueeGroup
                    }
                    aria-hidden={copy > 0}
                  >
                    {logoCloud.map((logo) => (
                      <div
                        key={`${copy}-${logo.name}`}
                        className="flex shrink-0 items-center gap-2.5"
                      >
                        <img
                          src={logo.src}
                          alt=""
                          width={28}
                          height={28}
                          className={`h-7 w-7 shrink-0 object-contain ${styles.logoMark}`}
                        />
                        <span className={`${styles.ui} whitespace-nowrap text-[14px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]`}>
                          {logo.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="relative z-20 flex h-10 w-full max-w-[316px] rounded-full border border-white/35 bg-black/30 p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md"
              data-testid="audience-toggle"
            >
              <div
                className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white transition-transform duration-200 ease-out ${audienceMode === "human" ? "translate-x-0" : "translate-x-full"}`}
              />
              <button
                type="button"
                onClick={() => setAudienceMode("human")}
                className={`${styles.ui} relative z-10 h-full flex-1 rounded-full px-5 text-xs transition-colors ${audienceMode === "human" ? "text-zinc-900" : "text-white/90 hover:text-white"}`}
                aria-pressed={audienceMode === "human"}
              >
                I&apos;m a human
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("agent")}
                className={`${styles.ui} relative z-10 h-full flex-1 rounded-full px-5 text-xs transition-colors ${audienceMode === "agent" ? "text-zinc-900" : "text-white/90 hover:text-white"}`}
                aria-pressed={audienceMode === "agent"}
              >
                I&apos;m an Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-5 pt-0 pb-[72px] md:px-8 md:pb-[88px]">
        <div
          key={audienceMode}
          className={`flex w-full justify-center ${styles.panelIn}`}
        >
          {audienceMode === "human" ? <HumanDemo /> : <AgentPanel />}
        </div>
      </div>
    </section>
  );
}
