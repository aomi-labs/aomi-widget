"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { LoadingPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;
type Row = { key: string; value: string };

export function EnvironmentTab({ detail }: { detail: Detail }) {
  useEffect(() => {
    detail.loadSecrets();
  }, [detail]);

  const appNames = useMemo(
    () => (detail.source?.apps ?? []).map((a) => a.name),
    [detail.source],
  );
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
      setRows([{ key: "", value: "" }]);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to save",
      });
    }
  };

  const remove = async (key: string) => {
    setStatus({ kind: "saving", message: `Deleting ${key}…` });
    try {
      await detail.deleteEnvVar(app, key);
      setStatus({ kind: "done", message: `Deleted ${key}.` });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to delete",
      });
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
    <div className="divide-y divide-zinc-100">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Environment</div>
          {appNames.length === 1 && (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600">
              {appNames[0]}
            </span>
          )}
        </div>
        {appNames.length > 1 && (
          <div
            role="tablist"
            aria-label="Application environment scope"
            className="mt-3 flex flex-wrap gap-1 rounded-md bg-zinc-100 p-1"
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
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {appNames.length === 0 && (
          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            No applications are attached to this project yet.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          One vault for{" "}
          <span className="font-mono">{app || "this app"}</span>. Add
          KEY=value pairs here — they are injected into the running app.
          Values are write-only (you cannot reveal them later). Builders set
          these; chat users never paste API keys.
        </p>
        {detail.secretsError && (
          <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {detail.secretsError}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
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
                className="h-8 w-40 rounded-md border border-zinc-300 px-2 font-mono text-xs"
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
                className="h-8 flex-1 rounded-md border border-zinc-300 px-2 text-xs"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium hover:bg-zinc-50"
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
            className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save values
          </button>
          {status.kind !== "idle" && (
            <span
              className={`text-xs ${
                status.kind === "error" ? "text-red-600" : "text-zinc-500"
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
      </div>

      {currentKeys.length > 0 ? (
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Configured
          </div>
          <ul className="mt-2 space-y-2">
            {currentKeys.map(({ handle, key }) => (
              <li
                key={handle}
                className="flex flex-wrap items-center justify-between gap-2 py-0.5"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-xs text-zinc-800">
                    {key}
                  </span>
                  <span className="rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                    Builder secret
                  </span>
                  <span className="rounded-sm border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    Runtime
                  </span>
                  <span
                    className="font-mono text-xs tracking-widest text-zinc-400"
                    title="Value is write-only and cannot be revealed"
                    aria-label="Value hidden"
                  >
                    ••••
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyKey(key)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                    title={`Copy ${key}`}
                  >
                    <Copy className="size-3.5" aria-hidden />
                    {copiedKey === key ? "Copied" : "Copy key"}
                  </button>
                  <button
                    type="button"
                    onClick={() => overwrite(key)}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                    title={`Overwrite ${key}`}
                  >
                    Overwrite
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(key)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-600"
                    title={`Delete ${key}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        appNames.length > 0 && (
          <div className="px-4 py-4 text-sm text-zinc-500">
            <p className="font-medium text-zinc-700">No variables yet</p>
            <p className="mt-1 text-xs leading-5">
              Add keys your agent needs (for example{" "}
              <span className="font-mono">BINANCE_API_KEY</span>). Builders set
              these here — chat users never paste API keys.
            </p>
          </div>
        )
      )}
    </div>
  );
}
