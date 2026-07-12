"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import { deploymentLifecycleFromSource } from "@aomi-labs/deploy/lifecycle";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { chatAppUrl } from "@build/lib/chat-url";
import { EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;

export function ChatTab({ detail }: { detail: Detail }) {
  const source = detail.source;
  if (!source) {
    return <EmptyPanel>Project not found.</EmptyPanel>;
  }

  const lifecycle = deploymentLifecycleFromSource(source);
  if (lifecycle.kind !== "live" || !lifecycle.chatApp) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-full border border-border">
          <MessageSquare className="size-5 text-dim" aria-hidden />
        </div>
        <div>
          <div className="text-base font-semibold">No live chat target</div>
          <div className="mt-1 max-w-md text-sm leading-6 text-dim">
            Deploy and activate a project app before opening its chat session.
          </div>
        </div>
        <Link
          href="?tab=deployments"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to deployments
        </Link>
      </div>
    );
  }

  const url = chatAppUrl(lifecycle.chatApp, {
    locked: true,
    applicationId: lifecycle.chatApplicationId,
  });

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Chat</div>
          <div className="mt-1 truncate text-xs text-dim">
            {lifecycle.chatApp} · {lifecycle.repo}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-xs font-medium text-foreground hover:bg-accent-hover"
        >
          Open chat
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
      <iframe
        src={url}
        title={`Chat with ${lifecycle.chatApp}`}
        className="h-[680px] w-full rounded-md border border-border bg-surface-1"
      />
    </div>
  );
}
