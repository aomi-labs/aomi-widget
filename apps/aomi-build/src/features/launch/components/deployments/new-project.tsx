"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Onboarding } from "@build/features/launch/components/onboarding";
import {
  fetchGitHubSession,
  type GitHubSessionInfo,
} from "@build/features/launch/dashboard";
import { GitHubSignInPanel } from "./ui/state-panels";
import { LoadingPanel } from "./ui/state-panels";

/** Console-framed one-shot create flow. Reuses the existing Onboarding wizard
 *  (install → create → deploy → activate → live) inside the deployments shell. */
export function NewProject({
  backHref = "/operate/deployments",
  backLabel = "Deployments",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const [session, setSession] = useState<GitHubSessionInfo | null>(null);

  useEffect(() => {
    void fetchGitHubSession()
      .then(setSession)
      .catch(() => setSession({ signedIn: false, githubLogin: null }));
  }, []);

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <Link
            href={backHref}
            className="text-dim hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            New app
          </h1>
          <p className="text-dim mt-1 text-sm">
            Fork the template, deploy it, and go live from your GitHub account.
          </p>
        </div>

        <div className="border-border bg-surface-1 rounded-md border p-4 sm:p-6">
          {session === null ? (
            <LoadingPanel label="Loading…" />
          ) : session.signedIn ? (
            <Onboarding
              hideWizardBack
              sessionInstallationId={session.installationId ?? null}
            />
          ) : (
            <GitHubSignInPanel error={null} />
          )}
        </div>
      </div>
    </main>
  );
}
