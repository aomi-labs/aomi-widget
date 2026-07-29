"use client";

import { Plug } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import {
  buildQueryKeys,
  buildQueryStaleTime,
  githubAccountKey,
} from "@build/features/launch/query-keys";
import { fetchIntegrationStatuses } from "./client";
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "./providers";

const INTEGRATIONS_SAVE_ENABLED = false;

function IntegrationCard({
  provider,
  connected,
}: {
  provider: IntegrationProvider;
  connected: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
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
          {connected ? "Connected" : "Coming soon"}
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
              disabled={!INTEGRATIONS_SAVE_ENABLED}
              onChange={(event) => {
                const next = event.target.value;
                setValues((current) => ({ ...current, [field.key]: next }));
              }}
              className="border-border bg-surface text-foreground h-9 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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
          disabled
          title="Coming soon"
          aria-label={`Save ${provider.name} (coming soon)`}
          className="bg-foreground text-background disabled:text-dim h-9 cursor-not-allowed rounded-md px-3 text-sm font-medium disabled:opacity-60"
        >
          Save · Soon
        </button>
      </div>

      <p className="text-dim text-xs">
        Saving credentials is coming soon. Docs stay available above.
      </p>
    </form>
  );
}

export function IntegrationsView() {
  const { account } = useGitHubSession();
  const accountKey = githubAccountKey(account.githubLogin);
  const statusQuery = useQuery({
    queryKey: buildQueryKeys.integrations(accountKey ?? "unavailable"),
    queryFn: fetchIntegrationStatuses,
    enabled: account.signedIn && accountKey !== null,
    staleTime: buildQueryStaleTime.integrations,
  });
  const connectedBy = useMemo(() => {
    const map = new Map<string, boolean>();
    // Status is non-blocking; the connect forms still render if it fails.
    for (const status of statusQuery.data?.statuses ?? [])
      map.set(status.provider, status.connected);
    return map;
  }, [statusQuery.data?.statuses]);

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Plug className="text-dim size-5" aria-hidden />
          <h1 className="font-display text-foreground text-xl font-normal tracking-tight">
            Integrations
          </h1>
        </div>
        <p className="text-dim mt-1.5 max-w-3xl text-sm leading-5">
          Connect bots and channels to your apps. Credential save is coming
          soon; docs links work today.
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
