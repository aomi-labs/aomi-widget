"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppDetailView } from "./app-detail-view";
import { operateAppDetailFetch } from "./client";
import {
  liveAppDetailView,
  type LiveAppDetailPayload,
} from "./live-app-detail";

function operateHref(
  path: string,
  values: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  return `${path}${params.size ? `?${params}` : ""}`;
}

export function AppDetailPage({
  applicationId,
  project,
}: {
  applicationId: number;
  project: number;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [payload, setPayload] = useState<LiveAppDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setError(null);
    operateAppDetailFetch<LiveAppDetailPayload>(project, applicationId)
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Detail request failed",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, attempt, project]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-20 text-center">
        <h1 className="text-lg font-semibold">Observability unavailable</h1>
        <p className="text-dim text-sm">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="border-border bg-surface hover:bg-accent-hover rounded-md border px-3 py-1.5 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="text-dim px-6 py-20 text-center text-sm">
        Loading live observability…
      </div>
    );
  }

  const view = liveAppDetailView(payload);
  const application = payload.detail.app.name;
  const projectValue = String(project);
  return (
    <AppDetailView
      app={view.app}
      onBack={() =>
        router.push(
          operateHref("/operate/observability", { project: projectValue }),
        )
      }
      onOpenTrace={(tool) =>
        router.push(
          operateHref("/operate/logs", {
            app: application,
            tool,
            project: projectValue,
          }),
        )
      }
      onOpenTx={(tx) =>
        router.push(
          operateHref("/operate/transactions", {
            app: application,
            tx,
            project: projectValue,
          }),
        )
      }
    />
  );
}
