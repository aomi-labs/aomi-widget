"use client";

import { useEffect, useState } from "react";

/* ====================================================================== */
/* Contrast probe                                                          */
/* ====================================================================== */

type Rgba = { r: number; g: number; b: number; a: number };

/**
 * Composite a CSS color string over an opaque backdrop and read the literal
 * pixel back. Doing it on a canvas rather than parsing the computed string is
 * deliberate: Chrome serializes `color-mix()` results as
 * `color(srgb 0.49 0.67 0.83 / 0.1)`, whose 0–1 channels a naive rgb() parser
 * silently misreads as 0–255. Painting sidesteps every serialization format
 * and does the alpha compositing in the same step.
 */
let ctx2d: CanvasRenderingContext2D | null = null;

function composite(color: string, backdrop: string): Rgba {
  if (!ctx2d) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    ctx2d = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx2d) throw new Error("Canvas 2D context is unavailable");
  const ctx = ctx2d;
  ctx.globalCompositeOperation = "copy";
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, 1, 1);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHex({ r, g, b }: Rgba): string {
  const h = (v: number) =>
    Math.round(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Resolve `var(--name)` inside a themed context. We read it back off a probe's
 * computed `color`, which makes the browser resolve `color-mix()` and alpha
 * tokens for us rather than handing back the raw declaration.
 *
 * Measured under a scoped `.light` / `.dark` wrapper rather than by toggling
 * the root class — the app owns the root, and both scopes re-declare the whole
 * palette (including derived tokens like `--aomi-accent-tint`, whose `var()`
 * substitutes against the element it is *declared* on, so a scope that only
 * inherited them would report the other theme's derivation).
 */
function resolveTokens(dark: boolean, names: string[]): Record<string, string> {
  const host = document.createElement("div");
  host.className = dark ? "dark" : "light";
  host.style.cssText =
    "position:absolute;left:-9999px;top:0;width:0;height:0;pointer-events:none";
  document.body.appendChild(host);

  const out: Record<string, string> = {};
  for (const name of names) {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    host.appendChild(probe);
    out[name] = getComputedStyle(probe).color;
  }

  document.body.removeChild(host);
  return out;
}

/* ====================================================================== */
/* What we check                                                           */
/* ====================================================================== */

const SURFACES = [
  "--aomi-bg",
  "--aomi-surface",
  "--aomi-surface-2",
  "--aomi-raised",
  "--aomi-hover",
] as const;

const INK = [
  "--aomi-fg",
  "--aomi-muted",
  "--aomi-accent",
  "--aomi-accent-strong",
  "--aomi-success",
  "--aomi-warning",
  "--aomi-danger",
  "--aomi-info",
] as const;

const OTHER = [
  "--aomi-border",
  "--aomi-overlay-border",
  "--aomi-accent-subtle",
  "--aomi-accent-tint",
  "--aomi-accent-outline",
  "--aomi-on-accent",
  "--aomi-pink",
  "--aomi-ring",
] as const;

const ALL_TOKENS = [...SURFACES, ...INK, ...OTHER];

type Kind = "text" | "separation";

type Pair = {
  label: string;
  fg: string;
  bg: string;
  kind: Kind;
  /** Where this pairing actually occurs, so a failure is actionable. */
  where: string;
};

/**
 * `separation` = a non-text boundary or fill that must simply be *seen*
 * (dividers, table rules, meter tracks, chips, elevation steps).
 * `text` = must clear WCAG AA at 4.5:1.
 */
const PAIRS: Pair[] = [
  // --- hairlines: the border token against every surface it lands on -----
  {
    label: "border on raised",
    fg: "--aomi-border",
    bg: "--aomi-raised",
    kind: "separation",
    where: "settings-modal dividers, nav rule, section frames",
  },
  {
    label: "border on bg",
    fg: "--aomi-border",
    bg: "--aomi-bg",
    kind: "separation",
    where: "page-level cards, thread list rule",
  },
  {
    label: "border on surface",
    fg: "--aomi-border",
    bg: "--aomi-surface",
    kind: "separation",
    where: "matrix header/total rows (framed)",
  },
  {
    label: "border on surface-2",
    fg: "--aomi-border",
    bg: "--aomi-surface-2",
    kind: "separation",
    where: "chips, chain badges, tooltip edge",
  },
  {
    label: "overlay-border on surface-2",
    fg: "--aomi-overlay-border",
    bg: "--aomi-surface-2",
    kind: "separation",
    where: "matrix cell tooltip",
  },
  // --- elevation: each surface must step off the one under it -----------
  {
    label: "raised over bg",
    fg: "--aomi-raised",
    bg: "--aomi-bg",
    kind: "separation",
    where: "settings modal panel lifting off the page",
  },
  {
    label: "surface-2 on raised",
    fg: "--aomi-surface-2",
    bg: "--aomi-raised",
    kind: "separation",
    where: "meter track, close button, chips inside the modal",
  },
  {
    label: "surface on raised",
    fg: "--aomi-surface",
    bg: "--aomi-raised",
    kind: "separation",
    where: "segmented-control track, framed matrix header",
  },
  {
    label: "hover on raised",
    fg: "--aomi-hover",
    bg: "--aomi-raised",
    kind: "separation",
    where: "settings nav hover, menu rows",
  },
  {
    label: "hover on surface-2",
    fg: "--aomi-hover",
    bg: "--aomi-surface-2",
    kind: "separation",
    where: "close-button hover",
  },
  {
    label: "accent-subtle on raised",
    fg: "--aomi-accent-subtle",
    bg: "--aomi-raised",
    kind: "separation",
    where: "selected settings-nav row",
  },
  {
    label: "accent-tint on raised",
    fg: "--aomi-accent-tint",
    bg: "--aomi-raised",
    kind: "separation",
    where: "accent chip fill (managed / +markup)",
  },
  // --- text -------------------------------------------------------------
  {
    label: "fg on raised",
    fg: "--aomi-fg",
    bg: "--aomi-raised",
    kind: "text",
    where: "all modal body copy",
  },
  {
    label: "muted on raised",
    fg: "--aomi-muted",
    bg: "--aomi-raised",
    kind: "text",
    where: "column headers, sub-labels, '—' cells",
  },
  {
    label: "muted on surface-2",
    fg: "--aomi-muted",
    bg: "--aomi-surface-2",
    kind: "text",
    where: "chip text, chain badge",
  },
  {
    label: "accent on raised",
    fg: "--aomi-accent",
    bg: "--aomi-raised",
    kind: "text",
    where: "'View full statement →', tx links",
  },
  {
    label: "accent on bg",
    fg: "--aomi-accent",
    bg: "--aomi-bg",
    kind: "text",
    where: "links on the page ground",
  },
  {
    label: "on-accent over accent-strong",
    fg: "--aomi-on-accent",
    bg: "--aomi-accent-strong",
    kind: "text",
    where: "active segmented-control label",
  },
  {
    label: "success on raised",
    fg: "--aomi-success",
    bg: "--aomi-raised",
    kind: "text",
    where: "'free' rows, status dots",
  },
  {
    label: "danger on raised",
    fg: "--aomi-danger",
    bg: "--aomi-raised",
    kind: "text",
    where: "error banners, destructive actions",
  },
  {
    label: "warning on raised",
    fg: "--aomi-warning",
    bg: "--aomi-raised",
    kind: "text",
    where: "warning states",
  },
];

/** A separation pair below this is effectively invisible. */
const SEPARATION_MIN = 1.2;
const TEXT_MIN = 4.5;

type Verdict = "pass" | "warn" | "fail";

function verdictFor(kind: Kind, ratio: number): Verdict {
  if (kind === "text") {
    if (ratio >= TEXT_MIN) return "pass";
    if (ratio >= 3) return "warn";
    return "fail";
  }
  if (ratio >= SEPARATION_MIN) return "pass";
  if (ratio >= 1.1) return "warn";
  return "fail";
}

/* ====================================================================== */
/* Audit table                                                             */
/* ====================================================================== */

type Row = Pair & {
  light: number;
  dark: number;
  lightHex: string;
  darkHex: string;
  lightVerdict: Verdict;
  darkVerdict: Verdict;
};

const VERDICT_STYLE: Record<Verdict, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-rose-600 dark:text-rose-400 font-semibold",
};

export function AuditTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [swatches, setSwatches] = useState<
    { name: string; light: string; dark: string }[] | null
  >(null);

  useEffect(() => {
    const light = resolveTokens(false, ALL_TOKENS);
    const dark = resolveTokens(true, ALL_TOKENS);

    // Backdrops are themselves opaque tokens, so flatten them on white first;
    // then the pair's foreground composites over that real pixel.
    const build = (t: Record<string, string>, p: Pair) => {
      const bg = composite(t[p.bg], "#ffffff");
      const bgCss = `rgb(${bg.r} ${bg.g} ${bg.b})`;
      const fg = composite(t[p.fg], bgCss);
      return { ratio: contrast(fg, bg), hex: toHex(fg) };
    };

    setRows(
      PAIRS.map((p) => {
        const l = build(light, p);
        const d = build(dark, p);
        return {
          ...p,
          light: l.ratio,
          dark: d.ratio,
          lightHex: l.hex,
          darkHex: d.hex,
          lightVerdict: verdictFor(p.kind, l.ratio),
          darkVerdict: verdictFor(p.kind, d.ratio),
        };
      }),
    );

    setSwatches(
      ALL_TOKENS.map((name) => ({
        name,
        light: toHex(composite(light[name], light["--aomi-bg"])),
        dark: toHex(composite(dark[name], dark["--aomi-bg"])),
      })),
    );
  }, []);

  if (!rows || !swatches) {
    return <p className="p-6 text-sm text-zinc-500">measuring tokens…</p>;
  }

  const fails = rows.filter(
    (r) => r.darkVerdict === "fail" || r.lightVerdict === "fail",
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Contrast audit</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Every pairing resolved from the real cascade (alpha and{" "}
          <code>color-mix()</code> composited over their backdrop).{" "}
          <strong>{fails.length}</strong> hard failure
          {fails.length === 1 ? "" : "s"}.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
                <th className="py-2 pr-3 font-medium">Pair</th>
                <th className="py-2 pr-3 font-medium">Where it shows</th>
                <th className="py-2 pr-3 text-right font-medium">Light</th>
                <th className="py-2 pr-3 text-right font-medium">Dark</th>
                <th className="py-2 pr-3 font-medium">Need</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.label}
                  className="border-b border-zinc-200 dark:border-zinc-800"
                >
                  <td className="py-2 pr-3 font-mono text-xs">{r.label}</td>
                  <td className="py-2 pr-3 text-xs text-zinc-500">{r.where}</td>
                  <td
                    className={`py-2 pr-3 text-right font-mono text-xs ${VERDICT_STYLE[r.lightVerdict]}`}
                  >
                    {r.light.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono text-xs ${VERDICT_STYLE[r.darkVerdict]}`}
                  >
                    {r.dark.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-zinc-500">
                    {r.kind === "text" ? "4.50" : "1.20"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Resolved ramp</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
          {swatches.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <span
                className="size-7 shrink-0 rounded border border-zinc-300 dark:border-zinc-600"
                style={{ background: s.light }}
              />
              <span
                className="size-7 shrink-0 rounded border border-zinc-300 dark:border-zinc-600"
                style={{ background: s.dark }}
              />
              <span className="flex min-w-0 flex-col">
                <code className="truncate text-[11px]">
                  {s.name.replace("--aomi-", "")}
                </code>
                <code className="text-[10px] text-zinc-500">
                  {s.light} · {s.dark}
                </code>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Specimens — the real surfaces, on the real panel                        */
/* ====================================================================== */
