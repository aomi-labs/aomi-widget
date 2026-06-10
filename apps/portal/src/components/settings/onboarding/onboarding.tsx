"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import {
  loadOnboarding,
  saveOnboarding,
  readGithubRedirect,
  newStateToken,
  appInstallUrl,
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
    // Match the redirect to the path that started it via the state token; fall
    // back to whatever path is currently selected.
    const matched =
      cur.pendingInstall && cur.pendingInstall.token === redirect.state
        ? cur.pendingInstall.path
        : cur.path;
    if (matched) {
      const next = withPendingInstall(
        withProgress(withPath(cur, matched), matched, {
          installationId: redirect.installationId,
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

  // Persist the pending-install token BEFORE leaving for github.com, so we can
  // match the redirect when we come back.
  const makeBeginInstall = useCallback(
    (path: OnboardingPath) => () => {
      const token = newStateToken();
      const next = withPendingInstall(withPath(state, path), { token, path });
      saveOnboarding(next);
      setState(next);
      window.location.assign(appInstallUrl(path, token));
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
      patch={makePatch("bootstrap")}
    />
  );
}
