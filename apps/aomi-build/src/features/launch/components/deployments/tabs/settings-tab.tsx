"use client";

import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { SdkBadge } from "../ui/sdk-badge";
import { EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 px-4 py-3">
      <dt className="text-zinc-500">{label}</dt>
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
      <dl className="divide-y divide-zinc-100">
        <Row label="Repository" value={source.repositoryLink ?? "-"} />
        <Row label="Source ID" value={`#${source.id}`} />
        <Row label="Installation" value={String(source.installationId)} />
      </dl>
      <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
        <div>
          <div className="font-medium">SDK compatibility</div>
          <div className="mt-1 text-xs text-zinc-500">
            Backend requires {required ?? "unknown"}
          </div>
        </div>
        <SdkBadge stamped={stamped} required={required} />
      </div>
      <div className="border-t border-zinc-200 px-4 py-4">
        <div className="text-sm font-medium text-zinc-900">Danger zone</div>
        <p className="mt-1 text-xs text-zinc-500">
          Disconnecting a project is not available yet.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 inline-flex h-8 cursor-not-allowed items-center rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-400"
        >
          Disconnect (coming soon)
        </button>
      </div>
    </div>
  );
}
