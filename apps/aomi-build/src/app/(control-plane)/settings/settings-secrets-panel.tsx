"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { useProjects } from "@build/features/launch/hooks/use-projects";
import {
  ErrorPanel,
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";

function environmentHref(sourceId: number) {
  return `/projects/${sourceId}?tab=environment`;
}

function projectLabel(source: {
  id: number;
  repositoryLink?: string | null;
}) {
  return source.repositoryLink?.trim() || `Project ${source.id}`;
}

export function SettingsSecretsPanel() {
  const router = useRouter();
  const { state } = useProjects();

  useEffect(() => {
    if (state.status !== "ready") return;
    if (state.sources.length !== 1) return;
    const only = state.sources[0];
    if (!only) return;
    router.replace(environmentHref(only.id));
  }, [router, state]);

  if (state.status === "loading") {
    return <LoadingPanel label="Loading projects…" />;
  }

  if (state.status === "signed_out") {
    return <GitHubSignInPanel error={null} />;
  }

  if (state.status === "error") {
    return <ErrorPanel message={state.error} />;
  }

  if (state.sources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          No projects yet
        </div>
        <p className="mt-2 text-[13px] text-dim">
          Secrets are managed per project. Import a GitHub repository first,
          then set environment values on that project&apos;s Environment tab.
        </p>
        <Link
          href="/operate/deployments/new"
          className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition hover:bg-brand-hover"
        >
          New app
        </Link>
      </div>
    );
  }

  if (state.sources.length === 1) {
    return <LoadingPanel label="Opening project environment…" />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          Secrets are managed per project
        </div>
        <p className="mt-2 text-[13px] text-dim">
          Choose a project to manage its environment variables and secrets.
          There is no account-wide secret store.
        </p>
      </div>

      <ul className="divide-border overflow-hidden rounded-lg border border-border bg-surface-1 divide-y">
        {state.sources.map((source) => (
          <li key={source.id}>
            <Link
              href={environmentHref(source.id)}
              className="hover:bg-accent-hover flex items-center justify-between gap-3 px-4 py-3 transition"
            >
              <div className="min-w-0">
                <div className="text-foreground truncate text-sm font-medium">
                  {projectLabel(source)}
                </div>
                <div className="text-dim mt-0.5 text-xs">
                  Environment →
                </div>
              </div>
              <ArrowRight className="text-dim size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
