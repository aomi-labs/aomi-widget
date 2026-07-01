"use client";

import { useEffect } from "react";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
import { LoadingPanel, EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;

export function EnvironmentTab({ detail }: { detail: Detail }) {
  useEffect(() => {
    detail.loadSecrets();
  }, [detail]);

  if (detail.secretsByApp === null) {
    return <LoadingPanel label="Loading environment…" />;
  }

  const appNames = new Set((detail.source?.apps ?? []).map((a) => a.name));
  const groups = Object.entries(detail.secretsByApp).filter(
    ([app]) => appNames.size === 0 || appNames.has(app),
  );

  if (groups.length === 0) {
    return (
      <EmptyPanel>
        No environment secrets configured for this project. Durable
        per-deployment env writes are pending the /api/_internal/secrets
        ownership contract.
      </EmptyPanel>
    );
  }

  return (
    <div className="divide-y divide-zinc-100">
      {groups.map(([app, handles]) => (
        <div key={app} className="px-4 py-3">
          <div className="text-sm font-medium">{app}</div>
          <ul className="mt-2 space-y-1">
            {handles.map((handle) => (
              <li key={handle} className="font-mono text-xs text-zinc-600">
                {handle}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
