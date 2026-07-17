"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icons, PortalIcon } from "@portal/components/icons";
import { Onboarding } from "@portal/features/launch/components/onboarding";
import {
  fetchGitHubSession,
  type GitHubSessionInfo,
} from "@portal/features/launch/dashboard";
import { GitHubSignInPanel } from "./ui/state-panels";
import { LoadingPanel } from "./ui/state-panels";

/** Console-framed one-shot create flow. Reuses the existing Onboarding wizard
 *  (install → create → deploy → activate → live) inside the deployments shell. */
export function NewProject() {
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
            href="/deployments"
            className="text-dim hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <PortalIcon icon={Icons.ArrowLeft} size={16} aria-hidden />
            Deployments
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-normal">
            New app
          </h1>
          <p className="text-dim mt-1 text-sm">
            Fork the template, deploy it, and go live — all from your GitHub
            account.
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
