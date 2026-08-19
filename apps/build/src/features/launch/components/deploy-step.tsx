"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import type { ProgressModel, SecretSlot } from "@aomi-labs/deploy";
import {
  deploymentProgress,
  deploymentTargets,
  isFatalLaunchRequestError,
  waitForAppsToLoad,
  waitForDeploymentReady,
} from "@aomi-labs/deploy/launch";
import {
  launchActivate,
  launchDeploy,
  launchAppsStatus,
  launchPreflight,
  launchStatus,
  type LaunchDeployPayload,
  type LaunchProgress,
} from "@build/features/launch";
import { MissingRequiredSecretsError } from "@build/features/launch/required-secrets";
import { RequiredSecretsPanel } from "@build/features/launch/components/required-secrets-panel";

// The subset of `useProjectDetail`'s return value this step needs to gate
// Activate on required secrets. Optional: the onboarding wizard renders this
// step before a project (and its required-secret state) exists, so a missing
// `detail` fails open — same policy as the 409 backstop.
type SecretsGateDetail = {
  hasMissingSecrets: (app: string) => boolean;
  requiredSecrets: Record<
    string,
    { applicationId: number; slots: SecretSlot[]; missing: string[] }
  > | null;
  requiredSecretsError?: string | null;
  loadRequiredSecrets: () => void;
  refreshRequiredSecrets?: () => Promise<unknown>;
  ensureRequiredSecrets?: (apps: string[], projectId?: number) => Promise<void>;
  setEnvVars?: (
    applicationId: number,
    secrets: Record<string, string>,
  ) => Promise<unknown>;
};

type Phase =
  | "idle"
  | "preflight_running"
  | "preflight_ready"
  | "deploying"
  | "building"
  | "releasing"
  | "ready"
  | "activating"
  | "verifying"
  | "live"
  | "error";

type StepStatus = "todo" | "active" | "done";

const BUSY_PHASES: Phase[] = [
  "preflight_running",
  "deploying",
  "building",
  "releasing",
  "activating",
  "verifying",
];

function deploymentApps(deployment?: LaunchDeployPayload) {
  return deployment?.platform?.apps ?? [];
}

const DEPLOYMENT_READY_TIMEOUT_MS = 30 * 60 * 1000;
const RUNTIME_READY_TIMEOUT_MS = 30 * 60 * 1000;

function initialPhase(progress: LaunchProgress): Phase {
  if (progress.live) return "live";
  if (!progress.deploymentId)
    return progress.deployment ? "preflight_ready" : "idle";
  return "building";
}

function isBusyPhase(phase: Phase): boolean {
  return BUSY_PHASES.includes(phase);
}

function stepStatus(
  phase: Phase,
  step: "preflight" | "deploy" | "activate" | "live",
): StepStatus {
  const order: Record<Phase, number> = {
    idle: 0,
    preflight_running: 1,
    preflight_ready: 2,
    deploying: 3,
    building: 3,
    releasing: 3,
    ready: 4,
    activating: 5,
    verifying: 5,
    live: 6,
    error: 0,
  };
  const threshold = {
    preflight: 1,
    deploy: 3,
    activate: 5,
    live: 6,
  }[step];
  const value = order[phase];
  if (value > threshold || (step === "live" && phase === "live")) return "done";
  if (value === threshold) return "active";
  return "todo";
}

export function DeployStep({
  installationId,
  repo,
  platform,
  actor,
  progress,
  onProgress,
  onReconnectInstall,
  onReset,
  detail,
}: {
  /** GitHub App installation for wizard context; deploy uses projectId or repo. */
  installationId: string;
  repo?: string;
  platform?: string;
  actor?: string;
  progress: LaunchProgress;
  onProgress: (patch: Partial<LaunchProgress>) => void;
  onReconnectInstall?: () => void;
  onReset?: () => void;
  detail?: SecretsGateDetail;
}) {
  const [phase, setPhase] = useState<Phase>(() => initialPhase(progress));
  const [deployment, setDeployment] = useState<LaunchDeployPayload | undefined>(
    progress.deployment,
  );
  const [deploymentId, setDeploymentId] = useState<string | undefined>(
    progress.deploymentId,
  );
  const [error, setError] = useState<string | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const runtimeAbortRef = useRef<AbortController | null>(null);
  const onProgressRef = useRef(onProgress);
  const [progressModel, setProgressModel] = useState<ProgressModel | null>(
    null,
  );
  const lastCompletedRef = useRef(0);

  const targets = useMemo(() => deploymentTargets(deployment), [deployment]);
  const tags = useMemo(
    () => progress.releaseTags ?? targets.map((target) => target.releaseTag),
    [progress.releaseTags, targets],
  );
  const apps = useMemo(
    () => progress.apps ?? targets.map((target) => target.name),
    [progress.apps, targets],
  );
  const manifestJson = useMemo(
    () => (deployment ? JSON.stringify(deployment, null, 2) : ""),
    [deployment],
  );
  const loadRequiredSecrets = detail?.loadRequiredSecrets;

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    loadRequiredSecrets?.();
  }, [loadRequiredSecrets]);

  useEffect(() => {
    return () => runtimeAbortRef.current?.abort();
  }, []);

  // Gate on the apps this step is about to deploy or activate. After a
  // preflight, `apps` comes from the resolved deployment manifest even before
  // the deploy result has been written back into progress.
  const blockedApps = apps.filter((app) => detail?.hasMissingSecrets(app));
  const secretsCheckPending = Boolean(
    detail &&
    apps.length > 0 &&
    detail.requiredSecrets === null &&
    !detail.requiredSecretsError,
  );
  const secretsCheckFailed = Boolean(
    detail && apps.length > 0 && detail.requiredSecretsError,
  );
  const secretsBlocked = Boolean(
    detail &&
    apps.length > 0 &&
    (secretsCheckPending || secretsCheckFailed || blockedApps.length > 0),
  );
  const missingSecretsCount = blockedApps.reduce(
    (n, app) => n + (detail?.requiredSecrets?.[app]?.missing.length ?? 0),
    0,
  );
  const missingSecretSlots = blockedApps.flatMap((app) =>
    (detail?.requiredSecrets?.[app]?.slots ?? [])
      .filter((slot) =>
        detail?.requiredSecrets?.[app]?.missing.includes(slot.name),
      )
      .map((slot) => ({
        app,
        slot,
        applicationId: detail?.requiredSecrets?.[app]?.applicationId,
      })),
  );

  const saveRequiredSecrets = useCallback(
    async (valuesByApplication: Map<number, Record<string, string>>) => {
      if (!detail?.setEnvVars) return;
      setError(null);
      await Promise.all(
        Array.from(valuesByApplication, ([applicationId, values]) =>
          detail.setEnvVars?.(applicationId, values),
        ),
      );
      await detail.ensureRequiredSecrets?.(apps);
    },
    [apps, detail],
  );

  const applyDeployment = useCallback(
    (next: {
      repo?: string;
      installationId?: string;
      projectId?: number;
      sourceRef?: string;
      deployment: LaunchDeployPayload;
      releaseTags?: string[];
      apps?: string[];
    }) => {
      const nextTargets = deploymentTargets(next.deployment);
      const nextTags =
        next.releaseTags ?? nextTargets.map((target) => target.releaseTag);
      const nextApps = next.apps ?? nextTargets.map((target) => target.name);
      setDeployment(next.deployment);
      setShowManifest(false);
      const patch: Partial<LaunchProgress> = {
        repo: next.repo ?? repo,
        deployment: next.deployment,
        releaseTags: nextTags,
        apps: nextApps,
        sourceRef: next.sourceRef ?? next.deployment.source?.ref,
      };
      if (next.installationId) patch.installationId = next.installationId;
      if (next.projectId) patch.projectId = next.projectId;
      onProgress(patch);
    },
    [onProgress, repo],
  );

  const preflight = useCallback(async () => {
    setPhase("preflight_running");
    setError(null);
    try {
      const result = await launchPreflight({
        installationId,
        repo,
        projectId: progress.projectId,
        sourceRef: progress.sourceRef,
        actor,
      });
      applyDeployment(result);
      setPhase("preflight_ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [
    actor,
    applyDeployment,
    installationId,
    progress.projectId,
    progress.sourceRef,
    repo,
  ]);

  const deploy = useCallback(async () => {
    setPhase("deploying");
    setError(null);
    try {
      // Deploy commits against a stable source row id. The first deploy after
      // an install has none yet, so preflight resolves the connected Project
      // by repository; afterwards we go straight through by id.
      let projectId = progress.projectId;
      let sourceRef = progress.sourceRef ?? deployment?.source?.ref;
      let targetApps = apps;
      if (!projectId || !sourceRef) {
        const preflightResult = await launchPreflight({
          installationId,
          repo,
          projectId,
          sourceRef,
          actor,
        });
        applyDeployment(preflightResult);
        projectId = preflightResult.projectId;
        sourceRef =
          preflightResult.sourceRef ?? preflightResult.deployment.source?.ref;
        targetApps = preflightResult.apps;
      }
      if (!projectId) {
        throw new Error(
          "Could not resolve a project to deploy. Run a preflight first.",
        );
      }
      if (!sourceRef) {
        throw new Error("Preflight did not return an immutable source commit.");
      }
      await detail?.ensureRequiredSecrets?.(targetApps, projectId);
      const result = await launchDeploy({
        projectId,
        sourceRef,
        actor,
      });
      applyDeployment(result);
      const id = result.deployment.id;
      setDeploymentId(id);
      const patch: Partial<LaunchProgress> = {
        repo: result.repo ?? repo,
        deploymentId: id,
        deployment: result.deployment,
        sourceRef: result.sourceRef ?? result.deployment.source?.ref,
        releaseTags: result.releaseTags,
        apps: result.apps,
        live: false,
      };
      if (result.installationId) patch.installationId = result.installationId;
      if (result.projectId) patch.projectId = result.projectId;
      onProgress(patch);
      setPhase("building");
    } catch (e) {
      if (e instanceof MissingRequiredSecretsError) {
        setError(e.message);
        setPhase("preflight_ready");
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [
    actor,
    applyDeployment,
    apps,
    detail,
    installationId,
    onProgress,
    progress.projectId,
    progress.sourceRef,
    repo,
    deployment,
  ]);

  useEffect(() => {
    if (!deploymentId || progress.live) return;
    const controller = new AbortController();
    let cancelled = false;
    const watch = async () => {
      try {
        await waitForDeploymentReady(
          () => launchStatus(deploymentId, platform),
          {
            signal: controller.signal,
            intervalMs: 4000,
            timeoutMs: DEPLOYMENT_READY_TIMEOUT_MS,
            isFatal: isFatalLaunchRequestError,
            onProgress: (status) => {
              if (cancelled) return;
              const nextDeployment = status.deployment;
              if (nextDeployment) setDeployment(nextDeployment);
              const model = deploymentProgress(
                status,
                lastCompletedRef.current,
              );
              lastCompletedRef.current = model.completed;
              setProgressModel(model);

              const patch: Partial<LaunchProgress> = {
                deploymentId,
                live: false,
              };
              if (nextDeployment) patch.deployment = nextDeployment;
              if (status.releaseTags.length > 0)
                patch.releaseTags = status.releaseTags;
              onProgressRef.current(patch);
              if (status.state === "releasing") setPhase("releasing");
              else if (status.state !== "ready") setPhase("building");
            },
          },
        );
        if (!cancelled) setPhase("ready");
      } catch (e) {
        if (cancelled || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    };
    void watch();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deploymentId, platform, progress.live]);

  const verifyLive = useCallback(
    async (nextApps = apps, nextTags = tags) => {
      setPhase("verifying");
      if (!progress.projectId) {
        setError("Project is missing; rerun deployment before activation.");
        setPhase("error");
        return;
      }

      if (nextApps.length === 0) {
        setError("Activation did not return any apps to verify.");
        setPhase("error");
        return;
      }

      runtimeAbortRef.current?.abort();
      const controller = new AbortController();
      runtimeAbortRef.current = controller;
      try {
        const snapshot = await waitForAppsToLoad(
          () => launchAppsStatus({ projectId: progress.projectId! }),
          nextApps.map((name, index) => ({
            name,
            releaseTag: nextTags[index],
          })),
          {
            signal: controller.signal,
            timeoutMs: RUNTIME_READY_TIMEOUT_MS,
            intervalMs: 3000,
            isFatal: isFatalLaunchRequestError,
            onProgress: ({ attempt }) => setVerifyAttempt(attempt),
          },
        );
        const firstApplicationId = snapshot.apps
          .find((app) => app.id)
          ?.id?.toString();
        onProgress({
          live: true,
          applicationId: firstApplicationId,
        });
        setPhase("live");
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      } finally {
        if (runtimeAbortRef.current === controller) {
          runtimeAbortRef.current = null;
        }
      }
    },
    [apps, onProgress, progress.projectId, tags],
  );

  const activate = useCallback(async () => {
    if (!progress.projectId) {
      setError("App source is missing; rerun deployment before activation.");
      setPhase("error");
      return;
    }
    setPhase("activating");
    setError(null);
    try {
      const result = await launchActivate({
        projectId: progress.projectId,
        releaseTags: tags,
        apps,
        actor,
      });
      const activatedApps = result.activation?.apps ?? [];
      if (!result.ok || activatedApps.some((app) => app.error)) {
        const failed = activatedApps.find((app) => app.error);
        throw new Error(failed?.error ?? "Activation was not accepted.");
      }
      const applicationId = activatedApps
        .find((app) => app.applicationId)
        ?.applicationId?.toString();
      if (applicationId) onProgress({ applicationId });
      await verifyLive(apps, tags);
    } catch (e) {
      const body = (e as { body?: { missing?: Record<string, string[]> } })
        .body;
      if (body?.missing) {
        const names = Object.entries(body.missing)
          .map(([app, keys]) => `${app}: ${keys.join(", ")}`)
          .join("; ");
        setError(`Missing required secrets — ${names}`);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      setPhase("error");
    }
  }, [actor, apps, onProgress, progress.projectId, tags, verifyLive]);

  const reset = useCallback(() => {
    runtimeAbortRef.current?.abort();
    runtimeAbortRef.current = null;
    setError(null);
    lastCompletedRef.current = 0;
    setProgressModel(null);
    setVerifyAttempt(0);
    setDeployment(undefined);
    setDeploymentId(undefined);
    onProgress({
      deployment: undefined,
      deploymentId: undefined,
      sourceRef: undefined,
      releaseTags: undefined,
      apps: undefined,
      live: false,
    });
    setPhase("idle");
    onReset?.();
  }, [onProgress, onReset]);

  if (phase === "error") {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <div className="text-foreground flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <div className="font-medium">Deployment needs attention</div>
            <div className="text-muted-foreground mt-0.5 break-words text-xs">
              {error}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={reset}
            className="h-8 rounded-full px-3 text-xs font-medium"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
          {repo && onReconnectInstall && (
            <Button
              onClick={onReconnectInstall}
              className="h-8 rounded-full px-3 text-xs font-medium"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Verify existing install
            </Button>
          )}
        </div>
        {deployment && (
          <DeploymentSummary
            deployment={deployment}
            tags={tags}
            phase={phase}
            showManifest={showManifest}
            manifestJson={manifestJson}
            onToggleManifest={() => setShowManifest((value) => !value)}
          />
        )}
      </div>
    );
  }

  const busy = isBusyPhase(phase);

  return (
    <div className="space-y-4 text-sm" aria-busy={busy}>
      <StepTrack phase={phase} />
      {error && (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={preflight}
          disabled={phase !== "idle" && phase !== "preflight_ready"}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          {phase === "preflight_running" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 h-4 w-4" />
          )}
          Preflight
        </Button>
        <Button
          onClick={deploy}
          disabled={[
            "deploying",
            "building",
            "ready",
            "activating",
            "verifying",
            "live",
          ].includes(phase)}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          {phase === "deploying" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 h-4 w-4" />
          )}
          Deploy
        </Button>
        <Button
          onClick={activate}
          disabled={phase !== "ready" || tags.length === 0 || secretsBlocked}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          {phase === "activating" || phase === "verifying" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 h-4 w-4" />
          )}
          Activate
        </Button>
        {["building", "ready", "activating", "verifying"].includes(phase) && (
          <Button
            onClick={reset}
            className="h-9 rounded-full px-3 text-sm font-medium"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Start Over
          </Button>
        )}
      </div>

      {secretsBlocked && (
        <RequiredSecretsPanel
          slots={missingSecretSlots}
          missingCount={missingSecretsCount}
          verificationError={
            detail?.requiredSecretsError
              ? `${detail.requiredSecretsError}.`
              : null
          }
          pending={secretsCheckPending}
          onRetryVerification={detail?.refreshRequiredSecrets}
          onSave={saveRequiredSecrets}
          actionLabel="Deploy"
        />
      )}

      <div
        className="text-muted-foreground flex min-h-5 items-center gap-2 text-xs"
        role="status"
        aria-live="polite"
      >
        {[
          "preflight_running",
          "deploying",
          "building",
          "releasing",
          "activating",
          "verifying",
        ].includes(phase) && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {phase === "idle" &&
          "Run a preflight to preview the deployment manifest."}
        {phase === "preflight_running" &&
          "Resolving source and rendering deployment.json."}
        {phase === "preflight_ready" &&
          "Preflight is ready. Review it, then deploy."}
        {phase === "deploying" &&
          "Creating or updating the platform deploy branch."}
        {phase === "building" && "Waiting for platform CI and release assets."}
        {phase === "releasing" && "Release built. Verifying assets."}
        {phase === "ready" && "Build is ready for activation."}
        {phase === "activating" &&
          "Promoting the built release into the live branch."}
        {phase === "verifying" &&
          `Checking runtime... attempt ${verifyAttempt}`}
        {phase === "live" && "App artifact is ready."}
      </div>

      {progressModel !== null && ["building", "releasing"].includes(phase) && (
        <ProgressBar model={progressModel} />
      )}

      {deploymentId && (
        <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          deployment <code className="text-foreground">{deploymentId}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(deploymentId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="hover:text-foreground inline-flex items-center gap-0.5"
            title="Copy deployment ID"
          >
            <Copy className="h-3 w-3" />
            {copied && (
              <span className="text-[10px] text-green-500">copied</span>
            )}
          </button>
        </div>
      )}

      {deployment && (
        <DeploymentSummary
          deployment={deployment}
          tags={tags}
          phase={phase}
          showManifest={showManifest}
          manifestJson={manifestJson}
          onToggleManifest={() => setShowManifest((value) => !value)}
        />
      )}
    </div>
  );
}

function DeploymentSummary({
  deployment,
  tags,
  phase,
  showManifest,
  manifestJson,
  onToggleManifest,
}: {
  deployment: LaunchDeployPayload;
  tags: string[];
  phase: Phase;
  showManifest: boolean;
  manifestJson: string;
  onToggleManifest: () => void;
}) {
  const platform = deployment.platform;
  const apps = deploymentApps(deployment);
  const source = deployment.source;
  const ciStatus = platform?.ciStatus;
  const ciUrl = platform?.ciUrl;
  const prNumber = platform?.prNumber;
  const prUrl = platform?.prUrl;
  const platformBranch = platform?.platformBranch;
  const target = apps[0]?.target;
  const fileCount = apps.reduce((sum, app) => {
    return sum + (app.files?.length ?? 0);
  }, 0);

  return (
    <div className="border-input bg-muted/20 space-y-3 rounded-xl border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Source"
          value={source?.repositoryLink ?? "Repo"}
          detail={
            source?.commitHash
              ? `${source.commitHash.slice(0, 12)} from ${
                  source.ref ?? "source"
                }`
              : undefined
          }
        />
        <SummaryTile
          label="Build"
          value={ciStatus ? ciStatusLabel(ciStatus) : statusLabel(phase)}
          detail={platformBranch ?? platform?.repository}
          tone={
            ciStatus === "passed"
              ? "good"
              : ciStatus === "failed"
                ? "bad"
                : "muted"
          }
        />
        <SummaryTile
          label="Release"
          value={apps
            .map((app) => app.name)
            .filter(Boolean)
            .join(", ")}
          detail={[
            target,
            fileCount > 0 ? `${fileCount} files` : null,
            tags.length > 1 ? `${tags.length} tags` : tags[0],
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      {(ciUrl || prUrl) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {ciUrl && (
            <a
              href={ciUrl}
              target="_blank"
              rel="noreferrer"
              className="text-foreground inline-flex items-center gap-1 underline"
            >
              Open CI <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              className="text-foreground inline-flex items-center gap-1 underline"
            >
              Open PR{prNumber ? ` #${prNumber}` : ""}{" "}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {tags.length > 0 && (
        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
          {tags.map((tag) => (
            <code key={tag} className="text-foreground">
              {tag}
            </code>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleManifest}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        {showManifest ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        deployment.json
      </button>
      {showManifest && (
        <pre className="border-input bg-background/60 max-h-72 overflow-auto rounded-lg border p-3 text-xs leading-5">
          {manifestJson}
        </pre>
      )}
    </div>
  );
}

function StepTrack({ phase }: { phase: Phase }) {
  const steps: Array<{
    id: "preflight" | "deploy" | "activate" | "live";
    label: string;
  }> = [
    { id: "preflight", label: "Preflight" },
    { id: "deploy", label: "Deploy" },
    { id: "activate", label: "Activate" },
    { id: "live", label: "Live" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((step) => {
        const status = stepStatus(phase, step.id);
        return (
          <div
            key={step.id}
            data-status={status}
            className="border-input bg-muted/20 flex h-9 items-center gap-2 rounded-md border px-2.5 text-xs data-[status=active]:border-blue-500/40 data-[status=done]:border-green-500/30 data-[status=active]:bg-blue-500/10 data-[status=done]:bg-green-500/10"
          >
            <span className="flex size-4 items-center justify-center">
              {status === "active" ? (
                <Loader2 className="size-3.5 animate-spin text-blue-500" />
              ) : status === "done" ? (
                <CheckCircle2 className="size-3.5 text-green-500" />
              ) : (
                <span className="bg-muted-foreground/40 size-2 rounded-full" />
              )}
            </span>
            <span className="truncate font-medium">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  tone = "muted",
}: {
  label: string;
  value?: string | null;
  detail?: string;
  tone?: "good" | "bad" | "muted";
}) {
  const toneClass =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-foreground";
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </div>
      <div className={`${toneClass} truncate text-sm font-medium`}>
        {value || "Pending"}
      </div>
      {detail && (
        <div className="text-muted-foreground truncate text-xs">{detail}</div>
      )}
    </div>
  );
}

function ProgressBar({ model }: { model: ProgressModel }) {
  const pct = Math.round((model.completed / model.total) * 100);
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{model.label}</span>
        <span>{pct}%</span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function statusLabel(phase: Phase): string {
  switch (phase) {
    case "preflight_ready":
      return "Preview ready";
    case "building":
      return "CI pending";
    case "releasing":
      return "Verifying assets";
    case "ready":
      return "CI passed";
    case "activating":
      return "Activating";
    case "verifying":
      return "Loading runtime";
    case "live":
      return "Loaded";
    default:
      return "Pending";
  }
}

function ciStatusLabel(status: string): string {
  if (status === "passed") return "CI passed";
  if (status === "failed") return "CI failed";
  if (status === "pending") return "CI pending";
  return status;
}
