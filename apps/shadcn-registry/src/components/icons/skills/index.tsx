import type { FC, SVGProps } from "react";
import { CircleDollarSignIcon, CoinsIcon } from "lucide-react";

import {
  AcrossIcon,
  LifiIcon,
  MorphoIcon,
  OneInchIcon,
  YearnIcon,
} from "../apps";
import { ArbitrumIcon, BaseIcon, OptimismIcon, RobinhoodIcon } from "../chains";

type SkillIconProps = SVGProps<SVGSVGElement>;

/**
 * Official marks used by the capability picker.
 *
 * These are deliberately monochrome. The picker supplies `currentColor`, so
 * the same source mark stays legible in the muted and active states.
 */

// Source: https://github.com/aave-dao/aave-brand-kit/tree/main/Logo
export function AaveSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 266 139"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M97.5418 138.533C112.461 138.533 124.556 126.438 124.556 111.518C124.556 96.5987 112.461 84.5039 97.5418 84.5039C82.6221 84.5039 70.5273 96.5987 70.5273 111.518C70.5273 126.438 82.6221 138.533 97.5418 138.533Z"
        fill="currentColor"
      />
      <path
        d="M168.149 138.533C183.069 138.533 195.164 126.438 195.164 111.518C195.164 96.5987 183.069 84.5039 168.149 84.5039C153.23 84.5039 141.135 96.5987 141.135 111.518C141.135 126.438 153.23 138.533 168.149 138.533Z"
        fill="currentColor"
      />
      <path
        d="M132.8 0C59.4497 0-.0192 60.6017 0 135.335H33.9264C33.9264 79.3281 77.8433 33.92 132.8 33.92C187.757 33.92 231.674 79.3281 231.674 135.335H265.6C265.613 60.6017 206.144 0 132.8 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Across Protocol mark. Source: https://across.to/ */
export function AcrossSkillIcon(props: SkillIconProps) {
  return <AcrossIcon {...props} />;
}

// Source: https://aerodrome.finance/brand (official AERO brand kit).
export function AerodromeSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M29.5 54.6s0-.1 0-.1c1.4-5.5 11.8-11.2 16.7-13.8 14.7-7 30.5-11.3 46.3-14.7 3.6-.8 7.3-1.5 11-2.1 6.7-1.5 3.2-9.7-2.9-7.6-6.5 1.1-12.9 2.5-19.3 4-14.8 3.7-29.6 8.1-43.1 15.4-6.9 3.9-15.6 9.2-17.5 17.4 0 .4-.2.9-.1 1.4v1c0 .3 0 .7.1 1 3.6 15.9 45.5 20.9 59.6 22.3 6.6.8 13.3 1.1 19.9 1.5 2 .6 3.1-2 .8-2.3-1 0-2-.2-3.1-.3-17-1.6-34.2-4-50.4-9.8-3.8-1.3-7.5-2.9-10.9-5.1-2.2-1.4-4.4-2.9-5.9-5.1-.2-.3-.3-.6-.5-.9 0 0 0 0 0 0 0-.1 0-.3-.1-.4v-1.2c0 0 0-.1 0-.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Curve's faceted torus mark, compacted to a monochrome icon. Source: the supplied CRV_lg.svg asset. */
export function CurveSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19m0 4.05a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9"
        clipRule="evenodd"
      />
      <path
        d="m7.45 7.93 2.1 2.1a2.8 2.8 0 0 0 0 3.94l-2.1 2.1a5.78 5.78 0 0 1 0-8.14m9.1 0a5.78 5.78 0 0 1 0 8.14l-2.1-2.1a2.8 2.8 0 0 0 0-3.94z"
        fill="currentColor"
        opacity=".38"
      />
    </svg>
  );
}

/** Ether.fi's geometric ether mark. Source: supplied ether.fi-logo.svg asset. */
export function EtherfiSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M25.9 1.7 51.3 28.8 29 51.3 2.1 29.6 22 .2zM22.1 8.5 8.8 27.8l17.1 15.6 17.3-15.1zM10.8 30.4l9.5 7.6 6.1-5.8-8.9-7.9zM31 31.9l5.8 5.9 8.3-8.7-6-5.1z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Compound's three-bar protocol mark, cropped from the official wordmark. Source: https://compound.finance/images/compound-logo.svg */
export function CompoundSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 22 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="m1.084 21.043 9.461 5.79a1.2 1.2 0 0 0 1.723-1.047v-4.47a1.9 1.9 0 0 0-.936-1.63L1.42 13.908A.95.95 0 0 0 0 14.72v4.393c0 .787.411 1.519 1.084 1.93M15.858 12.704l-9.909-5.778a.95.95 0 0 0-1.42.813v5.787l8.705 5.208a1.9 1.9 0 0 1 .918 1.62v5.127l2.258-1.257a.95.95 0 0 0 .384-.657v-9.233a1.9 1.9 0 0 0-.936-1.63M20.195 5.885l-9.908-5.758a.95.95 0 0 0-1.417.817v5.49l8.897 5.337a1.9 1.9 0 0 1 .915 1.618v9.389l2.056-1.11a.95.95 0 0 0 .396-.664V7.517a1.9 1.9 0 0 0-.939-1.632"
        fill="currentColor"
      />
    </svg>
  );
}

/** Convex's stepped C mark, with its source color bands reduced to opacity. Source: supplied convex_logo_whitebackground.svg. */
export function ConvexSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 198 198"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M156.83 85.66V59h-13.35V45.62h-26.69V32.28H90.1v13.34H63.42V59H50.07v80h13.34v13.35H90.1v13.34h26.68v-13.31h26.7V139h13.35v-26.66h-26.66v13.35h-13.35V139H90.1v-13.31H76.76V72.31H90.1V59h26.69v13.31h13.35v13.35z"
        fill="currentColor"
      />
      <path
        d="M121.24 72.32h8.9v13.34h-8.9zM107.89 58.97h8.9v13.34h-8.9zM81.21 32.28h8.9v13.34h-8.9z"
        fill="currentColor"
        opacity=".55"
      />
      <path
        d="M116.8 112.35h13.33v13.35H116.8zM107.9 125.69h8.9v13.34h-8.9zM81.2 152.38h8.9v13.34h-8.9z"
        fill="currentColor"
        opacity=".72"
      />
      <path
        d="M54.51 139.03h8.9v13.34h-8.9zM41.17 99h8.9v40.03h-8.9z"
        fill="currentColor"
        opacity=".4"
      />
      <path
        d="M41.17 58.97h8.9V99h-8.9zM54.52 45.63h8.9v13.34h-8.9z"
        fill="currentColor"
        opacity=".55"
      />
    </svg>
  );
}

/** Kamino's K-and-arc symbol, cropped from the official wordmark asset. Source: https://kamino.com/assets/logo.1788494054.svg */
export function KaminoSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 320 249"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M47.54 15.95H0v229.87h47.54z" fill="currentColor" />
      <path
        d="M161.18 242.96c-23.81-16.42-39.9-46.96-39.9-81.95 0-34.99 16.09-65.53 39.9-81.95v-2.76H95.31c-15.42 23.88-24.63 53.09-24.63 84.71s9.19 60.81 24.63 84.71h65.87z"
        fill="currentColor"
        opacity=".72"
      />
      <path
        d="M274.53 76.28v14.48c-8.18-8.16-16.5-17.16-40.34-17.16-15.31 0-29.21 3.11-41.27 10.33-12.99 7.71-23.54 18.54-31.38 32.13-7.86 13.63-11.86 28.86-11.86 45.26s3.92 31.54 11.68 45.02c7.74 13.46 18.23 24.18 31.23 31.9 12.49 7.41 26.75 10.11 42.39 10.11 14.79 0 29.81-7.69 39.55-17.16v14.48h45.28V76.28zm-35.84 131.65c-24.52 0-44.4-20.9-44.4-46.66s19.89-46.66 44.4-46.66c24.51 0 44.41 20.89 44.41 46.66s-19.9 46.66-44.41 46.66"
        fill="currentColor"
      />
    </svg>
  );
}

/** The bridge skill uses Arbitrum's official chain mark. */
export function ArbitrumBridgeSkillIcon(props: SkillIconProps) {
  return <ArbitrumIcon {...props} />;
}

/** The canonical Base bridge skill uses the official Base mark. */
export function BaseNativeSkillIcon(props: SkillIconProps) {
  return <BaseIcon {...props} />;
}

// Source: https://developers.jup.ag/docs/resources/brand-kit
export function JupiterSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3.091 25.167c1.352 1.88 3.085 3.454 5.088 4.617 2.003 1.163 4.229 1.89 6.532 2.133-1.185-1.783-2.908-3.424-5.058-4.673-2.15-1.249-4.428-1.932-6.562-2.077"
        fill="currentColor"
      />
      <path
        d="M12.543 22.27C8.4 19.864 3.916 19.25.708 20.334c.31 1.024.718 2.015 1.22 2.96 2.787-.065 5.83.692 8.662 2.337 2.832 1.645 4.998 3.915 6.324 6.369a20 20 0 0 0 3.177-.407c-.649-3.324-3.407-6.916-7.548-9.323"
        fill="currentColor"
        opacity=".68"
      />
      <path
        d="M32.285 12.501A16 16 0 0 0 11.846.626c3.546.434 7.48 1.765 11.34 4.007 3.86 2.242 6.967 5 9.099 7.868"
        fill="currentColor"
        opacity=".42"
      />
      <path
        d="M27.127 20.358c-1.815-3.013-4.923-5.899-8.753-8.124C14.545 10.01 10.499 8.738 6.985 8.655c-3.09-.073-5.411.825-6.364 2.465l-.019.029a20 20 0 0 0-.228.925c1.33-.525 2.87-.818 4.585-.85 3.81-.072 8.073 1.147 12.008 3.433 3.935 2.286 7.107 5.388 8.932 8.732.818 1.506 1.328 2.99 1.53 4.407.236-.211.467-.428.691-.654l.016-.032c.953-1.641.585-4.101-.989-6.752"
        fill="currentColor"
        opacity=".82"
      />
      <path
        d="M15.461 17.249C9.597 13.842 3.116 13.308 0 15.686c.006.744.063 1.487.17 2.223a15 15 0 0 1 2.817-.522c3.482-.262 7.322.708 10.806 2.733 3.484 2.025 6.23 4.88 7.728 8.034.414.863.73 1.77.941 2.705a20 20 0 0 0 2.017-.953c.522-3.885-3.153-9.25-9.018-12.657"
        fill="currentColor"
        opacity=".58"
      />
      <path
        d="M30.143 15.314c-1.835-3.011-4.971-5.905-8.827-8.144-3.857-2.24-7.919-3.53-11.444-3.633-2.687-.078-4.769.573-5.848 1.804 4.481-.759 10.392.517 16.121 3.845 5.729 3.328 9.767 7.832 11.326 12.101.534-1.547.069-3.678-1.328-5.973"
        fill="currentColor"
        opacity=".55"
      />
    </svg>
  );
}

/** LI.FI, Morpho, and 1inch already have canonical app marks in this package. */
export function LifiSkillIcon(props: SkillIconProps) {
  return <LifiIcon {...props} />;
}

export function MorphoSkillIcon(props: SkillIconProps) {
  return <MorphoIcon {...props} />;
}

export function OneInchSkillIcon(props: SkillIconProps) {
  return <OneInchIcon {...props} />;
}

/** OpenBook's paired-page mark. Source: https://github.com/openbook-dex */
export function OpenbookSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4.5 5.25c2.65-.5 5.16.06 7.5 1.7v12.3c-2.34-1.64-4.85-2.2-7.5-1.7z"
        fill="currentColor"
        opacity=".82"
      />
      <path
        d="M19.5 5.25c-2.65-.5-5.16.06-7.5 1.7v12.3c2.34-1.64 4.85-2.2 7.5-1.7z"
        fill="currentColor"
      />
      <path d="M12 6.95v12.3" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

/** The canonical Optimism bridge uses the official Optimism mark. */
export function OptimismNativeSkillIcon(props: SkillIconProps) {
  return <OptimismIcon {...props} />;
}

/** Pendle's P/band mark, redrawn in the icon's currentColor. Source: https://www.pendle.finance/brand-guide/ */
export function PendleSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 4h4.8c4.2 0 6.8 2.2 6.8 5.8 0 3.7-2.7 5.8-6.8 5.8H7.2V20H4zm3.2 3v5.55h1.45c2.4 0 3.73-.96 3.73-2.75S11.05 7 8.65 7z"
        fill="currentColor"
      />
      <path d="M16.2 4H20v16h-3.8z" fill="currentColor" opacity=".42" />
    </svg>
  );
}

/** Raydium symbol mark. Source: https://docs.raydium.io/resources/brand-kit */
export function RaydiumSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 3.35a8.65 8.65 0 1 0 8.65 8.65A8.65 8.65 0 0 0 12 3.35m0 2.55a6.1 6.1 0 1 1-6.1 6.1A6.1 6.1 0 0 1 12 5.9"
        fill="currentColor"
      />
      <path
        d="M8.3 14.72c1.55-2.44 3.02-4.32 4.42-5.64 1.48-1.4 2.52-1.7 3.13-.88.48.63.08 1.45-1.18 2.46-1.17.94-2.62 2.1-4.34 3.47 1.74-.23 3.35-.16 4.84.2 1.47.36 2.37.93 2.7 1.7.3.72-.1 1.22-1.18 1.5-1.22.32-2.69.21-4.4-.34-1.66-.53-2.99-1.35-3.99-2.47"
        fill="currentColor"
        opacity=".58"
      />
    </svg>
  );
}

/** Renzo's angular R. Source: https://docs.renzoprotocol.com/docs/resources/brand-kit */
export function RenzoSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5 3.5h7.2c4.27 0 6.8 2.05 6.8 5.3 0 2.28-1.2 3.88-3.45 4.72L19.7 20.5h-4.05l-3.7-6.2H8.55v6.2H5zm3.55 3.15v4.5h3.23c2.37 0 3.62-.76 3.62-2.3 0-1.47-1.2-2.2-3.62-2.2z"
        fill="currentColor"
      />
      <path
        d="m12.45 14.3 2.3-1.1 4.95 7.3h-3.95z"
        fill="currentColor"
        opacity=".44"
      />
    </svg>
  );
}

/** Robinhood Chain is also the underlying mark for Robinhood stock tokens. */
export function RobinhoodStocksSkillIcon(props: SkillIconProps) {
  return <RobinhoodIcon {...props} />;
}

/** Rocket Pool's compact rocket mark. Source: https://rocketpool.net/ */
export function RocketPoolSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M15.9 3.2c2.3.45 4.02 2.16 4.48 4.46.53 2.66-.54 5.5-3.18 8.14l-3.8 3.8-8.99-8.99 3.8-3.8c2.64-2.64 5.48-3.71 8.14-3.18M5.63 13.18l-2.3 2.3 5.2 5.2 2.3-2.3zM4.15 18.72 3 21l2.28-1.15z"
        fill="currentColor"
      />
      <circle cx="15.28" cy="8.28" r="2.05" fill="currentColor" opacity=".2" />
    </svg>
  );
}

/** Sanctum's rising-arch symbol. Source: https://www.sanctum.so/ */
export function SanctumSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 16.8 12 4l8 12.8h-3.18L12 9.1l-4.82 7.7z"
        fill="currentColor"
      />
      <path
        d="m7 18.4 5-8 5 8h-2.7L12 14.9l-2.3 3.5z"
        fill="currentColor"
        opacity=".56"
      />
      <path
        d="M3 20.5h18"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Squads' modular four-cell mark. Source: https://squads.so/ */
export function SquadsSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3.5"
        y="3.5"
        width="7.1"
        height="7.1"
        rx="1.8"
        fill="currentColor"
      />
      <rect
        x="13.4"
        y="3.5"
        width="7.1"
        height="7.1"
        rx="1.8"
        fill="currentColor"
        opacity=".55"
      />
      <rect
        x="3.5"
        y="13.4"
        width="7.1"
        height="7.1"
        rx="1.8"
        fill="currentColor"
        opacity=".55"
      />
      <rect
        x="13.4"
        y="13.4"
        width="7.1"
        height="7.1"
        rx="1.8"
        fill="currentColor"
      />
    </svg>
  );
}

/** Stargate's eight-point portal star. Source: https://stargate.finance/ */
export function StargateSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="m12 2.8 1.48 6.24L19.2 5.7l-3.34 5.72 6.34 1.48-6.34 1.48 3.34 5.72-5.72-3.34L12 21l-1.48-4.24-5.72 3.34 3.34-5.72-6.34-1.48 6.34-1.48L4.8 5.7l5.72 3.34z"
        fill="currentColor"
      />
      <circle cx="12" cy="12.9" r="2.25" fill="currentColor" opacity=".24" />
    </svg>
  );
}

/** SushiSwap's compact roll mark. Source: https://www.sushi.com/ */
export function SushiSwapSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3.4 14.3c1.74-4.9 5.48-7.62 10.3-7.62 2.92 0 5.34 1.05 6.9 3.02-.42.14-.76.43-1.03.86-.45.7-.55 1.54-.27 2.52.48 1.75-.08 3.04-1.68 3.88-1.82.95-4.32 1.31-7.49 1.07-2.88-.22-5.13-1.46-6.73-3.73"
        fill="currentColor"
      />
      <circle cx="15.35" cy="10.15" r="1.05" fill="currentColor" opacity=".2" />
      <path d="m5.1 16.6-2.1 2.1 3.25-.4z" fill="currentColor" opacity=".62" />
    </svg>
  );
}

/** Uniswap's unicorn mark simplified for a 16px slot. Source: https://uniswap.org/ */
export function UniswapSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7.3 4.1c.35-.9 1.25-1.45 2.2-1.34.9.1 1.57.84 1.57 1.74 0 .28-.06.55-.18.8l-1.01 2.07c1.02.2 1.93.6 2.75 1.2l2.18-1.32a1.77 1.77 0 1 1 1.84 3.02l-1.9 1.15c.37.82.56 1.73.56 2.7 0 3.4-2.28 5.86-5.64 5.86-2.86 0-5.08-1.56-5.74-4.05-.24-.9-.16-1.68.24-2.33.37-.6.94-.9 1.71-.9.87 0 1.52.42 1.76 1.16.3.94.94 1.43 1.9 1.43 1.21 0 1.98-.85 1.98-2.22 0-1.9-1.37-3.08-3.62-3.08-.48 0-.94.05-1.38.15z"
        fill="currentColor"
      />
      <circle cx="13.8" cy="12.3" r=".72" fill="currentColor" opacity=".2" />
    </svg>
  );
}

export function YearnSkillIcon(props: SkillIconProps) {
  return <YearnIcon {...props} />;
}

/** zkSync's nested Z mark. Source: https://zksync.io/ */
export function ZkSyncEraSkillIcon(props: SkillIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M4 5h16v3.1l-10.9 7.8H20V19H4v-3.1l10.9-7.8H4z"
        fill="currentColor"
      />
      <path
        d="M10.1 8.1h4.8l-5.4 3.86H4.7z"
        fill="currentColor"
        opacity=".22"
      />
    </svg>
  );
}

export function ZoraSkillIcon(props: SkillIconProps) {
  // Keep the skill asset truly colorless; the legacy app mark uses a
  // radialGradient, which is intentionally not carried into this registry.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".78" />
      <path
        d="M8 8.2h8v2.05l-5.25 3.5H16v2.05H8v-2.05l5.25-3.5H8z"
        fill="currentColor"
        opacity=".34"
      />
    </svg>
  );
}

/**
 * Skill IDs are wire values, so keep their presentation mapping in one place.
 * Unsupported or user-defined skills deliberately return `undefined` so the
 * caller can use the neutral wand fallback instead of inventing a protocol
 * identity.
 */
const SKILL_ICONS: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  aave: AaveSkillIcon,
  across: AcrossSkillIcon,
  aerodrome: AerodromeSkillIcon,
  arbitrum_bridge: ArbitrumBridgeSkillIcon,
  base_native: BaseNativeSkillIcon,
  compound: CompoundSkillIcon,
  convex: ConvexSkillIcon,
  curve: CurveSkillIcon,
  // CCTP is Circle's USDC bridge; use the existing generic Circle/USDC mark.
  cctp: CircleDollarSignIcon,
  // Common ERC-20 exposes standard token operations, so reuse the same coin
  // mark shown for unknown ERC-20 assets in transaction and trace UI.
  common_erc20: CoinsIcon,
  etherfi: EtherfiSkillIcon,
  jupiter: JupiterSkillIcon,
  kamino: KaminoSkillIcon,
  lifi_swap: LifiSkillIcon,
  morpho: MorphoSkillIcon,
  oneinch: OneInchSkillIcon,
  openbook: OpenbookSkillIcon,
  optimism_native: OptimismNativeSkillIcon,
  pendle: PendleSkillIcon,
  raydium: RaydiumSkillIcon,
  renzo: RenzoSkillIcon,
  robinhood_stocks: RobinhoodStocksSkillIcon,
  rocket_pool: RocketPoolSkillIcon,
  sanctum: SanctumSkillIcon,
  squads: SquadsSkillIcon,
  stargate: StargateSkillIcon,
  sushiswap: SushiSwapSkillIcon,
  uniswap: UniswapSkillIcon,
  yearn: YearnSkillIcon,
  zksync_era_native: ZkSyncEraSkillIcon,
  zora: ZoraSkillIcon,
};

/** Normalize a capability catalog ID before looking up its visual identity. */
export function normalizeSkillId(skillId: string): string {
  return skillId
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
}

export function getSkillIcon(
  skillId: string | null | undefined,
): FC<SVGProps<SVGSVGElement>> | undefined {
  if (!skillId) return undefined;
  return SKILL_ICONS[normalizeSkillId(skillId)];
}
