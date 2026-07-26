"use client";

// Project-scoped lens on the builder's provider keys: which providers fund
// THIS project's apps, via which key. Read-mostly — apply/remove toggles
// grants for this project's apps; key management (add/rotate/remove) lives
// on the global Providers page.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { API_PATHS } from "@build/lib/api-paths";
import {
  keyDisplayName,
  PROVIDER_LABELS,
  PROVIDERS,
  type ModelKey,
  type Provider,
  type ProvidersPayload,
} from "@build/features/operate/providers-view";

type Detail = ReturnType<typeof useProjectDetail>;

export function ProvidersTab({ detail }: { detail: Detail }) {
  const [keys, setKeys] = useState<ModelKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const appIds = useMemo(
    () => (detail.source?.apps ?? []).map((app: { id: number }) => app.id),
    [detail.source?.apps],
  );

  const reload = useCallback(async () => {
    const res = await fetch(API_PATHS.bff.operate.modelKeys);
    const json = (await res.json().catch(() => ({}))) as ProvidersPayload & {
      error?: string;
    };
    if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
    setKeys(json.keys ?? []);
  }, []);

  useEffect(() => {
    reload().catch((err) =>
      setError(err instanceof Error ? err.message : String(err)),
    );
  }, [reload]);

  /** The key funding any of this project's apps for `provider`, if any. */
  const fundingKey = useCallback(
    (provider: Provider): ModelKey | undefined =>
      (keys ?? []).find(
        (key) =>
          key.provider === provider &&
          key.applicationIds.some((id) => appIds.includes(id)),
      ),
    [keys, appIds],
  );

  /** Any key of this provider the builder owns (candidate to apply). */
  const candidateKey = useCallback(
    (provider: Provider): ModelKey | undefined =>
      (keys ?? []).find((key) => key.provider === provider),
    [keys],
  );

  const setGrants = useCallback(
    async (key: ModelKey, applicationIds: number[]) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(API_PATHS.bff.operate.modelKeys, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyId: key.id, applicationIds }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const apply = useCallback(
    (key: ModelKey) =>
      setGrants(key, [...new Set([...key.applicationIds, ...appIds])]),
    [setGrants, appIds],
  );
  const remove = useCallback(
    (key: ModelKey) =>
      setGrants(
        key,
        key.applicationIds.filter((id) => !appIds.includes(id)),
      ),
    [setGrants, appIds],
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-base font-medium">Providers</h2>
        <p className="text-dim mt-1 text-sm">
          Providers funding this project&apos;s users — their model cost is
          waived when your key covers their selected model. Manage keys on the{" "}
          <Link href="/providers" className="text-foreground underline">
            Providers page
          </Link>
          . App tool secrets live in Environment, not here.
        </p>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      {keys === null ? (
        <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-8 text-center text-sm">
          Loading
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {PROVIDERS.map((provider) => {
                const funded = fundingKey(provider);
                const candidate = candidateKey(provider);
                return (
                  <tr key={provider}>
                    <td className="text-foreground px-3 py-2">
                      {PROVIDER_LABELS[provider]}
                    </td>
                    <td className="text-dim px-3 py-2">
                      {funded ? "Funding this project" : "Not applied"}
                    </td>
                    <td className="text-dim px-3 py-2 font-mono text-xs">
                      {funded
                        ? `${keyDisplayName(funded)} (${funded.keyPrefix}…)`
                        : candidate
                          ? `${keyDisplayName(candidate)} available`
                          : "No key saved"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {funded ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(funded)}
                          className="border-border hover:bg-accent-hover text-dim h-7 rounded-md border px-2 text-xs disabled:opacity-50"
                        >
                          Remove from project
                        </button>
                      ) : candidate ? (
                        <button
                          type="button"
                          disabled={busy || appIds.length === 0}
                          onClick={() => void apply(candidate)}
                          className="border-border hover:bg-accent-hover text-foreground h-7 rounded-md border px-2 text-xs disabled:opacity-50"
                        >
                          Apply to project
                        </button>
                      ) : (
                        <Link
                          href="/providers"
                          className="text-dim text-xs underline"
                        >
                          Add a key
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
