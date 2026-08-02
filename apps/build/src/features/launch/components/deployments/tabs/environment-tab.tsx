"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useToast } from "@build/components/control-plane/toast";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { BUILD_GLOSSARY } from "@build/lib/glossary";
import { humanizeUserError } from "@build/lib/humanize-error";
import { LoadingPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;
type Row = { key: string; value: string };

/** One entry in the unified variables list: a slot the app declares in its
 * manifest and/or a key already configured in the vault. */
type VariableRow = {
  key: string;
  /** Vault handle when the key is configured (used as a stable list key). */
  handle: string | null;
  configured: boolean;
  /** Declared in the release manifest (has description + required flag). */
  declared: boolean;
  required: boolean;
  description: string;
};

export function EnvironmentTab({ detail }: { detail: Detail }) {
  const { toast } = useToast();
  useEffect(() => {
    detail.loadSecrets();
    detail.loadRequiredSecrets();
  }, [detail]);

  // Apps come from the source, plus any app the required-secret check knows
  // about. The two can diverge: a deploy re-syncs the source from the repo and
  // gates on the freshly registered apps, so an app can be named in a "missing
  // required secrets" error before this page's source snapshot lists it. Union
  // them or that app has no row here and its secret can never be entered.
  const appNames = useMemo(() => {
    const names = (detail.source?.apps ?? []).map((a) => a.name);
    const known = new Set(names);
    for (const name of Object.keys(detail.requiredSecrets ?? {})) {
      if (!known.has(name)) names.push(name);
    }
    return names;
  }, [detail.source, detail.requiredSecrets]);
  const [app, setApp] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [status, setStatus] = useState<{
    kind: "idle" | "saving" | "done" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if ((!app || !appNames.includes(app)) && appNames.length > 0) {
      setApp(appNames[0]);
    }
  }, [app, appNames]);

  if (detail.secretsByApp === null && !detail.secretsError) {
    return <LoadingPanel label="Loading environment…" />;
  }

  // Handle names read back from the vault (values are never returned). The
  // backend keys these by `$SECRET:APP:<app>::<KEY>`; strip that for display.
  const currentKeys = (app ? (detail.secretsByApp?.[app] ?? []) : []).map(
    (handle) => ({ handle, key: handle.split("::").pop() ?? handle }),
  );

  const required = app ? detail.requiredSecrets?.[app] : undefined;
  const missingCount = required?.missing.length ?? 0;

  // One unified list: declared slots (manifest) merged with configured keys
  // (vault). Missing required slots sort first so the warning reads next to
  // its cause; custom configured keys follow the declared ones.
  const configuredByKey = new Map(currentKeys.map((k) => [k.key, k.handle]));
  const declaredNames = new Set((required?.slots ?? []).map((s) => s.name));
  const declaredRows: VariableRow[] = (required?.slots ?? []).map((slot) => ({
    key: slot.name,
    handle: configuredByKey.get(slot.name) ?? null,
    configured: configuredByKey.has(slot.name),
    declared: true,
    required: slot.required,
    description: slot.description,
  }));
  declaredRows.sort(
    (a, b) =>
      Number(b.required && !b.configured) - Number(a.required && !a.configured),
  );
  const customRows: VariableRow[] = currentKeys
    .filter(({ key }) => !declaredNames.has(key))
    .map(({ handle, key }) => ({
      key,
      handle,
      configured: true,
      declared: false,
      required: false,
      description: "",
    }));
  const variableRows = [...declaredRows, ...customRows];
  const hasRequired = declaredRows.some((row) => row.required);

  const save = async () => {
    const values: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key && row.value.length > 0) values[key] = row.value;
    }
    if (Object.keys(values).length === 0) {
      setStatus({ kind: "error", message: "Add at least one KEY and value." });
      return;
    }
    setStatus({ kind: "saving", message: "Saving…" });
    try {
      const result = await detail.setEnvVars(app, values);
      setStatus({
        kind: "done",
        message: `Saved ${result.keys.length} variable(s).`,
      });
      toast({ title: "Saved", tone: "success" });
      setRows([{ key: "", value: "" }]);
    } catch (err) {
      setStatus({
        kind: "error",
        message: humanizeUserError(err, "Could not save. Try again."),
      });
      toast({ title: "Failed. Retry", tone: "error" });
    }
  };

  const remove = async (key: string) => {
    setStatus({ kind: "saving", message: `Deleting ${key}…` });
    try {
      await detail.deleteEnvVar(app, key);
      setStatus({ kind: "done", message: `Deleted ${key}.` });
      toast({ title: "Deleted", tone: "success" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: humanizeUserError(err, "Could not delete. Try again."),
      });
      toast({ title: "Failed. Retry", tone: "error" });
    }
  };

  const overwrite = (key: string) => {
    setRows([{ key, value: "" }]);
    setStatus({
      kind: "idle",
      message: "",
    });
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1500);
    } catch {
      setStatus({
        kind: "error",
        message: "Could not copy key name.",
      });
    }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Environment</div>
          {appNames.length === 1 && (
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-dim">
              {appNames[0]}
            </span>
          )}
        </div>
        {appNames.length > 1 && (
          <div
            role="tablist"
            aria-label="Application environment scope"
            className="mt-3 flex flex-wrap gap-1 rounded-md bg-surface-2 p-1"
          >
            {appNames.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={app === name}
                onClick={() => setApp(name)}
                className={`h-7 rounded px-2.5 font-mono text-xs font-medium ${
                  app === name
                    ? "bg-surface-1 text-foreground shadow-sm"
                    : "text-dim hover:text-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {appNames.length === 0 && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-dim">
            No applications are attached to this project yet.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-dim">
          {BUILD_GLOSSARY.environment.meaning} Add KEY=value pairs for{" "}
          <span className="font-mono">{app || "this app"}</span>. Values are
          write-only. Builders set these; chat users never paste API keys.
        </p>
        {detail.secretsError && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {humanizeUserError(
              detail.secretsError,
              "Could not load environment. Try again.",
            )}
          </div>
        )}
        {/* Without this the declared slots just silently fail to appear, which
         * reads as "this app has no required secrets" — the opposite of true. */}
        {detail.requiredSecretsError && (
          <div className="border-warning/40 bg-warning/10 text-warning mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-xs">
            <span>
              Required secrets could not be verified, so declared variables are
              not listed.
            </span>
            <button
              type="button"
              onClick={() =>
                void detail.refreshRequiredSecrets().catch(() => undefined)
              }
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {variableRows.length > 0 ? (
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-dim">
            Variables
          </div>
          {missingCount > 0 && (
            <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {missingCount} required secret{missingCount === 1 ? "" : "s"}{" "}
              missing. This app cannot be activated until every required value
              is set.
            </div>
          )}
          <ul className="mt-2 space-y-2">
            {variableRows.map((row) => (
              <li
                key={row.handle ?? row.key}
                className="flex flex-wrap items-start justify-between gap-2 py-0.5"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-xs text-foreground">
                      {row.key}
                      {row.required && (
                        <span
                          className="text-warning"
                          title="Required"
                          aria-label="Required"
                        >
                          {" *"}
                        </span>
                      )}
                    </span>
                    {row.configured ? (
                      <>
                        <span className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                          Builder secret
                        </span>
                        <span className="rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-dim">
                          Runtime
                        </span>
                        <span
                          className="font-mono text-xs tracking-widest text-dim"
                          title="Value is write-only and cannot be revealed"
                          aria-label="Value hidden"
                        >
                          ••••
                        </span>
                      </>
                    ) : (
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          row.required
                            ? "border-warning/40 bg-warning/10 text-warning"
                            : "border-border bg-surface-2 text-dim"
                        }`}
                      >
                        Not set
                      </span>
                    )}
                  </span>
                  {row.description && (
                    <span className="text-xs leading-5 text-dim">
                      {row.description}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {row.configured ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void copyKey(row.key)}
                        className="inline-flex items-center gap-1 text-xs text-dim hover:text-foreground"
                        title={`Copy ${row.key}`}
                      >
                        <Copy className="size-3.5" aria-hidden />
                        {copiedKey === row.key ? "Copied" : "Copy key"}
                      </button>
                      <button
                        type="button"
                        onClick={() => overwrite(row.key)}
                        className="text-xs text-dim hover:text-foreground"
                        title={`Overwrite ${row.key}`}
                      >
                        Overwrite
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row.key)}
                        className="inline-flex items-center gap-1 text-xs text-dim hover:text-destructive"
                        title={`Delete ${row.key}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => overwrite(row.key)}
                      className="rounded-md border border-border bg-surface-1 px-2 py-1 text-xs font-medium hover:bg-accent-hover"
                      title={`Set ${row.key}`}
                    >
                      Set value
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {hasRequired && (
            <p className="mt-2 text-xs text-dim">
              <span className="text-warning">*</span> Required — the app cannot
              be activated without it.
            </p>
          )}
        </div>
      ) : (
        appNames.length > 0 && (
          <div className="px-4 py-4 text-sm text-dim">
            <p className="font-medium text-foreground">No variables yet</p>
            <p className="mt-1 text-xs leading-5">
              Add keys your agent needs (for example{" "}
              <span className="font-mono">BINANCE_API_KEY</span>). Chat users
              never paste API keys.
            </p>
          </div>
        )
      )}

      <div className="px-4 py-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">
          Add or overwrite
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.key}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, j) =>
                      j === i ? { ...r, key: e.target.value } : r,
                    ),
                  )
                }
                placeholder="KEY"
                aria-label="Environment key"
                className="bg-input text-foreground h-8 w-40 rounded-md border border-border px-2 font-mono text-xs"
              />
              <input
                value={row.value}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, j) =>
                      j === i ? { ...r, value: e.target.value } : r,
                    ),
                  )
                }
                placeholder="value"
                aria-label="Environment value"
                type="password"
                className="bg-input text-foreground h-8 flex-1 rounded-md border border-border px-2 text-xs"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-1 px-2 text-xs font-medium hover:bg-accent-hover"
          >
            <Plus className="size-3.5" aria-hidden />
            Add variable
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={!app || status.kind === "saving"}
            onClick={() => void save()}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save values
          </button>
          {status.kind !== "idle" && (
            <span
              className={`text-xs ${
                status.kind === "error" ? "text-destructive" : "text-dim"
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
