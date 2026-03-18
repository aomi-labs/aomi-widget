"use client";

import { useState, useMemo, useCallback, type FC } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { CopyButton } from "./CopyButton";
import {
  ThemeCustomizer,
  useThemeCustomizer,
} from "./ThemeCustomizer";

// =============================================================================
// Types
// =============================================================================

type ConfigTab = "layout" | "theme";
type CodeTab = "jsx" | "css";
type WalletPosition = "header" | "footer" | "hidden";
type ControlPlacement = "header" | "composer";

type PlaygroundState = {
  sidebarShown: boolean;
  walletPosition: WalletPosition;
  controlPlacement: ControlPlacement;
  showModel: boolean;
  showApp: boolean;
  showApiKey: boolean;
  showWallet: boolean;
  showNetwork: boolean;
};

const DEFAULT_STATE: PlaygroundState = {
  sidebarShown: true,
  walletPosition: "footer",
  controlPlacement: "header",
  showModel: true,
  showApp: true,
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
    s.showModel || s.showApp || s.showApiKey || s.showWallet || s.showNetwork;

  const controlBarEntries: string[] = [];
  if (!s.showNetwork) controlBarEntries.push("hideNetwork: true");
  if (!s.showModel) controlBarEntries.push("hideModel: true");
  if (!s.showApp) controlBarEntries.push("hideApp: true");
  if (!s.showApiKey) controlBarEntries.push("hideApiKey: true");
  if (s.showWallet) controlBarEntries.push("hideWallet: false");

  const controlBarPropsStr =
    controlBarEntries.length > 0
      ? ` controlBarProps={{ ${controlBarEntries.join(", ")} }}`
      : "";

  const rootProps: string[] = ['height="560px"'];
  if (!s.sidebarShown) {
    rootProps.push("showSidebar={false}");
    rootProps.push("walletPosition={null}");
  } else if (s.walletPosition !== "footer") {
    rootProps.push(`walletPosition={${walletProp}}`);
  }

  const headerWithControl =
    hasAnyControl && s.controlPlacement === "header";
  const composerWithControl =
    hasAnyControl && s.controlPlacement === "composer";

  const sidebarTriggerStr = !s.sidebarShown ? " showSidebarTrigger={false}" : "";

  let headerLine: string;
  if (headerWithControl) {
    headerLine = `  <AomiFrame.Header${sidebarTriggerStr} withControl${controlBarPropsStr} />`;
  } else {
    headerLine = `  <AomiFrame.Header${sidebarTriggerStr} />`;
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

/** Pill-style tab buttons for the config sidebar & code panel. */
const TabBar: FC<{
  tabs: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1">
    {tabs.map((t) => (
      <button
        key={t.value}
        type="button"
        onClick={() => onChange(t.value)}
        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
          active === t.value
            ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
            : "border-fd-border text-fd-muted-foreground hover:border-fd-primary/40"
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

// =============================================================================
// Layout config panel (original controls)
// =============================================================================

const LayoutPanel: FC<{
  state: PlaygroundState;
  update: (patch: Partial<PlaygroundState>) => void;
}> = ({ state, update }) => (
  <div className="space-y-5">
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
                    update({ walletPosition: opt.value as WalletPosition })
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
                update({ controlPlacement: opt.value as ControlPlacement })
              }
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Checkbox
          label="Model"
          checked={state.showModel}
          onChange={(v) => update({ showModel: v })}
        />
        <Checkbox
          label="App"
          checked={state.showApp}
          onChange={(v) => update({ showApp: v })}
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
);

// =============================================================================
// Main Playground
// =============================================================================

export function PlaygroundConfigurator() {
  const [state, setState] = useState<PlaygroundState>(DEFAULT_STATE);
  const [configTab, setConfigTab] = useState<ConfigTab>("layout");
  const [codeTab, setCodeTab] = useState<CodeTab>("jsx");

  const update = useCallback(
    (patch: Partial<PlaygroundState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const jsxCode = useMemo(() => generateCode(state), [state]);

  // Theme customizer state
  const theme = useThemeCustomizer();

  const walletPropValue =
    !state.sidebarShown || state.walletPosition === "hidden"
      ? undefined
      : state.walletPosition;

  const controlBarProps = useMemo(
    () => ({
      hideNetwork: !state.showNetwork,
      hideModel: !state.showModel,
      hideApp: !state.showApp,
      hideApiKey: !state.showApiKey,
      hideWallet: !state.showWallet,
    }),
    [state],
  );

  const hasAnyControl =
    state.showModel ||
    state.showApp ||
    state.showApiKey ||
    state.showWallet ||
    state.showNetwork;

  const activeCode = codeTab === "jsx" ? jsxCode : theme.output.css;

  return (
    <div className="space-y-4">
      {/* Main split panel */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left: Live preview */}
        <div className="min-w-0 flex-1">
          <div
            className={`overflow-hidden rounded-xl border border-fd-border ${
              theme.output.isDark ? "dark" : ""
            }`}
            style={theme.output.styleObject}
          >
            <AomiFrame.Root
              height="560px"
              walletPosition={walletPropValue ?? null}
              showSidebar={state.sidebarShown}
            >
              {hasAnyControl && state.controlPlacement === "header" ? (
                <AomiFrame.Header
                  showSidebarTrigger={state.sidebarShown}
                  withControl
                  controlBarProps={controlBarProps}
                />
              ) : (
                <AomiFrame.Header showSidebarTrigger={state.sidebarShown} />
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

        {/* Right: Config sidebar with tabs */}
        <div className="w-full shrink-0 lg:w-72" style={{ height: 560 }}>
          <div className="flex h-full flex-col rounded-xl border border-fd-border bg-fd-card">
            {/* Tab header */}
            <div className="border-b border-fd-border px-4 py-3">
              <TabBar
                tabs={[
                  { value: "layout", label: "Layout" },
                  { value: "theme", label: "Theme" },
                ]}
                active={configTab}
                onChange={(v) => setConfigTab(v as ConfigTab)}
              />
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {configTab === "layout" ? (
                <LayoutPanel state={state} update={update} />
              ) : (
                <ThemeCustomizer
                  state={theme.state}
                  preset={theme.preset}
                  selectPreset={theme.selectPreset}
                  update={theme.update}
                  setColorOverride={theme.setColorOverride}
                  clearColorOverride={theme.clearColorOverride}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generated code panel with tabs */}
      <div className="rounded-xl border border-fd-border">
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-2">
          <TabBar
            tabs={[
              { value: "jsx", label: "JSX" },
              { value: "css", label: "Theme CSS" },
            ]}
            active={codeTab}
            onChange={(v) => setCodeTab(v as CodeTab)}
          />
          <CopyButton value={activeCode} label="Copy" />
        </div>
        <pre className="overflow-x-auto bg-fd-secondary/30 px-4 py-3 text-xs leading-relaxed text-fd-foreground">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
}
