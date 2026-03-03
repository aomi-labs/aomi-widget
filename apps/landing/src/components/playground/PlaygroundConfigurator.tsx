"use client";

import { useState, useMemo, useCallback, type FC } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { CopyButton } from "./CopyButton";

// =============================================================================
// Types
// =============================================================================

type WalletPosition = "header" | "footer" | "hidden";
type ControlPlacement = "header" | "composer";

type PlaygroundState = {
  sidebarShown: boolean;
  walletPosition: WalletPosition;
  controlPlacement: ControlPlacement;
  showModel: boolean;
  showNamespace: boolean;
  showApiKey: boolean;
  showWallet: boolean;
  showNetwork: boolean;
};

const DEFAULT_STATE: PlaygroundState = {
  sidebarShown: true,
  walletPosition: "footer",
  controlPlacement: "header",
  showModel: true,
  showNamespace: true,
  showApiKey: false,
  showWallet: false,
  showNetwork: true,
};

// =============================================================================
// Code generation
// =============================================================================

function generateCode(s: PlaygroundState): string {
  const walletProp =
    s.walletPosition === "hidden" ? "null" : `"${s.walletPosition}"`;

  const hasAnyControl =
    s.showModel || s.showNamespace || s.showApiKey || s.showWallet || s.showNetwork;

  const controlBarEntries: string[] = [];
  if (!s.showNetwork) controlBarEntries.push("hideNetwork: true");
  if (!s.showModel) controlBarEntries.push("hideModel: true");
  if (!s.showNamespace) controlBarEntries.push("hideNamespace: true");
  if (!s.showApiKey) controlBarEntries.push("hideApiKey: true");
  if (s.showWallet) controlBarEntries.push("hideWallet: false");

  const controlBarPropsStr =
    controlBarEntries.length > 0
      ? ` controlBarProps={{ ${controlBarEntries.join(", ")} }}`
      : "";

  const rootProps: string[] = ['height="560px"'];
  if (!s.sidebarShown) {
    rootProps.push("sidebarShown={false}");
  }
  if (s.sidebarShown && s.walletPosition !== "footer") {
    rootProps.push(`walletPosition={${walletProp}}`);
  }
  if (!s.sidebarShown) {
    rootProps.push("walletPosition={null}");
  }

  const headerWithControl =
    hasAnyControl && s.controlPlacement === "header";
  const composerWithControl =
    hasAnyControl && s.controlPlacement === "composer";

  let headerLine: string;
  if (headerWithControl) {
    headerLine = `  <AomiFrame.Header withControl${controlBarPropsStr} />`;
  } else {
    headerLine = "  <AomiFrame.Header />";
  }

  let composerLine: string;
  if (composerWithControl) {
    composerLine = `  <AomiFrame.Composer withControl${controlBarPropsStr} />`;
  } else {
    composerLine = "  <AomiFrame.Composer />";
  }

  return [
    `<AomiFrame.Root ${rootProps.join(" ")}>`,
    headerLine,
    composerLine,
    "</AomiFrame.Root>",
  ].join("\n");
}

// =============================================================================
// Sub-components
// =============================================================================

type RadioGroupProps = {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
};

const RadioGroup: FC<RadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
}) => (
  <fieldset className="space-y-2">
    <legend className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
      {label}
    </legend>
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
              : "border-fd-border text-fd-muted-foreground hover:border-fd-primary/40"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  </fieldset>
);

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

const Checkbox: FC<CheckboxProps> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 text-xs text-fd-foreground">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-3.5 rounded border-fd-border accent-fd-primary"
    />
    {label}
  </label>
);

// =============================================================================
// Main Playground
// =============================================================================

export function PlaygroundConfigurator() {
  const [state, setState] = useState<PlaygroundState>(DEFAULT_STATE);

  const update = useCallback(
    (patch: Partial<PlaygroundState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const code = useMemo(() => generateCode(state), [state]);

  const walletPropValue =
    !state.sidebarShown || state.walletPosition === "hidden"
      ? undefined
      : state.walletPosition;

  // Build controlBarProps from state
  const controlBarProps = useMemo(
    () => ({
      hideNetwork: !state.showNetwork,
      hideModel: !state.showModel,
      hideNamespace: !state.showNamespace,
      hideApiKey: !state.showApiKey,
      hideWallet: !state.showWallet,
    }),
    [state],
  );

  const hasAnyControl =
    state.showModel ||
    state.showNamespace ||
    state.showApiKey ||
    state.showWallet ||
    state.showNetwork;

  return (
    <div className="space-y-4">
      {/* Main split panel */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left: Live preview */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-xl border border-fd-border">
            <AomiFrame.Root
              height="560px"
              walletPosition={walletPropValue ?? null}
            >
              {hasAnyControl && state.controlPlacement === "header" ? (
                <AomiFrame.Header
                  withControl
                  controlBarProps={controlBarProps}
                />
              ) : (
                <AomiFrame.Header />
              )}
              {hasAnyControl && state.controlPlacement === "composer" ? (
                <AomiFrame.Composer
                  withControl
                  controlBarProps={controlBarProps}
                />
              ) : (
                <AomiFrame.Composer />
              )}
            </AomiFrame.Root>
          </div>
        </div>

        {/* Right: Config sidebar */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="sticky top-20 space-y-5 rounded-xl border border-fd-border bg-fd-card p-4">
            {/* ── Sidebar ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
                Sidebar
              </legend>
              <Checkbox
                label="Shown"
                checked={state.sidebarShown}
                onChange={(v) => update({ sidebarShown: v })}
              />
              {state.sidebarShown && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-fd-muted-foreground/70">
                    Wallet Position
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { value: "header", label: "Header" },
                        { value: "footer", label: "Footer" },
                        { value: "hidden", label: "Hidden" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          state.walletPosition === opt.value
                            ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
                            : "border-fd-border text-fd-muted-foreground hover:border-fd-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="walletPosition"
                          value={opt.value}
                          checked={state.walletPosition === opt.value}
                          onChange={() =>
                            update({
                              walletPosition: opt.value as WalletPosition,
                            })
                          }
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>

            {/* ── Control Panel ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
                Control Panel
              </legend>
              {/* Header vs Composer placement */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { value: "header", label: "Header" },
                    { value: "composer", label: "Composer" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      state.controlPlacement === opt.value
                        ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
                        : "border-fd-border text-fd-muted-foreground hover:border-fd-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="controlPlacement"
                      value={opt.value}
                      checked={state.controlPlacement === opt.value}
                      onChange={() =>
                        update({
                          controlPlacement: opt.value as ControlPlacement,
                        })
                      }
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {/* Visibility toggles */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Checkbox
                  label="Model"
                  checked={state.showModel}
                  onChange={(v) => update({ showModel: v })}
                />
                <Checkbox
                  label="Namespace"
                  checked={state.showNamespace}
                  onChange={(v) => update({ showNamespace: v })}
                />
                <Checkbox
                  label="API Key"
                  checked={state.showApiKey}
                  onChange={(v) => update({ showApiKey: v })}
                />
                <Checkbox
                  label="Wallet"
                  checked={state.showWallet}
                  onChange={(v) => update({ showWallet: v })}
                />
                <Checkbox
                  label="Network"
                  checked={state.showNetwork}
                  onChange={(v) => update({ showNetwork: v })}
                />
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      {/* Generated code panel */}
      <div className="rounded-xl border border-fd-border">
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-2">
          <span className="text-xs font-semibold text-fd-muted-foreground">
            Generated Code
          </span>
          <CopyButton value={code} label="Copy" />
        </div>
        <pre className="overflow-x-auto bg-fd-secondary/30 px-4 py-3 text-xs leading-relaxed text-fd-foreground">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
