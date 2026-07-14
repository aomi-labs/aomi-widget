"use client";

import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { SdkBadge } from "../ui/sdk-badge";
import { EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 px-4 py-3">
      <dt className="text-dim">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}

export function SettingsTab({ detail }: { detail: Detail }) {
  const source = detail.source;
  if (!source) {
    return <EmptyPanel>Project not found.</EmptyPanel>;
  }
  const latest = source.latestDeployment;
  const stamped =
    source.sdkVersion ??
    latest?.sdkVersion ??
    latest?.apps.find((a) => a.sdkVersion)?.sdkVersion ??
    null;
  const required = detail.sdk?.sdkStatus.requiredVersion;

  return (
    <div className="text-sm">
      <dl className="divide-y divide-border">
        <Row label="Repository" value={source.repositoryLink ?? "-"} />
        <Row label="Source ID" value={`#${source.id}`} />
        <Row label="Installation" value={String(source.installationId)} />
      </dl>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <div>
          <div className="font-medium">SDK compatibility</div>
          <div className="mt-1 text-xs text-dim">
            Backend requires {required ?? "unknown"}
          </div>
        </div>
        <SdkBadge stamped={stamped} required={required} />
      </div>
      <div className="border-t border-border px-4 py-4">
        <div className="text-sm font-medium text-foreground">Danger zone</div>
        <p className="mt-1 text-xs text-dim">
          Disconnect project is coming soon.
        </p>
        <button
          type="button"
          disabled
          title="Coming soon"
          aria-label="Disconnect (coming soon)"
          className="mt-3 inline-flex h-8 cursor-not-allowed items-center rounded-md border border-border px-3 text-xs font-medium text-dim"
        >
          Disconnect · Soon
        </button>
      </div>
    </div>
  );
}
