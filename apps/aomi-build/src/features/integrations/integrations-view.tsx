"use client";

import { Plug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import {
  connectIntegration,
  fetchIntegrationStatuses,
  type IntegrationStatus,
} from "./client";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "./providers";

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string }
  | { status: "success" };

function IntegrationCard({
  provider,
  connected,
}: {
  provider: IntegrationProvider;
  connected: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSave({ status: "saving" });
    try {
      await connectIntegration({ provider: provider.id, values });
      setSave({ status: "success" });
    } catch (err) {
      setSave({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-border bg-surface-1 flex h-full flex-col gap-4 rounded-lg border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-foreground text-sm font-medium">
            {provider.name}
          </div>
          <p className="text-dim mt-2 text-[13px]">{provider.description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            connected
              ? "bg-emerald-50 text-emerald-700"
              : "border-border text-dim border"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {provider.fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-dim text-xs">
              {field.label}
              {field.required ? null : (
                <span className="text-dim/60"> (optional)</span>
              )}
            </span>
            <input
              type={field.secret ? "password" : "text"}
              autoComplete="off"
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(event) => {
                const next = event.target.value;
                setValues((current) => ({ ...current, [field.key]: next }));
                setSave({ status: "idle" });
              }}
              className="border-border bg-surface text-foreground h-9 rounded-md border px-2 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-dim hover:text-foreground text-xs underline underline-offset-2"
        >
          How to get a token
        </a>
        <button
          type="submit"
          disabled={save.status === "saving"}
          className="bg-foreground text-background disabled:text-dim h-9 rounded-md px-3 text-sm font-medium disabled:opacity-60"
        >
          {save.status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {save.status === "error" ? (
        <div className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-xs">
          {save.message}
        </div>
      ) : null}
      {save.status === "success" ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600">
          Saved.
        </div>
      ) : null}
    </form>
  );
}

export function IntegrationsView() {
  const { account } = useGitHubSession();
  const [statuses, setStatuses] = useState<IntegrationStatus[] | null>(null);

  useEffect(() => {
    if (!account.signedIn) {
      setStatuses(null);
      return;
    }
    let alive = true;
    fetchIntegrationStatuses()
      .then((result) => {
        if (alive) setStatuses(result.statuses);
      })
      .catch(() => {
        // Status is non-blocking; the connect forms still render if it fails.
        if (alive) setStatuses([]);
      });
    return () => {
      alive = false;
    };
  }, [account.signedIn]);

  const connectedBy = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const status of statuses ?? []) map.set(status.provider, status.connected);
    return map;
  }, [statuses]);

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <div className="space-y-2">
        <p className="text-dim text-[12px] uppercase tracking-wide">Account</p>
        <div className="flex items-center gap-2">
          <Plug className="text-dim size-5" />
          <h1 className="text-foreground text-2xl font-semibold">
            Integrations
          </h1>
        </div>
        <p className="text-subtle max-w-2xl text-sm">
          Connect bots and channels to your apps. Credentials stay on your
          account.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {INTEGRATION_PROVIDERS.map((provider) => (
          <IntegrationCard
            key={provider.id}
            provider={provider}
            connected={connectedBy.get(provider.id) ?? false}
          />
        ))}
      </section>
    </div>
  );
}
