"use client";

import { useState } from "react";
import {
  ExternalLink,
  ArrowLeft,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import {
  installationStatusLabel,
  launchCreateRepo,
  oneshotStep,
  type LaunchProgress,
} from "@portal/features/launch";
import { chatAppUrl } from "@portal/lib/chat-url";
import { Stepper } from "./stepper";
import { DeployStep } from "./deploy-step";
import { LivePanel } from "./live-panel";

const STEPS = [
  { key: "install", label: "Install" },
  { key: "create", label: "Create" },
  { key: "build", label: "Build" },
  { key: "live", label: "Live" },
];

export function OneshotWizard({
  progress,
  actor,
  onBack,
  showBack = true,
  beginInstall,
  beginAuthorize,
  installing,
  installError,
  patch,
  onReset,
  onRestartInBootstrap,
}: {
  progress: LaunchProgress;
  actor?: string;
  onBack: () => void;
  showBack?: boolean;
  beginInstall: () => void;
  beginAuthorize: () => void;
  installing?: boolean;
  installError?: string | null;
  patch: (patch: Partial<LaunchProgress>) => void;
  onReset?: () => void;
  onRestartInBootstrap?: () => void;
}) {
  const step = oneshotStep(progress);
  const installStatus = installationStatusLabel(progress.installationStatus);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createRepo = async () => {
    if (!progress.installationId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await launchCreateRepo({
        installationId: progress.installationId,
      });
      patch({
        installationId: result.installationId,
        repo: result.repo,
        appSourceId: result.appSourceId,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <WizardHeader
        title="One-click"
        subtitle="We create the repo and deploy it for you."
        onBack={onBack}
        showBack={showBack}
        actionLabel="Restart in Fork & Customize"
        onAction={onRestartInBootstrap}
      />

      <Stepper steps={STEPS} current={step} />

      {/* completed-fact summary */}
      {(progress.installationId || progress.repo) && (
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
          {progress.installationId && (
            <span>
              installation{" "}
              <code className="text-foreground">{progress.installationId}</code>
            </span>
          )}
          {installStatus && <span>{installStatus}</span>}
          {progress.repo && (
            <span>
              repo <code className="text-foreground">{progress.repo}</code>
            </span>
          )}
        </div>
      )}

      {step === "install" && (
        <div className="space-y-3">
          <div className="border-input space-y-3 rounded-2xl border p-4">
            <div className="text-foreground text-sm font-medium">
              Step 1 — Install the Aomi GitHub App
            </div>
            <p className="text-muted-foreground text-sm leading-5">
              Installs <code>aomi-build-oneshot</code>. It can create a repo in
              your account from our template and open deploy pull requests.
              You&apos;ll return here automatically after consent.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={beginInstall}
                disabled={installing}
                className="h-10 rounded-full px-4 text-sm font-medium"
              >
                {installing ? "Waiting for GitHub..." : "Install on GitHub"}
                <ExternalLink className="ml-1 h-4 w-4" />
              </Button>
              <Button
                onClick={beginAuthorize}
                disabled={installing}
                className="h-10 rounded-full px-4 text-sm font-medium"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Already installed?
              </Button>
            </div>
          </div>
          <WizardError message={installError} />
        </div>
      )}

      {step === "create" && progress.installationId && (
        <div className="space-y-3">
          <div className="border-input space-y-3 rounded-2xl border p-4">
            <div className="text-foreground text-sm font-medium">
              Step 2 — Create your repo
            </div>
            <p className="text-muted-foreground text-sm leading-5">
              Creates a GitHub repo from{" "}
              <code>aomi-labs/playground-example</code> in the account where you
              installed <code>aomi-build-oneshot</code>.
            </p>
            <Button
              onClick={createRepo}
              disabled={creating}
              className="h-10 rounded-full px-4 text-sm font-medium"
            >
              {creating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Create repo
            </Button>
          </div>
          <WizardError message={createError} />
        </div>
      )}

      {step === "build" && progress.installationId && progress.repo && (
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="text-foreground text-sm font-medium">
            Step 3 — Build and activate
          </div>
          <DeployStep
            installationId={progress.installationId}
            repo={progress.repo}
            actor={actor}
            progress={progress}
            onProgress={patch}
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

function WizardError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p className="mt-3 break-words rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
      {message}
    </p>
  );
}

function WizardHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  showBack?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <header className="space-y-2">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="h-9 max-w-full rounded-full px-3 text-sm font-medium"
          >
            <RotateCcw className="mr-1 h-4 w-4 shrink-0" />
            {actionLabel}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </header>
  );
}

export { WizardHeader, WizardError };
