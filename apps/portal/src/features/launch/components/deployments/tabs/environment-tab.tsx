"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Icons, PortalIcon } from "@portal/components/icons";
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
  const [envRows, setEnvRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [secretRows, setSecretRows] = useState<Row[]>([{ key: "", value: "" }]);
  const [status, setStatus] = useState<{
    kind: "idle" | "saving" | "done" | "error";
    message: string;
  }>({ kind: "idle", message: "" });

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
    for (const row of [...envRows, ...secretRows]) {
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
      setEnvRows([{ key: "", value: "" }]);
      setSecretRows([{ key: "", value: "" }]);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to save",
      });
    }
  };

  const remove = async (key: string) => {
    setStatus({ kind: "saving", message: `Removing ${key}…` });
    try {
      await detail.deleteEnvVar(app, key);
      setStatus({ kind: "done", message: `Removed ${key}.` });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to remove",
      });
    }
  };

  return (
    <div className="divide-y divide-zinc-100">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Environment variables</div>
          {appNames.length === 1 && (
            <span className="aomi-numeric rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
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
                className={`aomi-numeric h-7 rounded px-2.5 text-xs font-medium ${
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
        <p className="mt-3 text-xs text-zinc-500">
          Set environment values for{" "}
          <span className="aomi-numeric">{app || "this app"}</span>. Secrets are
          masked while editing and all saved values are injected into the
          running app.
        </p>
        {detail.secretsError && (
          <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {detail.secretsError}
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <ValueEditor
          title="Environment variables"
          badge="Env"
          rows={envRows}
          setRows={setEnvRows}
          valueType="text"
          addLabel="Add environment variable"
        />

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <ValueEditor
            title="Secrets"
            badge="Secret"
            rows={secretRows}
            setRows={setSecretRows}
            valueType="password"
            addLabel="Add secret"
          />
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

      {currentKeys.length > 0 && (
        <div className="px-4 py-3">
          <div className="aomi-eyebrow text-zinc-400">Configured</div>
          <ul className="mt-2 space-y-1">
            {currentKeys.map(({ handle, key }) => (
              <li
                key={handle}
                className="flex items-center justify-between gap-3 py-0.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="aomi-eyebrow rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
                    Secret
                  </span>
                  <span className="aomi-numeric truncate text-xs text-zinc-600">
                    {key}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void remove(key)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-600"
                  title={`Remove ${key}`}
                >
                  <PortalIcon icon={Icons.Trash2} size={14} aria-hidden />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ValueEditor({
  title,
  badge,
  rows,
  setRows,
  valueType,
  addLabel,
}: {
  title: string;
  badge: "Env" | "Secret";
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
  valueType: "text" | "password";
  addLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="aomi-eyebrow text-zinc-400">{title}</div>
        <span
          className={`aomi-eyebrow rounded-sm border px-1.5 py-0.5 ${
            badge === "Env"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {badge}
        </span>
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
              aria-label={`${title} key`}
              className="aomi-numeric h-8 w-40 rounded-md border border-zinc-300 px-2 text-xs"
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
              aria-label={`${title} value`}
              type={valueType}
              className="h-8 flex-1 rounded-md border border-zinc-300 px-2 text-xs"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium hover:bg-zinc-50"
        >
          <PortalIcon icon={Icons.Plus} size={14} aria-hidden />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
