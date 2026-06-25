"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Check,
  Loader2,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { Button, Input } from "@aomi-labs/widget-lib";
import {
  bootstrapStep,
  installationStatusLabel,
  launchSyncInstalled,
  normalizeRepo,
  TEMPLATE_GENERATE_URL,
  type LaunchProgress,
  type UserSource,
} from "@portal/features/launch";
import { chatAppUrl } from "@portal/lib/chat-url";
import { Stepper } from "./stepper";
import { DeployStep } from "./deploy-step";
import { LivePanel } from "./live-panel";
import { WizardError, WizardHeader } from "./oneshot-wizard";

const STEPS = [
  { key: "template", label: "Template" },
  { key: "install", label: "Install" },
  { key: "deploy", label: "Deploy" },
  { key: "live", label: "Live" },
];

export function BootstrapWizard({
  progress,
  actor,
  onBack,
  showBack = true,
  knownSources = [],
  beginInstall,
  beginAuthorize,
  installing,
  installError,
  patch,
  onReset,
  onRestartInOneshot,
}: {
  progress: LaunchProgress;
  actor?: string;
  onBack: () => void;
  showBack?: boolean;
  knownSources?: UserSource[];
  beginInstall: () => void;
  beginAuthorize: () => void;
  installing?: boolean;
  installError?: string | null;
  patch: (patch: Partial<LaunchProgress>) => void;
  onReset?: () => void;
  onRestartInOneshot?: () => void;
}) {
  const step = bootstrapStep(progress);
  const installStatus = installationStatusLabel(progress.installationStatus);
  const [repoInput, setRepoInput] = useState("");
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoWarning, setRepoWarning] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const sourceForRepo = useCallback(
    (repo: string) =>
      knownSources.find(
        (source) => normalizeRepo(source.repositoryLink ?? "") === repo,
      ),
    [knownSources],
  );

  const patchKnownSource = useCallback(
    (repo: string, source: UserSource): Partial<LaunchProgress> => ({
      repo,
      installationId: String(source.installationId),
      installationStatus: "bound",
      appSourceId: source.id,
      apps: source.apps.map((app) => app.name).filter(Boolean),
      releaseTags: source.apps
        .map((app) => app.appReleaseTag ?? "")
        .filter((tag): tag is string => Boolean(tag)),
      live: source.apps.some((app) => app.isActive && app.loaded),
    }),
    [],
  );

  useEffect(() => {
    if (!progress.repo || progress.appSourceId) {
      return;
    }

    const repo = normalizeRepo(progress.repo);
    if (!repo) {
      return;
    }

    const knownSource = sourceForRepo(repo);
    if (!knownSource) {
      return;
    }

    patch(patchKnownSource(repo, knownSource));
  }, [
    patch,
    patchKnownSource,
    progress.appSourceId,
    progress.repo,
    sourceForRepo,
  ]);

  const confirmRepo = async () => {
    const repo = normalizeRepo(repoInput);
    if (!repo) {
      setRepoError("Enter your repo as owner/name.");
      return;
    }
    setRepoError(null);
    // Guard against pointing at a repo you already own. In this flow you create
    // the repo FROM the template first, so the repo always exists by the time you
    // paste it — existence alone is not the signal. GitHub tells us whether a repo
    // was generated from a template (`template_repository`), so only warn when the
    // repo exists but did NOT come from an Aomi template (i.e. a pre-existing repo
    // of your own). A fresh template repo is the happy path and passes silently.
    if (!repoWarning) {
      setChecking(true);
      let preExisting = false;
      try {
        const res = await fetch(
          `/api/bff/launch/check-repo?repo=${encodeURIComponent(repo)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            exists: boolean;
            fromTemplate: boolean;
          };
          preExisting = data.exists && !data.fromTemplate;
        }
      } catch {
        // offline: skip the check rather than block the user
      }
      setChecking(false);
      if (preExisting) {
        setRepoWarning(
          `${repo} already exists and was not created from the Aomi template. Deploying will install on it as-is — create a fresh repo from the template above to avoid touching existing code, or click Confirm again to use this repo anyway.`,
        );
        return;
      }
    }
    setRepoWarning(null);
    const knownSource = sourceForRepo(repo);
    patch(
      knownSource
        ? patchKnownSource(repo, knownSource)
        : {
            repo,
            installationId: undefined,
            installationStatus: undefined,
            appSourceId: undefined,
            apps: undefined,
            releaseTags: undefined,
            live: false,
          },
    );
  };

  // step back one stage by clearing the field that advanced it (no full reset)
  const backToTemplate = () => {
    patch({
      repo: undefined,
      installationId: undefined,
      installationStatus: undefined,
    });
    setRepoInput("");
    setRepoError(null);
    setRepoWarning(null);
  };
  const backToInstall = () => {
    patch({ installationId: undefined, installationStatus: undefined });
  };

  return (
    <div className="space-y-6">
      <WizardHeader
        title="Fork & customize"
        subtitle="Make your own repo from our template, then we deploy it."
        onBack={onBack}
        showBack={showBack}
        actionLabel="Restart in One-Shot"
        onAction={onRestartInOneshot}
      />

      <Stepper steps={STEPS} current={step} />

      {(progress.repo || progress.installationId) && (
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {progress.repo && (
            <span>
              repo <code className="text-foreground">{progress.repo}</code>
            </span>
          )}
          {progress.installationId && (
            <span>
              installation{" "}
              <code className="text-foreground">{progress.installationId}</code>
            </span>
          )}
          {installStatus && <span>{installStatus}</span>}
        </div>
      )}

      {step === "template" && (
        <div className="space-y-3">
          <div className="border-input space-y-3 rounded-2xl border p-4">
            <div className="text-foreground text-sm font-medium">
              Step 1 — Create your repo from the template
            </div>
            <p className="text-muted-foreground text-sm leading-5">
              Opens GitHub&apos;s “Use this template”. Name it whatever you
              like, then paste it back here.
            </p>
            <a
              href={TEMPLATE_GENERATE_URL}
              target="_blank"
              rel="noreferrer"
              className="bg-foreground text-background inline-flex h-10 items-center rounded-full px-4 text-sm font-medium"
            >
              Use this template <ExternalLink className="ml-1 h-4 w-4" />
            </a>
            <div className="flex items-start gap-2 pt-1">
              <div className="flex-1">
                <Input
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    setRepoError(null);
                    setRepoWarning(null);
                  }}
                  placeholder="your-account/my-agent"
                  onKeyDown={(e) => e.key === "Enter" && confirmRepo()}
                />
                {repoError && (
                  <p className="mt-1 pl-1 text-xs text-red-500">{repoError}</p>
                )}
                {repoWarning && (
                  <p className="mt-1 flex items-start gap-1 pl-1 text-xs text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{repoWarning}</span>
                  </p>
                )}
              </div>
              <Button
                onClick={confirmRepo}
                disabled={!repoInput.trim() || checking}
                className="h-10 rounded-full px-4 text-sm font-medium"
              >
                <Check className="mr-1 h-4 w-4" />
                {checking
                  ? "Checking..."
                  : repoWarning
                    ? "Use anyway"
                    : "Confirm"}
              </Button>
            </div>
          </div>
          <WizardError message={installError} />
        </div>
      )}

      {step === "install" && progress.repo && (
        <div className="space-y-3">
          <div className="border-input space-y-3 rounded-2xl border p-4">
            <div className="text-foreground text-sm font-medium">
              Step 2 — Install the Aomi GitHub App on your repo
            </div>
            <p className="text-muted-foreground text-sm leading-5">
              Installs the narrow <code>aomi-build</code> App (one repo:
              contents, pull requests & checks) on <code>{progress.repo}</code>.
              You&apos;ll return here automatically after GitHub confirms
              access.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={beginInstall}
                disabled={installing}
                className="h-10 max-w-full rounded-full px-4 text-sm font-medium"
              >
                {installing ? "Waiting for GitHub..." : "Install on GitHub"}
                <ExternalLink className="ml-1 h-4 w-4 shrink-0" />
              </Button>
              <Button
                onClick={beginAuthorize}
                disabled={installing}
                className="h-10 max-w-full rounded-full px-4 text-sm font-medium"
              >
                <RotateCcw className="mr-1 h-4 w-4 shrink-0" />
                {installing
                  ? "Waiting for GitHub..."
                  : "Verify existing install"}
              </Button>
              <button
                type="button"
                onClick={backToTemplate}
                disabled={installing}
                className="text-muted-foreground hover:text-foreground inline-flex h-10 items-center rounded-full px-3 text-sm disabled:opacity-50"
              >
                <ArrowLeft className="mr-1 h-4 w-4 shrink-0" /> Change repo
              </button>
            </div>
          </div>
          <WizardError message={installError} />
        </div>
      )}

      {step === "deploy" && progress.installationId && (
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-foreground text-sm font-medium">
              Step 3 — Deploy your app
            </div>
            <button
              type="button"
              onClick={backToInstall}
              className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5 shrink-0" /> Back
            </button>
          </div>
          <BootstrapDeployStep
            progress={progress}
            patch={patch}
            actor={actor}
            onReconnectInstall={beginAuthorize}
            onReset={onReset}
          />
        </div>
      )}

      {step === "live" && (
        <LivePanel
          repo={progress.repo}
          chatUrl={
            progress.apps?.[0]
              ? chatAppUrl(progress.apps[0], { locked: true })
              : undefined
          }
        />
      )}
    </div>
  );
}

/**
 * Bootstrap reaches deploy with a connected repo that may not have been synced
 * yet. Sync it once for freshness, then let `DeployStep` call the BFF with
 * installation/repo identity; the BFF resolves the backend source id.
 */
function BootstrapDeployStep({
  progress,
  patch,
  actor,
  onReconnectInstall,
  onReset,
}: {
  progress: LaunchProgress;
  patch: (patch: Partial<LaunchProgress>) => void;
  actor?: string;
  onReconnectInstall?: () => void;
  onReset?: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repo = progress.repo;
  const appSourceId = progress.appSourceId;
  const installationId = progress.installationId;

  const resolveSource = useCallback(async () => {
    if (!repo) return;
    setResolving(true);
    setError(null);
    try {
      const result = await launchSyncInstalled({ repo });
      if (!result.appSourceId) {
        throw new Error("backend did not return a source id for this repo");
      }
      patch({ appSourceId: result.appSourceId, repo: result.repo });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  }, [repo, patch]);

  useEffect(() => {
    if (!appSourceId && !resolving && !error) {
      void resolveSource();
    }
  }, [appSourceId, resolving, error, resolveSource]);

  if (appSourceId && installationId) {
    return (
      <DeployStep
        installationId={installationId}
        repo={progress.repo}
        actor={actor}
        progress={progress}
        onProgress={patch}
        onReconnectInstall={onReconnectInstall}
        onReset={onReset}
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <div className="text-foreground flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <div className="font-medium">Couldn’t connect your repository</div>
            <div className="text-muted-foreground mt-0.5 break-words text-xs">
              {error}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={resolveSource}
            className="h-8 rounded-full px-3 text-xs font-medium"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
          {onReconnectInstall && (
            <Button
              onClick={onReconnectInstall}
              className="h-8 rounded-full px-3 text-xs font-medium"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Verify existing install
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Connecting your repository…
    </div>
  );
}
