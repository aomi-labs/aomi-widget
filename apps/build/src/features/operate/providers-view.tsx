"use client";

// The global "Providers" page: builder-owned LLM model keys, provider-centric.
// One flat card per provider (header + divide-y key rows). Each key row is an
// accordion: click to expand an inline panel with key metadata, a framed
// project-assignment table, and rotate/remove flows. Key material is
// write-only — only the stored prefix is ever shown. (BE naming: model keys;
// UI naming: Providers.)
//
// Styling follows the settings-redesign inventory: rounded-xl cards/tables,
// rounded-lg in-card controls, 10px uppercase tracked micro-labels, neutral
// badges for facts and sky-tinted badges for state, mono for key prefixes,
// and the button ramp (accent commit + accent repair in flow, solid red pill
// for the destructive commit).

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import { API_PATHS } from "@build/lib/api-paths";
import { cn } from "@build/lib/utils";

export const PROVIDERS = ["openai", "anthropic", "openrouter"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
};

export type ModelKey = {
  id: number;
  provider: string;
  label: string | null;
  keyPrefix: string;
  createdAt: number;
  updatedAt: number;
  applicationIds: number[];
};

export type KeySource = {
  id: number;
  repositoryLink?: string | null;
  githubAccount?: string | null;
  apps?: { id: number; name: string }[];
};

export type ProvidersPayload = {
  sources?: KeySource[];
  keys?: ModelKey[];
};

export function keyDisplayName(key: ModelKey): string {
  return key.label?.trim() || `${key.keyPrefix}…`;
}

function formatTs(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** One project (application) option for the grant editor. */
type AppOption = { applicationId: number; name: string; sourceLabel: string };

function appOptions(sources: KeySource[]): AppOption[] {
  return sources.flatMap((source) =>
    (source.apps ?? []).map((app) => ({
      applicationId: app.id,
      name: app.name,
      sourceLabel:
        source.repositoryLink || source.githubAccount || `Source ${source.id}`,
    })),
  );
}

// ── shared bits ─────────────────────────────────────────────────────────────

/** 10px uppercase tracked micro-label — overlines, column heads. */
const MICRO = "text-[10px] font-semibold uppercase tracking-[0.07em] text-dim";

/** In-flow commit: sky solid, rounded-lg. */
const COMMIT_BTN =
  "bg-accent-selected text-accent-selected-foreground hover:opacity-90 inline-flex h-8 items-center justify-center rounded-lg px-3.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50";
/** In-flow repair: sky outline, rounded-lg. */
const REPAIR_BTN =
  "border-accent-selected/50 text-accent-selected hover:bg-accent-selected/10 inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[13px] font-medium disabled:opacity-50";
/** Quiet in-card action: neutral outline, rounded-lg. */
const OUTLINE_BTN =
  "border-border hover:bg-surface-2 text-foreground inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-medium disabled:opacity-50";
/** Text-only dismiss. */
const GHOST_BTN =
  "text-dim hover:text-foreground inline-flex h-8 items-center rounded-lg px-2.5 text-[13px]";
/** Destructive opener: quiet red text until the confirm step. */
const GHOST_DANGER_BTN =
  "text-destructive hover:bg-destructive/10 inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium disabled:opacity-50";
/** Destructive commit: solid red pill, same weight as an ink commit. */
const DANGER_BTN =
  "bg-destructive text-destructive-foreground hover:opacity-90 inline-flex h-8 items-center rounded-full px-4 text-[13px] font-medium disabled:opacity-50";
const INPUT =
  "bg-input text-foreground placeholder:text-dim h-8 rounded-lg border border-border px-2.5 text-[13px]";
const TH =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.07em] text-dim";

const BADGE =
  "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] whitespace-nowrap";

function StatusBadge({ projectCount }: { projectCount: number }) {
  return projectCount > 0 ? (
    <span
      className={cn(
        BADGE,
        "border-accent-selected/40 bg-accent-selected/10 text-accent-selected",
      )}
    >
      Active · {projectCount} project{projectCount === 1 ? "" : "s"}
    </span>
  ) : (
    <span className={cn(BADGE, "border-border bg-surface-2 text-dim")}>
      Unassigned
    </span>
  );
}

function CheckboxGlyph({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-transparent bg-accent-selected text-accent-selected-foreground"
          : "border-border-hover bg-transparent",
      )}
    >
      {checked ? <Check className="size-3" /> : null}
    </span>
  );
}

/** Label-over-value metadata cell. */
function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={MICRO}>{label}</div>
      <div className="text-foreground mt-0.5 text-xs">{children}</div>
    </div>
  );
}

// ── the project-assignment table ────────────────────────────────────────────

function ProjectsTable({
  keyRow,
  options,
  fundedBy,
  checked,
  onToggle,
}: {
  keyRow: ModelKey;
  options: AppOption[];
  /** applicationId -> key currently funding it for this provider. */
  fundedBy: Map<number, ModelKey>;
  checked: Set<number>;
  onToggle: (applicationId: number, isChecked: boolean) => void;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="min-w-[480px] w-full text-[13px]">
        <thead className="bg-surface-2">
          <tr>
            <th className={TH}>Project</th>
            <th className={TH}>Source</th>
            <th className={TH}>Funded by</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {options.map((option) => {
            const isChecked = checked.has(option.applicationId);
            const holder = fundedBy.get(option.applicationId);
            const stolen = holder && holder.id !== keyRow.id && isChecked;
            return (
              <tr
                key={option.applicationId}
                className={cn(
                  "border-border border-t transition-colors",
                  isChecked ? "bg-accent" : "hover:bg-surface-2/60",
                )}
              >
                <td className="px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      onChange={(event) =>
                        onToggle(option.applicationId, event.target.checked)
                      }
                    />
                    <CheckboxGlyph checked={isChecked} />
                    <span className="text-foreground truncate">
                      {option.name}
                    </span>
                  </label>
                </td>
                <td className="text-dim truncate px-3 py-2 text-xs">
                  {option.sourceLabel}
                </td>
                <td className="px-3 py-2 text-xs">
                  {stolen ? (
                    <span className="text-warning">
                      {keyDisplayName(holder)} — reassigns on save
                    </span>
                  ) : holder ? (
                    holder.id === keyRow.id ? (
                      <span className="text-foreground">This key</span>
                    ) : (
                      <span className="text-dim">{keyDisplayName(holder)}</span>
                    )
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── one key row (accordion) ─────────────────────────────────────────────────

function KeyRow({
  keyRow,
  options,
  fundedBy,
  onGrants,
  onRotate,
  onRemove,
  busy,
}: {
  keyRow: ModelKey;
  options: AppOption[];
  /** applicationId -> key currently funding it for this provider. */
  fundedBy: Map<number, ModelKey>;
  onGrants: (key: ModelKey, applicationIds: number[]) => Promise<void>;
  onRotate: (key: ModelKey, material: string) => Promise<void>;
  onRemove: (key: ModelKey) => Promise<void>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(keyRow.applicationIds),
  );
  const [flow, setFlow] = useState<"rotate" | "remove" | null>(null);
  const [material, setMaterial] = useState("");

  useEffect(() => {
    setChecked(new Set(keyRow.applicationIds));
  }, [keyRow.applicationIds]);

  const dirty =
    checked.size !== keyRow.applicationIds.length ||
    keyRow.applicationIds.some((id) => !checked.has(id));
  const projectCount = keyRow.applicationIds.length;
  const rotated = keyRow.updatedAt > keyRow.createdAt;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setFlow(null);
          setMaterial("");
          setChecked(new Set(keyRow.applicationIds));
        }}
        aria-expanded={open}
        className="hover:bg-surface-2/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-foreground truncate text-[13px] font-medium",
                !keyRow.label?.trim() && "font-mono",
              )}
            >
              {keyDisplayName(keyRow)}
            </span>
            <StatusBadge projectCount={projectCount} />
          </div>
          <div className="text-dim mt-0.5 text-[11px]">
            {keyRow.label?.trim() ? (
              <>
                <span className="font-mono">{keyRow.keyPrefix}…</span>
                {" · "}
              </>
            ) : null}
            added {formatTs(keyRow.createdAt)}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "text-dim size-4 shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-4 px-4 pt-1 pb-4">
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <MetaCell label="Key">
              <span className="font-mono">{keyRow.keyPrefix}…</span>
            </MetaCell>
            <MetaCell label="Added">{formatTs(keyRow.createdAt)}</MetaCell>
            {rotated ? (
              <MetaCell label="Rotated">{formatTs(keyRow.updatedAt)}</MetaCell>
            ) : null}
          </div>

          <div>
            <div className={MICRO}>Projects</div>
            <p className="text-dim mt-0.5 mb-2 text-xs">
              One key per provider per project — checking a project already
              funded by another key reassigns it.
            </p>
            {options.length === 0 ? (
              <p className="text-dim text-xs">
                No deployed projects available for this account.
              </p>
            ) : (
              <ProjectsTable
                keyRow={keyRow}
                options={options}
                fundedBy={fundedBy}
                checked={checked}
                onToggle={(applicationId, isChecked) => {
                  setChecked((current) => {
                    const next = new Set(current);
                    if (isChecked) next.add(applicationId);
                    else next.delete(applicationId);
                    return next;
                  });
                }}
              />
            )}
            {dirty ? (
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChecked(new Set(keyRow.applicationIds))}
                  className={GHOST_BTN}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onGrants(keyRow, [...checked])}
                  className={COMMIT_BTN}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="border-border border-t pt-3">
            {flow === null ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMaterial("");
                    setFlow("rotate");
                  }}
                  className={REPAIR_BTN}
                >
                  Rotate
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFlow("remove")}
                  className={GHOST_DANGER_BTN}
                >
                  Remove
                </button>
              </div>
            ) : flow === "rotate" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  autoFocus
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Paste the new key — assignments are kept"
                  className={cn(INPUT, "min-w-[220px] flex-1")}
                />
                <button
                  type="button"
                  disabled={!material.trim() || busy}
                  onClick={() =>
                    void onRotate(keyRow, material.trim()).then(() => {
                      setMaterial("");
                      setFlow(null);
                    })
                  }
                  className={COMMIT_BTN}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setFlow(null)}
                  className={GHOST_BTN}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-dim min-w-0 flex-1 text-xs leading-snug">
                  {projectCount > 0 ? (
                    <>
                      This key currently funds{" "}
                      <span className="text-foreground">
                        {projectCount} project{projectCount === 1 ? "" : "s"}
                      </span>
                      ; they fall back to platform keys. This can&apos;t be
                      undone.
                    </>
                  ) : (
                    <>This key is unassigned. This can&apos;t be undone.</>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setFlow(null)}
                  className={GHOST_BTN}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(keyRow)}
                  className={DANGER_BTN}
                >
                  {busy ? "Removing…" : "Remove key"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── one provider section ────────────────────────────────────────────────────

function ProviderSection({
  provider,
  keys,
  options,
  onCreate,
  onGrants,
  onRotate,
  onRemove,
  busy,
}: {
  provider: Provider;
  keys: ModelKey[];
  options: AppOption[];
  onCreate: (
    provider: Provider,
    material: string,
    label: string,
  ) => Promise<void>;
  onGrants: (key: ModelKey, applicationIds: number[]) => Promise<void>;
  onRotate: (key: ModelKey, material: string) => Promise<void>;
  onRemove: (key: ModelKey) => Promise<void>;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [material, setMaterial] = useState("");
  const [label, setLabel] = useState("");
  const fundedBy = useMemo(() => {
    const map = new Map<number, ModelKey>();
    for (const key of keys) {
      for (const id of key.applicationIds) map.set(id, key);
    }
    return map;
  }, [keys]);

  const closeForm = () => {
    setMaterial("");
    setLabel("");
    setAdding(false);
  };

  return (
    <section className="border-border bg-surface-1 rounded-xl border">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <h2 className="text-[13px] font-medium">{PROVIDER_LABELS[provider]}</h2>
        <span className="text-dim text-[11px]">
          {keys.length === 0
            ? "No keys"
            : `${keys.length} key${keys.length === 1 ? "" : "s"}`}
        </span>
        <button
          type="button"
          onClick={() => (adding ? closeForm() : setAdding(true))}
          disabled={busy}
          aria-expanded={adding}
          className={cn(OUTLINE_BTN, "ml-auto", adding && "bg-surface-2")}
        >
          + Add key
        </button>
      </div>

      {adding || keys.length > 0 ? (
        <div className="divide-border border-border divide-y border-t">
          {adding ? (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Label (optional), e.g. prod-main"
                className={cn(INPUT, "w-52")}
              />
              <input
                type="password"
                autoFocus
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                placeholder={`Paste your ${PROVIDER_LABELS[provider]} API key`}
                className={cn(INPUT, "min-w-[220px] flex-1")}
              />
              <button
                type="button"
                disabled={!material.trim() || busy}
                onClick={() =>
                  void onCreate(provider, material.trim(), label.trim()).then(
                    closeForm,
                  )
                }
                className={COMMIT_BTN}
              >
                {busy ? "Adding…" : "Add key"}
              </button>
              <button type="button" onClick={closeForm} className={GHOST_BTN}>
                Cancel
              </button>
            </div>
          ) : null}

          {keys.map((key) => (
            <KeyRow
              key={key.id}
              keyRow={key}
              options={options}
              fundedBy={fundedBy}
              onGrants={onGrants}
              onRotate={onRotate}
              onRemove={onRemove}
              busy={busy}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ── the page ────────────────────────────────────────────────────────────────

export function ProvidersView() {
  const { account } = useGitHubSession();
  const [payload, setPayload] = useState<ProvidersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(API_PATHS.bff.operate.modelKeys);
    const json = (await res.json().catch(() => ({}))) as ProvidersPayload & {
      error?: string;
    };
    if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
    setPayload(json);
  }, []);

  useEffect(() => {
    if (account.loading) {
      setLoading(true);
      setError(null);
      setPayload(null);
      return;
    }
    if (!account.signedIn) {
      setLoading(false);
      setError(null);
      setPayload(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    reload()
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [account.loading, account.signedIn, reload]);

  const options = useMemo(
    () => appOptions(payload?.sources ?? []),
    [payload?.sources],
  );
  const keysByProvider = useMemo(() => {
    const map = new Map<string, ModelKey[]>();
    for (const key of payload?.keys ?? []) {
      map.set(key.provider, [...(map.get(key.provider) ?? []), key]);
    }
    return map;
  }, [payload?.keys]);

  const run = useCallback(
    async (op: () => Promise<Response>) => {
      setBusy(true);
      setFormError(null);
      try {
        const res = await op();
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
        await reload();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : String(err));
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const onCreate = useCallback(
    (provider: Provider, material: string, label: string) =>
      run(() =>
        fetch(API_PATHS.bff.operate.modelKeys, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            key: material,
            label: label || undefined,
          }),
        }),
      ),
    [run],
  );
  const onRotate = useCallback(
    (key: ModelKey, material: string) =>
      run(() =>
        fetch(API_PATHS.bff.operate.modelKeys, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyId: key.id,
            provider: key.provider,
            key: material,
            label: key.label ?? undefined,
          }),
        }),
      ),
    [run],
  );
  const onGrants = useCallback(
    (key: ModelKey, applicationIds: number[]) =>
      run(() =>
        fetch(API_PATHS.bff.operate.modelKeys, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyId: key.id, applicationIds }),
        }),
      ),
    [run],
  );
  const onRemove = useCallback(
    (key: ModelKey) =>
      run(() =>
        fetch(`${API_PATHS.bff.operate.modelKeys}?keyId=${key.id}`, {
          method: "DELETE",
        }),
      ),
    [run],
  );

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }
  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-xl font-semibold tracking-[-0.01em]">Providers</h1>
        <p className="text-subtle mt-1.5 max-w-2xl text-[13px] leading-relaxed">
          Your keys fund inference for your apps&apos; users — model cost is
          waived when a key covers their selected model.
        </p>
        <p className="text-dim mt-1 max-w-2xl text-xs leading-relaxed">
          Keys are encrypted and never shown again. App tool secrets live in
          each project&apos;s Environment.
        </p>
      </header>

      {formError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-[13px]">
          {formError}
        </div>
      ) : null}

      {loading ? (
        <div className="border-border bg-surface-1 text-dim rounded-xl border px-4 py-10 text-center text-[13px]">
          Loading
        </div>
      ) : error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-[13px]">
          {error}
        </div>
      ) : (
        PROVIDERS.map((provider) => (
          <ProviderSection
            key={provider}
            provider={provider}
            keys={keysByProvider.get(provider) ?? []}
            options={options}
            onCreate={onCreate}
            onGrants={onGrants}
            onRotate={onRotate}
            onRemove={onRemove}
            busy={busy}
          />
        ))
      )}
    </div>
  );
}
