"use client";

import { useEffect, useRef, useState } from "react";
import { caseStudy } from "../copy";
import styles from "../v2.module.css";
import { Reveal } from "./reveal";

const CHIP = {
  somm: styles.sommChipSomm,
  blue: styles.sommChipBlue,
  indigo: styles.sommChipIndigo,
  green: styles.sommChipGreen,
  muted: styles.sommChipMuted,
} as const;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SommMark({ size = 46 }: { size?: number }) {
  return (
    <span
      className={styles.sommMark}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i % 3) * 50}%`,
            top: `${Math.floor(i / 3) * 50}%`,
          }}
        />
      ))}
    </span>
  );
}

function Cube({ accent = false }: { accent?: boolean }) {
  const stroke = accent ? "#09090b" : "#5288c2";
  const top = accent ? "#eef2f8" : "#e2eef8";
  const side = accent ? "#f4f4f5" : "#f1f7fc";
  return (
    <svg
      className={accent ? styles.sommCubeAccent : styles.sommCube}
      viewBox="0 0 100 110"
      aria-hidden
    >
      <polygon
        points="50,2 95,27 95,79 50,104 5,79 5,27"
        fill="#fff"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <polygon
        points="50,2 95,27 50,52 5,27"
        fill={top}
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <polygon
        points="50,52 95,27 95,79 50,104"
        fill={side}
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {accent ? (
        <g transform="translate(40,58)">
          {[0, 1, 2].flatMap((y) =>
            [0, 1, 2].map((x) => (
              <circle
                key={`${x}-${y}`}
                cx={x * 10}
                cy={y * 10}
                r="4.2"
                fill="#e5544a"
              />
            )),
          )}
        </g>
      ) : null}
    </svg>
  );
}

function SurfacesCard() {
  const { surfaces } = caseStudy;
  const [active, setActive] = useState(0);
  const reduced = useRef(true);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
    if (reduced.current) {
      setActive(0);
      return;
    }
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % surfaces.chips.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [surfaces.chips.length]);

  return (
    <article className={`${styles.card} p-5`}>
      <p className={styles.sommStep}>
        04 · one runtime,{" "}
        <span className={styles.sommStepAccent}>every surface</span>
      </p>
      <div className="mt-5 flex flex-col items-start gap-2.5">
        {surfaces.chips.map((chip, index) => {
          const isActive = active === index;
          return (
            <span
              key={chip.label}
              className={`${styles.sommChip} ${CHIP[chip.tone]} ${
                isActive ? styles.sommChipActive : styles.sommChipIdle
              }`}
            >
              <span className={styles.sommChipDot} />
              {chip.label}
            </span>
          );
        })}
      </div>
      <p className="mt-5 text-[13px] leading-[1.55] text-[color:var(--v2-fg)]">
        {surfaces.note}
      </p>
    </article>
  );
}

type VaultPhase = {
  user: boolean;
  t1: boolean;
  t1Done: boolean;
  t2: boolean;
  t2Done: boolean;
  box: boolean;
  boxDone: boolean;
  r1: boolean;
  r2: boolean;
  r3: boolean;
  batched: boolean;
  fin: boolean;
  press: boolean;
  signed: boolean;
};

const VAULT_IDLE: VaultPhase = {
  user: false,
  t1: false,
  t1Done: false,
  t2: false,
  t2Done: false,
  box: false,
  boxDone: false,
  r1: false,
  r2: false,
  r3: false,
  batched: false,
  fin: false,
  press: false,
  signed: false,
};

const VAULT_COMPLETE: VaultPhase = {
  user: true,
  t1: true,
  t1Done: true,
  t2: true,
  t2Done: true,
  box: true,
  boxDone: true,
  r1: true,
  r2: true,
  r3: true,
  batched: true,
  fin: true,
  press: false,
  signed: true,
};

function VaultCard() {
  const { vault } = caseStudy;
  const [phase, setPhase] = useState<VaultPhase>(VAULT_IDLE);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };

    if (prefersReducedMotion()) {
      setPhase(VAULT_COMPLETE);
      return clear;
    }

    const at = (ms: number, patch: Partial<VaultPhase>) => {
      timers.current.push(
        window.setTimeout(() => {
          setPhase((prev) => ({ ...prev, ...patch }));
        }, ms),
      );
    };

    const run = () => {
      clear();
      setPhase(VAULT_IDLE);
      at(400, { user: true });
      at(1300, { t1: true });
      at(2200, { t1Done: true });
      at(2500, { t2: true });
      at(3400, { t2Done: true });
      at(3900, { box: true });
      at(4500, { r1: true });
      at(5000, { r2: true });
      at(5500, { r3: true });
      at(6300, { boxDone: true, batched: true });
      at(7100, { fin: true });
      at(8300, { press: true });
      at(8700, { press: false, signed: true });
    };

    run();
    const loop = window.setInterval(run, 11500);
    return () => {
      clear();
      window.clearInterval(loop);
    };
  }, []);

  const signLabel = phase.signed ? vault.signed : vault.approve;

  return (
    <article className={`${styles.card} overflow-hidden p-0`}>
      <p className={`px-5 pt-5 ${styles.sommStep}`}>
        05 · the same runtime,{" "}
        <span className={styles.sommStepAccent}>operating the vault</span>
      </p>
      <div className={`${styles.sommBrowser} mt-4`}>
        <div className={styles.sommBrowserBar}>
          <span />
          <span />
          <span />
          <SommMark size={11} />
          <em>{vault.url}</em>
        </div>
        <div className="flex flex-col gap-2 px-4 py-4">
          <p className="font-geist-mono border-b border-[color:var(--v2-border)] pb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--v2-fg-subtle)]">
            <span className="font-semibold text-[color:var(--v2-heading)]">
              Somm Assistant
            </span>
            {" · powered by aomi"}
          </p>

          <p
            className={`${styles.sommUserMsg} ${phase.user ? styles.sommOn : styles.sommHidden}`}
          >
            {vault.user}
          </p>

          {vault.traces.map((trace, index) => {
            const on = index === 0 ? phase.t1 : phase.t2;
            const done = index === 0 ? phase.t1Done : phase.t2Done;
            return (
              <p
                key={trace.label}
                className={`${styles.sommTrace} ${on ? styles.sommOn : styles.sommHidden} ${
                  done ? styles.sommTraceDone : ""
                }`}
              >
                <span className={styles.sommSpin} aria-hidden />
                <span className={styles.sommCheck} aria-hidden>
                  ✓
                </span>
                {trace.label}
                <span className="ml-auto text-[color:var(--v2-fg-subtle)]">
                  {trace.result}
                </span>
              </p>
            );
          })}

          <div
            className={`${styles.sommTxBox} ${phase.box ? styles.sommOn : styles.sommHidden} ${
              phase.boxDone ? styles.sommTxDone : styles.sommTxBuilding
            }`}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--v2-sky)]">
              <span className={styles.sommSpin} aria-hidden />
              {vault.building}
            </p>
            {vault.rows.map((row, index) => {
              const on =
                index === 0 ? phase.r1 : index === 1 ? phase.r2 : phase.r3;
              return (
                <p
                  key={row}
                  className={`mt-0.5 text-[11px] ${on ? styles.sommRowOn : styles.sommRowIn}`}
                >
                  {row}
                </p>
              );
            })}
            <p
              className={`mt-1 text-[11px] font-medium text-[color:var(--v2-success)] ${
                phase.batched ? styles.sommBatchedOn : styles.sommBatched
              }`}
            >
              {vault.batched}
            </p>
          </div>

          <div
            className={`mt-1 flex flex-wrap items-center justify-between gap-3 ${
              phase.fin ? styles.sommOn : styles.sommHidden
            }`}
          >
            <span
              className={`${styles.sommSigned} ${
                phase.press
                  ? styles.sommSignedPress
                  : phase.signed
                    ? styles.sommSignedDone
                    : ""
              }`}
            >
              {signLabel}
            </span>
            <span className="font-geist-mono text-[10px] text-[color:var(--v2-fg-subtle)]">
              {vault.run}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CaseStudySection() {
  const { endpoints, compose, runtime } = caseStudy;

  return (
    <section id="somm" className={`${styles.section} ${styles.sectionMuted}`}>
      <Reveal className={styles.shell}>
        <p className={`font-geist-mono ${styles.sommTag}`}>
          <span className={styles.sommTagDot} />
          {caseStudy.eyebrow}
        </p>
        <h2 className={`mt-5 max-w-[720px] ${styles.heading}`}>
          {caseStudy.headline}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-[110px_1fr] md:gap-x-6 md:gap-y-5 max-w-[78ch]">
          {(
            [
              ["Situation", caseStudy.situation],
              ["Approach", caseStudy.approach],
              ["Outcome", caseStudy.outcome],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <p className={`${styles.kicker} text-[color:var(--v2-sky)] pt-0.5`}>
                {k}
              </p>
              <p className="text-[15px] leading-[1.6] text-[color:var(--v2-fg)]">
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className={`${styles.card} flex flex-col p-5`}>
            <p className={styles.sommStep}>
              01 · the endpoints{" "}
              <span className={styles.sommStepAccent}>Somm</span> already operated
            </p>
            <div className="mt-5 flex flex-1 items-center gap-4">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <SommMark />
                <span className="text-[13px] font-medium text-[color:var(--v2-heading)]">
                  Somm
                </span>
              </div>
              <ul className="min-w-0 flex-1 space-y-2">
                {endpoints.routes.map((route) => (
                  <li
                    key={route.path}
                    className={`${styles.sommEp} font-geist-mono flex items-center gap-2 text-[11px] text-[color:var(--v2-heading)]`}
                  >
                    <span className={styles.sommDash} />
                    <span>
                      <b className="font-medium text-[color:var(--v2-somm)]">
                        {route.method}
                      </b>{" "}
                      {route.path}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-5 border-t border-[color:var(--v2-border)] pt-3 text-[13px] leading-5 text-[color:var(--v2-fg)]">
              <b className="font-medium text-[color:var(--v2-heading)]">
                {endpoints.capTitle}
              </b>{" "}
              {endpoints.cap}
            </p>
          </article>

          <article className={`${styles.card} flex flex-col p-5`}>
            <p className={styles.sommStep}>
              02 · tools + mandate ={" "}
              <span className={styles.sommStepAccent}>an aomi app</span>
            </p>
            <div
              className={`${styles.cardMuted} mt-5 rounded-[10px] border border-[color:var(--v2-border)] p-3`}
            >
              <p className="font-geist-mono text-[10px] font-medium tracking-[0.12em] uppercase text-[color:var(--v2-fg-subtle)]">
                {compose.mandateLabel}
              </p>
              <p className="font-geist-mono mt-2 text-[12px] leading-[1.6] text-[color:var(--v2-heading)]">
                Manage idle treasury assets for Somm. Seek best net yield.{" "}
                <em className="not-italic text-[color:var(--v2-somm)]">
                  {compose.risk}
                </em>{" "}
                Always propose before execution.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {compose.tools.map((tool) => (
                <span key={tool} className={styles.sommTool}>
                  {tool.replace("()", "")}
                  <i>()</i>
                </span>
              ))}
            </div>
            <p
              className={`${styles.sommCompose} font-geist-mono mt-3 text-center text-[11px] text-[color:var(--v2-fg-subtle)]`}
            >
              ↓ compose
            </p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className={styles.sommCubeLive}>
                <Cube accent />
              </span>
              <div>
                <p className="font-geist-mono text-[10px] tracking-[0.18em] uppercase text-[color:var(--v2-sky)]">
                  {compose.appEyebrow}
                </p>
                <p className="text-[14.5px] font-semibold text-[color:var(--v2-heading)]">
                  {compose.appName}
                </p>
              </div>
            </div>
            <p className="mt-5 border-t border-[color:var(--v2-border)] pt-3 text-[13px] leading-5 text-[color:var(--v2-fg)]">
              <b className="font-medium text-[color:var(--v2-heading)]">
                {compose.capTitle}
              </b>{" "}
              {compose.cap}
            </p>
          </article>

          <article className={`${styles.card} flex flex-col p-5`}>
            <p className={styles.sommStep}>
              03 · deployed in the{" "}
              <span className={styles.sommStepAccent}>hosted runtime</span>
            </p>
            <div className={`${styles.sommRuntime} mt-5 flex-1`}>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-[12.5px] font-semibold text-[color:var(--v2-heading)]">
                  {runtime.title}
                </span>
                <span className={styles.sommKeys}>
                  KEYS HELD: <b>0</b>
                </span>
              </div>
              <div className="flex items-end justify-around gap-2 px-3 py-4">
                {runtime.apps.map((name) => (
                  <div key={name} className="flex flex-col items-center gap-1">
                    {name.includes("somm") ? (
                      <span className={styles.sommCubeLive}>
                        <Cube accent />
                      </span>
                    ) : (
                      <Cube />
                    )}
                    <span
                      className={`font-geist-mono text-[10px] uppercase tracking-[0.06em] ${
                        name.includes("somm")
                          ? "text-[color:var(--v2-somm)]"
                          : "text-[color:var(--v2-fg-subtle)]"
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-geist-mono border-t border-dashed border-[color:var(--v2-border)] px-3 py-2 text-center text-[10px] leading-4 tracking-[0.04em] text-[color:var(--v2-sky)]">
                {runtime.rail}
              </p>
            </div>
            <p className="mt-5 border-t border-[color:var(--v2-border)] pt-3 text-[13px] leading-5 text-[color:var(--v2-fg)]">
              <b className="font-medium text-[color:var(--v2-heading)]">
                {runtime.capTitle}
              </b>{" "}
              {runtime.cap}
            </p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SurfacesCard />
          <VaultCard />
        </div>
      </Reveal>
    </section>
  );
}
