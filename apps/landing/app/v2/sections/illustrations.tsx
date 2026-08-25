import type { ReactNode } from "react";
import styles from "../v2.module.css";

function FlowLines({ gid }: { gid: string }) {
  return (
    <svg className={styles.flowSvg} viewBox="0 0 640 240" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="var(--v2-line-from)" />
          <stop offset="100%" stopColor="var(--v2-line-to)" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          className={styles.flowStroke}
          stroke={`url(#${gid})`}
          d={`M-40 ${70 + i * 18} C 140 ${40 + i * 10}, 280 ${130 + i * 8}, 420 ${78 + i * 12} S 700 ${90 + i * 10}, 720 ${84 + i * 14}`}
        />
      ))}
    </svg>
  );
}

function CursorPill({
  label,
  color,
  className = "",
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={`${styles.cursorPill} ${className}`} style={{ background: color }}>
      <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden>
        <path d="M0 0 8 4.2 3.2 5.3 2 10Z" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}

function IllustFrame({
  children,
  caption,
  gid,
}: {
  children: ReactNode;
  caption: string;
  gid: string;
}) {
  return (
    <div>
      <div className={styles.illustCard}>
        <FlowLines gid={gid} />
        {children}
      </div>
      <p className={styles.illustCaption}>{caption}</p>
    </div>
  );
}

export function WhyIllustration() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <IllustFrame gid="v2-why-a" caption="The model proposes intent. Aomi constructs the transaction.">
        <div className={styles.uiStack}>
          <div className={styles.uiBar} />
          <div className={styles.uiCard}>
            <div className={`${styles.uiLine} w-3/4`} />
            <div className={`${styles.uiLine} ${styles.uiLineHi} mt-2 w-1/2`} />
          </div>
          <div className={styles.composer}>
            <span className={styles.composerLabel}>
              Simulate first, then sign
            </span>
            <span className={styles.composerSend} aria-hidden>
              ↑
            </span>
          </div>
          <CursorPill
            label="Agent"
            color="#7C3AED"
            className="absolute top-8 right-10"
          />
        </div>
      </IllustFrame>
      <IllustFrame gid="v2-why-b" caption="Wallet cannot construct. Aomi constructs. User signs locally.">
        <div className={styles.uiStack}>
          <div className={styles.docStack}>
            <div className={styles.doc} style={{ transform: "rotate(-6deg) translate(-10px, 8px)" }}>
              <div className={`${styles.uiLine} w-4/5`} />
              <div className={`${styles.uiLine} w-2/3`} />
              <div className={`${styles.uiLine} w-3/5`} />
            </div>
            <div className={styles.doc} style={{ transform: "rotate(3deg) translate(8px, 4px)" }}>
              <div className={`${styles.uiLine} w-3/4`} />
              <div className={`${styles.uiLine} ${styles.uiLineHi} w-2/3`} />
              <div className={`${styles.uiLine} ${styles.uiLineHi} w-1/2`} />
              <div className={`${styles.uiLine} w-3/5`} />
            </div>
          </div>
          <CursorPill
            label="Agent"
            color="#F97316"
            className="absolute top-10 right-8"
          />
          <CursorPill
            label="User"
            color="#2563EB"
            className="absolute bottom-8 left-8"
          />
        </div>
      </IllustFrame>
    </div>
  );
}

export function PatternProgress() {
  return (
    <div className={styles.progressTrack} aria-hidden>
      <span className={styles.progressGlow} />
    </div>
  );
}

export function PipelineIllustration() {
  return (
    <IllustFrame gid="v2-pipe" caption="Build, simulate, sign, broadcast. Keys stay with the user.">
      <div className={styles.uiStack}>
        <svg
          className="absolute inset-x-6 top-8 h-16 w-[calc(100%-3rem)]"
          viewBox="0 0 400 40"
          aria-hidden
        >
          <path
            id="v2PipePath"
            d="M8 20 H392"
            fill="none"
            stroke="var(--v2-line-from)"
            strokeWidth="1.4"
            className={styles.flowStroke}
          />
          <circle r="4" className={styles.pulseDot}>
            <animateMotion dur="4.8s" repeatCount="indefinite">
              <mpath href="#v2PipePath" />
            </animateMotion>
          </circle>
        </svg>
        <div className={styles.composer}>
          <span className={styles.composerLabel}>
            stake USDC on Morpho. simulate first.
          </span>
          <span className={styles.composerSend} aria-hidden>
            ↑
          </span>
        </div>
        <CursorPill label="Agent" color="#7C3AED" />
      </div>
    </IllustFrame>
  );
}

export function RuntimeIllustration() {
  return (
    <IllustFrame gid="v2-runtime" caption="One harness. Threads, forks, and scheduling. Zero extra servers.">
      <div className={styles.uiStack}>
        <svg viewBox="0 0 280 140" className="relative z-10 h-32 w-full max-w-[280px]" aria-hidden>
          <circle cx="140" cy="28" r="10" fill="var(--v2-line-from)" />
          <path
            d="M140 38 V62 M140 62 L64 96 M140 62 L140 96 M140 62 L216 96"
            fill="none"
            stroke="var(--v2-line-from)"
            strokeWidth="1.3"
            className={styles.flowStroke}
          />
          <circle cx="64" cy="104" r="8" fill="var(--v2-illust-bar)" />
          <circle cx="140" cy="104" r="8" fill="var(--v2-illust-bar)" />
          <circle cx="216" cy="104" r="8" fill="var(--v2-illust-bar)" />
        </svg>
      </div>
    </IllustFrame>
  );
}

export function SurfacesIllustration() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <IllustFrame gid="v2-cli" caption="CLI: intent to a simulated, signable transaction.">
        <div className={styles.uiStack}>
          <div className={styles.term}>
            <div>$ aomi transact</div>
            <div style={{ color: "#71717a" }}># simulate before sign</div>
          </div>
        </div>
      </IllustFrame>
      <IllustFrame gid="v2-mcp" caption="MCP: coding agents reach the same harness.">
        <div className={styles.uiStack}>
          <span className={styles.skillChip}>aomi-labs/skills</span>
        </div>
      </IllustFrame>
      <IllustFrame gid="v2-embed" caption="Embed is one surface among others. Not the product.">
        <div className={styles.uiStack}>
          <div className={styles.frameMock} />
        </div>
      </IllustFrame>
    </div>
  );
}
