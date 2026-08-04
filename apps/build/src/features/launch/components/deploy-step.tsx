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
import type { SecretSlot } from "@aomi-labs/deploy";
import {
  deploymentSources,
  launchActivate,
  launchDeploy,
  launchPreflight,
  launchStatus,
  type LaunchDeployPayload,
  type LaunchProgress,
} from "@build/features/launch";
import { MissingRequiredSecretsError } from "@build/features/launch/required-secrets";

// The subset of `useProjectDetail`'s return value this step needs to gate
// Activate on required secrets. Optional: the onboarding wizard renders this
// step before a project (and its required-secret state) exists, so a missing
// `detail` fails open — same policy as the 409 backstop.
type SecretsGateDetail = {
  hasMissingSecrets: (app: string) => boolean;
  requiredSecrets: Record<
    string,
    { slots: SecretSlot[]; missing: string[] }
  > | null;
  requiredSecretsError?: string | null;
  loadRequiredSecrets: () => void;
  refreshRequiredSecrets?: () => Promise<unknown>;
  ensureRequiredSecrets?: (
    apps: string[],
    appSourceId?: number,
  ) => Promise<void>;
  setEnvVars?: (
    app: string,
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

type ProgressModel = {
  completed: number;
  total: number;
  label: string;
};

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

function releaseTags(deployment?: LaunchDeployPayload): string[] {
  return deploymentApps(deployment)
    .map((app) => app.releaseTag)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

function appNames(deployment?: LaunchDeployPayload): string[] {
  return deploymentApps(deployment)
    .map((app) => app.name?.trim())
    .filter((name): name is string => Boolean(name));
}

const BACKOFF_BASE_MS = 3000;
const MAX_BACKOFF_MS = 30000;
const DEPLOY_TIMEOUT_MS = 30 * 60 * 1000; // 30-minute hard limit

function backoffDelay(failureCount: number): number {
  const delay = BACKOFF_BASE_MS * Math.pow(2, failureCount);
  return Math.min(delay, MAX_BACKOFF_MS);
}

function buildProgressModel(
  state: string,
  lastCompleted: number,
): ProgressModel {
  const stateToSteps: Record<
    string,
    { completed: number; total: number; label: string }
  > = {
    pending: { completed: 1, total: 8, label: "Waiting for build" },
    building: { completed: 2, total: 8, label: "Building CI" },
    releasing: { completed: 5, total: 8, label: "Verifying release assets" },
    ready: { completed: 8, total: 8, label: "Build ready" },
    no_ci: { completed: lastCompleted, total: 8, label: "No CI" },
    failed: { completed: lastCompleted, total: 8, label: "Build failed" },
  };
  const mapped = stateToSteps[state] ?? {
    completed: lastCompleted,
    total: 8,
    label: "In progress",
  };
  return {
    completed: Math.max(mapped.completed, lastCompleted),
    total: mapped.total,
    label: mapped.label,
  };
}

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
  /** GitHub App installation for wizard context; deploy uses appSourceId or repo. */
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
  const [requiredSecretValues, setRequiredSecretValues] = useState<
    Record<string, string>
  >({});
  const [savingRequiredSecrets, setSavingRequiredSecrets] = useState(false);
  const [retryingRequiredSecrets, setRetryingRequiredSecrets] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusFailuresRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const [progressModel, setProgressModel] = useState<ProgressModel | null>(
    null,
  );
  const lastCompletedRef = useRef(0);

  const tags = useMemo(
    () => progress.releaseTags ?? releaseTags(deployment),
    [deployment, progress.releaseTags],
  );
  const apps = useMemo(
    () => progress.apps ?? appNames(deployment),
    [deployment, progress.apps],
  );
  const manifestJson = useMemo(
    () => (deployment ? JSON.stringify(deployment, null, 2) : ""),
    [deployment],
  );

  useEffect(() => {
    detail?.loadRequiredSecrets();
  }, [detail]);

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
      .map((slot) => ({ app, slot })),
  );

  const saveRequiredSecrets = useCallback(async () => {
    if (!detail?.setEnvVars || missingSecretSlots.length === 0) return;
    const valuesByApp = new Map<string, Record<string, string>>();
    for (const { app, slot } of missingSecretSlots) {
      const value = requiredSecretValues[`${app}::${slot.name}`] ?? "";
      if (!value) {
        setError(`Enter a value for ${slot.name}.`);
        return;
      }
      const values = valuesByApp.get(app) ?? {};
      values[slot.name] = value;
      valuesByApp.set(app, values);
    }
    setSavingRequiredSecrets(true);
    setError(null);
    try {
      await Promise.all(
        Array.from(valuesByApp, ([app, values]) =>
          detail.setEnvVars?.(app, values),
        ),
      );
      setRequiredSecretValues({});
      await detail.ensureRequiredSecrets?.(apps);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingRequiredSecrets(false);
    }
  }, [apps, detail, missingSecretSlots, requiredSecretValues]);

  const retryRequiredSecrets = useCallback(async () => {
    if (!detail?.refreshRequiredSecrets) return;
    setRetryingRequiredSecrets(true);
    setError(null);
    try {
      await detail.refreshRequiredSecrets();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRetryingRequiredSecrets(false);
    }
  }, [detail]);

  const applyDeployment = useCallback(
    (next: {
      repo?: string;
      installationId?: string;
      appSourceId?: number;
      sourceRef?: string;
      deployment: LaunchDeployPayload;
      releaseTags?: string[];
      apps?: string[];
    }) => {
      const nextTags = next.releaseTags ?? releaseTags(next.deployment);
      const nextApps = next.apps ?? appNames(next.deployment);
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
      if (next.appSourceId) patch.appSourceId = next.appSourceId;
      onProgress(patch);
    },
    [onProgress, repo],
  );

  const preflight = useCallback(async () => {
    setPhase("preflight_running");
    setError(null);
    statusFailuresRef.current = 0;
    try {
      const result = await launchPreflight({
        platform,
        installationId,
        repo,
        appSourceId: progress.appSourceId,
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
    platform,
    progress.appSourceId,
    progress.sourceRef,
    repo,
  ]);

  const deploy = useCallback(async () => {
    setPhase("deploying");
    setError(null);
    statusFailuresRef.current = 0;
    try {
      // Deploy commits against a stable source row id. The first deploy after
      // an install has none yet, so a preflight mints it (and primes the
      // preview); afterwards we go straight through by id.
      let appSourceId = progress.appSourceId;
      let sourceRef = progress.sourceRef ?? deployment?.source?.ref;
      let targetApps = apps;
      if (!appSourceId || !sourceRef) {
        const preflightResult = await launchPreflight({
          platform,
          installationId,
          repo,
          appSourceId,
          sourceRef,
          actor,
        });
        applyDeployment(preflightResult);
        appSourceId = preflightResult.appSourceId;
        sourceRef =
          preflightResult.sourceRef ?? preflightResult.deployment.source?.ref;
        targetApps = preflightResult.apps;
      }
      if (!appSourceId) {
        throw new Error(
          "Could not resolve a source to deploy. Run a preflight first.",
        );
      }
      await detail?.ensureRequiredSecrets?.(targetApps, appSourceId);
      const result = await launchDeploy({
        platform,
        appSourceId,
        sourceRef,
        repo,
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
      if (result.appSourceId) patch.appSourceId = result.appSourceId;
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
    platform,
    onProgress,
    progress.appSourceId,
    progress.sourceRef,
    repo,
    deployment,
  ]);

  useEffect(() => {
    if (
      !deploymentId ||
      (phase !== "building" && phase !== "deploying" && phase !== "releasing")
    )
      return;
    let cancelled = false;
    if (startTimeRef.current === null) startTimeRef.current = Date.now();
    const tick = async () => {
      if (Date.now() - (startTimeRef.current ?? 0) > DEPLOY_TIMEOUT_MS) {
        setPhase("error");
        setError("Deploy timed out after 30 minutes.");
        return;
      }
      try {
        const status = await launchStatus(deploymentId, platform);
        if (cancelled) return;
        statusFailuresRef.current = 0;
        if (status.deployment) {
          setDeployment(status.deployment);
        }
        // Update progress model with monotonic clamping
        const model = buildProgressModel(
          status.state,
          lastCompletedRef.current,
        );
        lastCompletedRef.current = model.completed;
        setProgressModel(model);

        const patch: Partial<LaunchProgress> = {
          deploymentId,
          live: false,
        };
        if (status.deployment) patch.deployment = status.deployment;
        if (status.releaseTags.length > 0)
          patch.releaseTags = status.releaseTags;
        onProgress(patch);
        if (status.state === "ready") {
          setPhase("ready");
          return;
        }
        if (status.state === "releasing") {
          setPhase("releasing");
          pollRef.current = setTimeout(tick, 3000);
          return;
        }
        if (status.state === "pending") {
          setPhase("building");
          pollRef.current = setTimeout(tick, 6000);
          return;
        }
        if (status.state === "failed" || status.state === "no_ci") {
          setError(
            status.message ??
              (status.state === "no_ci"
                ? "No CI ran for this deployment."
                : "Deploy CI failed."),
          );
          setPhase("error");
          return;
        }
        setPhase("building");
        pollRef.current = setTimeout(tick, 5000);
      } catch (e) {
        if (cancelled) return;
        statusFailuresRef.current += 1;
        if (statusFailuresRef.current < 8) {
          setPhase("building");
          const delay = backoffDelay(statusFailuresRef.current);
          pollRef.current = setTimeout(tick, delay);
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    };
    pollRef.current = setTimeout(tick, phase === "deploying" ? 1500 : 4000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [deploymentId, onProgress, phase, platform]);

  const verifyLive = useCallback(
    async (nextApps = apps, nextTags = tags) => {
      setPhase("verifying");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        setVerifyAttempt(attempt + 1);
        try {
          const result = await deploymentSources(
            undefined,
            progress.appSourceId,
          );
          const source = result.sources.find(
            (candidate) => candidate.id === progress.appSourceId,
          );
          const checks = nextApps.map((name, index) =>
            source?.apps.find(
              (app) =>
                app.name === name &&
                (!nextTags[index] || app.appReleaseTag === nextTags[index]),
            ),
          );
          if (
            checks.length > 0 &&
            checks.every((app) => app?.isActive && app.loaded)
          ) {
            const firstApplicationId = checks
              .find((app) => app?.id)
              ?.id.toString();
            onProgress({
              live: true,
              applicationId: firstApplicationId,
            });
            setPhase("live");
            return;
          }
        } catch (e) {
          if (attempt === 29) {
            setError(e instanceof Error ? e.message : String(e));
            setPhase("error");
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      setError(
        "Activation was accepted, but the app artifact did not become ready.",
      );
      setPhase("error");
    },
    [apps, onProgress, progress.appSourceId, tags],
  );

  const activate = useCallback(async () => {
    if (!progress.appSourceId) {
      setError("App source is missing; rerun deployment before activation.");
      setPhase("error");
      return;
    }
    setPhase("activating");
    setError(null);
    try {
      const result = await launchActivate({
        platform,
        appSourceId: progress.appSourceId,
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
  }, [
    actor,
    apps,
    onProgress,
    platform,
    progress.appSourceId,
    tags,
    verifyLive,
  ]);

  const reset = useCallback(() => {
    setError(null);
    statusFailuresRef.current = 0;
    startTimeRef.current = null;
    lastCompletedRef.current = 0;
    setProgressModel(null);
    setVerifyAttempt(0);
    setDeploymentId(undefined);
    onProgress({ deploymentId: undefined, live: false });
    setPhase(deployment ? "preflight_ready" : "idle");
    onReset?.();
  }, [deployment, onProgress, onReset]);

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
        <div
          className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
          role="alert"
        >
          <div className="font-medium text-amber-800">
            {secretsCheckPending
              ? "Checking required secrets…"
              : detail?.requiredSecretsError
                ? "Required secrets could not be verified."
                : `${missingSecretsCount} required secret${missingSecretsCount === 1 ? "" : "s"} missing.`}
          </div>
          {detail?.requiredSecretsError ? (
            <div className="flex flex-wrap items-center gap-3 text-amber-800">
              <span>{detail.requiredSecretsError}. Try again.</span>
              {detail.refreshRequiredSecrets && (
                <Button
                  onClick={() => void retryRequiredSecrets()}
                  disabled={retryingRequiredSecrets}
                  className="h-8 rounded-full px-3 text-xs font-medium"
                >
                  {retryingRequiredSecrets
                    ? "Retrying…"
                    : "Retry required secrets"}
                </Button>
              )}
            </div>
          ) : (
            <>
              {missingSecretSlots.map(({ app, slot }) => (
                <label key={`${app}::${slot.name}`} className="block">
                  <span className="mb-1 block font-mono text-[11px] text-amber-900">
                    {app} · {slot.name}
                  </span>
                  <input
                    type="password"
                    value={requiredSecretValues[`${app}::${slot.name}`] ?? ""}
                    onChange={(event) =>
                      setRequiredSecretValues((values) => ({
                        ...values,
                        [`${app}::${slot.name}`]: event.target.value,
                      }))
                    }
                    placeholder={slot.description || "Required value"}
                    aria-label={`${app} ${slot.name}`}
                    disabled={savingRequiredSecrets}
                    className="bg-input text-foreground border-border h-8 w-full rounded-md border px-2 text-xs"
                  />
                </label>
              ))}
              {missingSecretSlots.length > 0 && detail?.setEnvVars && (
                <Button
                  onClick={() => void saveRequiredSecrets()}
                  disabled={savingRequiredSecrets || secretsCheckPending}
                  className="h-8 rounded-full px-3 text-xs font-medium"
                >
                  {savingRequiredSecrets ? "Saving…" : "Save required secrets"}
                </Button>
              )}
              {missingSecretSlots.length > 0 && !detail?.setEnvVars && (
                <div className="text-amber-800">
                  Set these values in the project Environment tab before
                  activating.
                </div>
              )}
            </>
          )}
        </div>
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
          `Checking runtime... attempt ${verifyAttempt}/30`}
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
  const sourceBranch = platform?.sourceBranch;
  const target = apps[0]?.target;
  const fileCount = apps.reduce((sum, app) => {
    return sum + (app.files?.length ?? 0);
  }, 0);

  return (
    <div className="border-input bg-muted/20 space-y-3 rounded-xl border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Source"
          value={source?.ownerRepoName ?? source?.repositoryLink ?? "Repo"}
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
          detail={sourceBranch ?? platform?.repository}
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
