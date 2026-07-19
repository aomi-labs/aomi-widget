"use client";

import { useRouter } from "next/navigation";
import type { AppFixture } from "./fixtures";
import { AppDetailView } from "./app-detail-view";

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
  app,
  application,
  project,
}: {
  app: AppFixture;
  application: string;
  project: string | null;
}) {
  const router = useRouter();
  return (
    <AppDetailView
      app={app}
      displayName={application}
      example
      onBack={() =>
        router.push(operateHref("/operate/observability", { project }))
      }
      onOpenTrace={(tool) =>
        router.push(
          operateHref("/operate/logs", { app: application, tool, project }),
        )
      }
      onOpenTx={(tx) =>
        router.push(
          operateHref("/operate/transactions", {
            app: application,
            tx,
            project,
          }),
        )
      }
    />
  );
}
