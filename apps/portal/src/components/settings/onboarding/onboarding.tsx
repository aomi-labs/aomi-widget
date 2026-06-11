"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import {
  githubAppInstallUrl,
  loadOnboarding,
  saveOnboarding,
  readGithubRedirect,
  withPath,
  withProgress,
  withPendingInstall,
  GITHUB_REDIRECT_KEYS,
  type OnboardingState,
  type OnboardingPath,
  type PathProgress,
} from "@portal/lib/onboarding";
import { Picker } from "./picker";
import { OneshotWizard } from "./oneshot-wizard";
import { BootstrapWizard } from "./bootstrap-wizard";

export function Onboarding() {
  const adapter = useAomiAuthAdapter();
  const actor = adapter.identity.address ?? undefined;

  const [state, setState] = useState<OnboardingState>(() => loadOnboarding());
  const [installingPath, setInstallingPath] =
    useState<OnboardingPath | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  const update = useCallback((next: OnboardingState) => {
    setState(next);
    saveOnboarding(next);
  }, []);

  // --- hydrate the GitHub install redirect (runs once) ----------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const redirect = readGithubRedirect(window.location.search);
    if (!redirect) return;

    const cur = loadOnboarding();
    const matched = cur.pendingInstall?.path ?? cur.path;
    if (matched) {
      const next = withPendingInstall(
        withProgress(withPath(cur, matched), matched, {
          ...(redirect.repo ? { repo: redirect.repo } : {}),
          installationId: redirect.installationId,
          installationStatus: redirect.onboard ?? undefined,
        }),
        null,
      );
      update(next);
    }

    // Strip GitHub's params so a refresh doesn't re-trigger hydration.
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of GITHUB_REDIRECT_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) window.history.replaceState({}, "", url.toString());
    // `update` is a stable useCallback ([] deps), so this still runs once.
  }, [update]);

  // --- actions handed to the picker / wizards -------------------------------
  const choose = useCallback(
    (path: OnboardingPath) => update(withPath(state, path)),
    [state, update],
  );

  const back = useCallback(
    () => update(withPath(state, null)),
    [state, update],
  );

  const makePatch = useCallback(
    (path: OnboardingPath) => (patch: Partial<PathProgress>) =>
      update(withProgress(state, path, patch)),
    [state, update],
  );

  // Persist the pending-install path BEFORE leaving for github.com, so the
  // backend callback redirect can resume the correct wizard path.
  const makeBeginInstall = useCallback(
    (path: OnboardingPath, mode: "install" | "authorize" = "install") =>
      async () => {
        const next = withPendingInstall(withPath(state, path), { path });
        saveOnboarding(next);
        setState(next);
        setInstallError(null);
        setInstallingPath(path);
        try {
          const repo = next[path].repo;
          window.location.assign(
            await githubAppInstallUrl({
              platform: process.env.NEXT_PUBLIC_AOMI_DEPLOY_PLATFORM,
              repo,
              mode,
            }),
          );
        } catch (error) {
          setInstallingPath(null);
          setInstallError(
            error instanceof Error
              ? error.message
              : "Failed to start GitHub App install.",
          );
        }
      },
    [state],
  );

  if (!state.path) {
    return <Picker onChoose={choose} />;
  }

  if (state.path === "oneshot") {
    return (
      <OneshotWizard
        progress={state.oneshot}
        actor={actor}
        onBack={back}
        beginInstall={makeBeginInstall("oneshot")}
        installing={installingPath === "oneshot"}
        installError={installError}
        patch={makePatch("oneshot")}
      />
    );
  }

  return (
    <BootstrapWizard
      progress={state.bootstrap}
      actor={actor}
      onBack={back}
      beginInstall={makeBeginInstall("bootstrap")}
      beginAuthorize={makeBeginInstall("bootstrap", "authorize")}
      installing={installingPath === "bootstrap"}
      installError={installError}
      patch={makePatch("bootstrap")}
    />
  );
}
