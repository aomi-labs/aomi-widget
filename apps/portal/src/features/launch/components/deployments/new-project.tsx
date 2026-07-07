"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <a
            href="/deployments"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Deployments
          </a>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            New app
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fork the template, deploy it, and go live — all from your GitHub
            account.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
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
