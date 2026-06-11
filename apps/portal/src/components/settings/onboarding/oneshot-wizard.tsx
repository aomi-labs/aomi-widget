"use client";

import { ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import {
  installationStatusLabel,
  oneshotStep,
  type PathProgress,
} from "@portal/lib/onboarding";
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
  beginInstall,
  installing,
  installError,
  patch,
}: {
  progress: PathProgress;
  actor?: string;
  onBack: () => void;
  beginInstall: () => void;
  installing?: boolean;
  installError?: string | null;
  patch: (patch: Partial<PathProgress>) => void;
}) {
  const step = oneshotStep(progress);
  const installStatus = installationStatusLabel(progress.installationStatus);

  return (
    <div className="space-y-6">
      <WizardHeader
        title="One-click"
        subtitle="We create the repo and deploy it for you."
        onBack={onBack}
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
            <Button
              onClick={beginInstall}
              disabled={installing}
              className="h-10 rounded-full px-4 text-sm font-medium"
            >
              {installing ? "Opening GitHub..." : "Install on GitHub"}
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <WizardError message={installError} />
        </div>
      )}

      {(step === "create" || step === "build") && progress.installationId && (
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="text-foreground text-sm font-medium">
            Step 2–3 — Create from template & build
          </div>
          <DeployStep
            path="oneshot"
            installationId={progress.installationId}
            repo={progress.repo}
            actor={actor}
            progress={progress}
            onProgress={patch}
          />
        </div>
      )}

      {step === "live" && <LivePanel repo={progress.repo} />}
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
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <header className="space-y-2">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </header>
  );
}

export { WizardHeader, WizardError };
