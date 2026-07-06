"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
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

  useEffect(() => {
    if (!app && appNames.length > 0) setApp(appNames[0]);
  }, [app, appNames]);

  if (detail.secretsByApp === null) {
    return <LoadingPanel label="Loading environment…" />;
  }

  const currentHandles = app ? (detail.secretsByApp[app] ?? []) : [];

  const save = async () => {
    const secrets: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key && row.value.length > 0) secrets[key] = row.value;
    }
    if (Object.keys(secrets).length === 0) {
      setStatus({ kind: "error", message: "Add at least one KEY and value." });
      return;
    }
    setStatus({ kind: "saving", message: "Saving…" });
    try {
      const result = await detail.setEnvVars(app, secrets);
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

  return (
    <div className="divide-y divide-zinc-100">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Environment variables</div>
          {appNames.length > 1 && (
            <select
              value={app}
              onChange={(e) => setApp(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs"
            >
              {appNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Set secrets for <span className="font-mono">{app || "this app"}</span>
          . Values are stored in the secret vault and injected into the running
          app; they are never shown back.
        </p>

        <div className="mt-3 space-y-2">
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
            Save variables
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

      {currentHandles.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Configured
          </div>
          <ul className="mt-2 space-y-1">
            {currentHandles.map((handle) => (
              <li key={handle} className="font-mono text-xs text-zinc-600">
                {handle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
