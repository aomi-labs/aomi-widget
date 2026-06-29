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
import {
  launchActivate,
  launchAppStatus,
  launchDeploy,
  launchPreflight,
  launchStatus,
  type LaunchDeployPayload,
  type LaunchProgress,
} from "@portal/features/launch";

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

async function readSdkPin(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/aomi-sdk\s*=\s*"=?([0-9]+\.[0-9]+\.[0-9]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// A deploy/preflight that fails with a server error is most often an aomi-sdk pin the
// platform no longer accepts, which otherwise surfaces as an opaque "(502)". Compare the
// app's pinned SDK against the platform's current version (the playground template's pin
// is the canonical version builders must match) and return an actionable message instead.
// Fails open to the raw error for anything that isn't a clear version mismatch.
async function enrichDeployError(
  repo: string | undefined,
  raw: string,
): Promise<string> {
  if (!repo || !/\((?:400|409|500|502)\)/.test(raw)) return raw;
  const [appSdk, requiredSdk] = await Promise.all([
    readSdkPin(`https://api.github.com/repos/${repo}/contents/Cargo.toml`, {
      headers: { Accept: "application/vnd.github.raw" },
    }),
    readSdkPin(
      "https://raw.githubusercontent.com/aomi-labs/playground-example/main/Cargo.toml",
    ),
  ]);
  if (appSdk && requiredSdk && appSdk !== requiredSdk) {
    return `Your app pins aomi-sdk ${appSdk}, but the platform requires ${requiredSdk}. Set aomi-sdk = "=${requiredSdk}" in your Cargo.toml, push, and redeploy.`;
  }
  return raw;
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

export function DeployStep({
  installationId,
  repo,
  actor,
  progress,
  onProgress,
  onReconnectInstall,
  onReset,
}: {
  /** GitHub App installation for wizard context; deploy uses appSourceId or repo. */
  installationId: string;
  repo?: string;
  actor?: string;
  progress: LaunchProgress;
  onProgress: (patch: Partial<LaunchProgress>) => void;
  onReconnectInstall?: () => void;
  onReset?: () => void;
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
        installationId,
        repo,
        appSourceId: progress.appSourceId,
        sourceRef: progress.sourceRef,
        actor,
      });
      applyDeployment(result);
      setPhase("preflight_ready");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(await enrichDeployError(repo, raw));
      setPhase("error");
    }
  }, [
    actor,
    applyDeployment,
    installationId,
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
      if (!appSourceId || !sourceRef) {
        const preflightResult = await launchPreflight({
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
      }
      if (!appSourceId) {
        throw new Error(
          "Could not resolve a source to deploy. Run a preflight first.",
        );
      }
      const result = await launchDeploy({
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
      const raw = e instanceof Error ? e.message : String(e);
      setError(await enrichDeployError(repo, raw));
      setPhase("error");
    }
  }, [
    actor,
    applyDeployment,
    installationId,
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
        const status = await launchStatus(deploymentId);
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
  }, [deploymentId, onProgress, phase]);

  const verifyLive = useCallback(
    async (nextApps = apps, nextTags = tags) => {
      setPhase("verifying");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        setVerifyAttempt(attempt + 1);
        try {
          const checks = await Promise.all(
            nextApps.map((name, index) =>
              launchAppStatus({ name, releaseTag: nextTags[index] }),
            ),
          );
          if (
            checks.length > 0 &&
            checks.every((check) => check.ok && check.state === "live")
          ) {
            onProgress({ live: true });
            setPhase("live");
            return;
          }
          // Early exit if any app reports a terminal error
          const terminal = checks.find(
            (c) =>
              c.ok === false ||
              (c.app?.is_active === false && c.app?.loaded === false),
          );
          if (terminal) {
            setError(
              terminal.app?.name
                ? `Runtime check failed for ${terminal.app.name}`
                : "Runtime reported a terminal error during verification.",
            );
            setPhase("error");
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
    [apps, onProgress, tags],
  );

  const activate = useCallback(async () => {
    setPhase("activating");
    setError(null);
    try {
      const result = await launchActivate({ releaseTags: tags, apps, actor });
      const activatedApps = result.activation?.apps ?? [];
      if (!result.ok || activatedApps.some((app) => app.error)) {
        const failed = activatedApps.find((app) => app.error);
        throw new Error(failed?.error ?? "Activation was not accepted.");
      }
      await verifyLive(apps, tags);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(await enrichDeployError(repo, raw));
      setPhase("error");
    }
  }, [actor, apps, repo, tags, verifyLive]);

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

  return (
    <div className="space-y-4 text-sm">
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
          disabled={phase !== "ready" || tags.length === 0}
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

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
        {phase === "releasing" && "Release built — verifying assets."}
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
