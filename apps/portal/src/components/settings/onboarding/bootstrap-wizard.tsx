"use client";

import { useState } from "react";
import { ExternalLink, Check, RotateCcw } from "lucide-react";
import { Button, Input } from "@aomi-labs/widget-lib";
import {
  bootstrapStep,
  installationStatusLabel,
  normalizeRepo,
  TEMPLATE_GENERATE_URL,
  type PathProgress,
} from "@portal/lib/onboarding";
import { Stepper } from "./stepper";
import { DeployStep } from "./deploy-step";
import { LivePanel } from "./live-panel";
import { WizardHeader } from "./oneshot-wizard";

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
  beginInstall,
  beginAuthorize,
  installing,
  patch,
}: {
  progress: PathProgress;
  actor?: string;
  onBack: () => void;
  beginInstall: () => void;
  beginAuthorize: () => void;
  installing?: boolean;
  patch: (patch: Partial<PathProgress>) => void;
}) {
  const step = bootstrapStep(progress);
  const installStatus = installationStatusLabel(progress.installationStatus);
  const [repoInput, setRepoInput] = useState("");
  const [repoError, setRepoError] = useState<string | null>(null);

  const confirmRepo = () => {
    const repo = normalizeRepo(repoInput);
    if (!repo) {
      setRepoError("Enter your repo as owner/name.");
      return;
    }
    setRepoError(null);
    patch({ repo });
  };

  return (
    <div className="space-y-6">
      <WizardHeader
        title="Fork & customize"
        subtitle="Make your own repo from our template, then we deploy it."
        onBack={onBack}
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
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="text-foreground text-sm font-medium">
            Step 1 — Create your repo from the template
          </div>
          <p className="text-muted-foreground text-sm leading-5">
            Opens GitHub&apos;s “Use this template”. Name it whatever you like,
            then paste it back here.
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
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="your-account/my-agent"
                onKeyDown={(e) => e.key === "Enter" && confirmRepo()}
              />
              {repoError && (
                <p className="mt-1 pl-1 text-xs text-red-500">{repoError}</p>
              )}
            </div>
            <Button
              onClick={confirmRepo}
              disabled={!repoInput.trim()}
              className="h-10 rounded-full px-4 text-sm font-medium"
            >
              <Check className="mr-1 h-4 w-4" /> Confirm
            </Button>
          </div>
        </div>
      )}

      {step === "install" && progress.repo && (
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="text-foreground text-sm font-medium">
            Step 2 — Install the Aomi GitHub App on your repo
          </div>
          <p className="text-muted-foreground text-sm leading-5">
            Installs the narrow <code>aomi-build</code> App (one repo: contents,
            pull requests & checks) on <code>{progress.repo}</code>. You&apos;ll
            return here automatically after GitHub confirms access.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={beginInstall}
              disabled={installing}
              className="h-10 max-w-full rounded-full px-4 text-sm font-medium"
            >
              {installing ? "Opening GitHub..." : "Install on GitHub"}
              <ExternalLink className="ml-1 h-4 w-4 shrink-0" />
            </Button>
            <Button
              onClick={beginAuthorize}
              disabled={installing}
              className="h-10 max-w-full rounded-full px-4 text-sm font-medium"
            >
              <RotateCcw className="mr-1 h-4 w-4 shrink-0" />
              {installing ? "Opening GitHub..." : "Verify existing install"}
            </Button>
          </div>
        </div>
      )}

      {step === "deploy" && progress.installationId && (
        <div className="border-input space-y-3 rounded-2xl border p-4">
          <div className="text-foreground text-sm font-medium">
            Step 3 — Deploy your app
          </div>
          <DeployStep
            path="bootstrap"
            installationId={progress.installationId}
            repo={progress.repo}
            actor={actor}
            progress={progress}
            onProgress={patch}
            onReconnectInstall={beginAuthorize}
          />
        </div>
      )}

      {step === "live" && <LivePanel repo={progress.repo} />}
    </div>
  );
}
