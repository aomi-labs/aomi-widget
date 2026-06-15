"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
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
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";
import { Picker } from "./picker";
import { OneshotWizard } from "./oneshot-wizard";
import { BootstrapWizard } from "./bootstrap-wizard";

export function Onboarding() {
  const adapter = useAomiAuthAdapter();
  const actor = adapter.identity.address ?? undefined;

  const [state, setState] = useState<OnboardingState>(() => {
    const loaded = loadOnboarding();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const urlDeployId = url.searchParams.get("deployment_id");
      const urlDeployPath = url.searchParams.get("deploy_path");
      if (urlDeployId) {
        if (urlDeployPath === "oneshot" && !loaded.oneshot.deploymentId) {
          loaded.oneshot.deploymentId = urlDeployId;
        } else if (urlDeployPath === "bootstrap" && !loaded.bootstrap.deploymentId) {
          loaded.bootstrap.deploymentId = urlDeployId;
        }
      }
    }
    return loaded;
  });
  const [installingPath, setInstallingPath] =
    useState<OnboardingPath | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);

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
      setInstallSuccess(true);
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

  // --- auto-dismiss the install-success banner after 6s ---------------------
  useEffect(() => {
    if (!installSuccess) return;
    const id = setTimeout(() => setInstallSuccess(false), 6000);
    return () => clearTimeout(id);
  }, [installSuccess]);

  // --- sync deploymentId to URL params -------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = state.oneshot.deploymentId || state.bootstrap.deploymentId;
    const path = state.path;
    const url = new URL(window.location.href);
    const currentId = url.searchParams.get("deployment_id");
    if (id && path) {
      if (id !== currentId) {
        url.searchParams.set("deployment_id", id);
        url.searchParams.set("deploy_path", path);
        window.history.replaceState({}, "", url.toString());
      }
    } else if (currentId) {
      url.searchParams.delete("deployment_id");
      url.searchParams.delete("deploy_path");
      window.history.replaceState({}, "", url.toString());
    }
  }, [state.oneshot.deploymentId, state.bootstrap.deploymentId, state.path]);

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
              platform: resolveDeployPlatform(),
              repo,
              mode,
              app: path === "oneshot" ? 2 : undefined,
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
      <>
        {installSuccess && <InstallSuccessBanner />}
        <OneshotWizard
          progress={state.oneshot}
          actor={actor}
          onBack={back}
          beginInstall={makeBeginInstall("oneshot")}
          beginAuthorize={makeBeginInstall("oneshot", "authorize")}
          installing={installingPath === "oneshot"}
          installError={installError}
          patch={makePatch("oneshot")}
        />
      </>
    );
  }

  return (
    <>
      {installSuccess && <InstallSuccessBanner />}
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
    </>
  );
}

function InstallSuccessBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-600">
      <CheckCircle2 className="-mt-0.5 mr-1.5 inline-block h-4 w-4 align-middle" />
      GitHub App installed successfully
    </div>
  );
}
