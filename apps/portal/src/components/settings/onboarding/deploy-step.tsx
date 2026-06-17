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
  onboardActivate,
  onboardAppStatus,
  onboardDeploy,
  onboardDryRun,
  onboardStatus,
  type OnboardDeployPayload,
  type OnboardingPath,
  type PathProgress,
} from "@portal/lib/onboarding";

type Phase =
  | "idle"
  | "dry_running"
  | "dry_ready"
  | "deploying"
  | "building"
  | "releasing"
  | "ready"
  | "activating"
  | "verifying"
  | "live"
  | "error";

function deploymentApps(deployment?: OnboardDeployPayload) {
  return deployment?.platform?.apps ?? [];
}

function releaseTags(deployment?: OnboardDeployPayload): string[] {
  return deploymentApps(deployment)
    .map((app) => app.release_tag ?? app.releaseTag)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

function appNames(deployment?: OnboardDeployPayload): string[] {
  return deploymentApps(deployment)
    .map((app) => app.name?.trim())
    .filter((name): name is string => Boolean(name));
}

const BACKOFF_BASE_MS = 3000;
const MAX_BACKOFF_MS = 30000;

function backoffDelay(failureCount: number): number {
  const delay = BACKOFF_BASE_MS * Math.pow(2, failureCount);
  return Math.min(delay, MAX_BACKOFF_MS);
}

function initialPhase(progress: PathProgress): Phase {
  if (progress.live) return "live";
  if (!progress.deploymentId) return progress.deployment ? "dry_ready" : "idle";
  return "building";
}

export function DeployStep({
  path,
  installationId,
  repo,
  actor,
  progress,
  onProgress,
  onReconnectInstall,
}: {
  path: OnboardingPath;
  installationId: string;
  repo?: string;
  actor?: string;
  progress: PathProgress;
  onProgress: (patch: Partial<PathProgress>) => void;
  onReconnectInstall?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(() => initialPhase(progress));
  const [deployment, setDeployment] = useState<
    OnboardDeployPayload | undefined
  >(progress.deployment);
  const [deploymentId, setDeploymentId] = useState<string | undefined>(
    progress.deploymentId,
  );
  const [error, setError] = useState<string | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusFailuresRef = useRef(0);

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
      deployment: OnboardDeployPayload;
      releaseTags?: string[];
      apps?: string[];
    }) => {
      const nextTags = next.releaseTags ?? releaseTags(next.deployment);
      const nextApps = next.apps ?? appNames(next.deployment);
      setDeployment(next.deployment);
      setShowManifest(false);
      onProgress({
        repo: next.repo ?? repo,
        deployment: next.deployment,
        releaseTags: nextTags,
        apps: nextApps,
      });
    },
    [onProgress, repo],
  );

  const dryRun = useCallback(async () => {
    setPhase("dry_running");
    setError(null);
    statusFailuresRef.current = 0;
    try {
      const result = await onboardDryRun({ path, installationId, repo, actor });
      applyDeployment(result);
      setPhase("dry_ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [actor, applyDeployment, installationId, path, repo]);

  const deploy = useCallback(async () => {
    setPhase("deploying");
    setError(null);
    statusFailuresRef.current = 0;
    try {
      if (!deployment) {
        const dryResult = await onboardDryRun({
          path,
          installationId,
          repo,
          actor,
        });
        applyDeployment(dryResult);
      }
      const result = await onboardDeploy({ path, installationId, repo, actor });
      applyDeployment(result);
      const id = result.deployment.id;
      setDeploymentId(id);
      onProgress({
        repo: result.repo ?? repo,
        deploymentId: id,
        deployment: result.deployment,
        releaseTags: result.releaseTags,
        apps: result.apps,
        live: false,
      });
      setPhase("building");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [actor, applyDeployment, deployment, installationId, onProgress, path, repo]);

  useEffect(() => {
    if (!deploymentId || (phase !== "building" && phase !== "deploying" && phase !== "releasing"))
      return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await onboardStatus(deploymentId);
        if (cancelled) return;
        statusFailuresRef.current = 0;
        if (status.deployment) {
          setDeployment(status.deployment);
        }
        const patch: Partial<PathProgress> = {
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
        if (status.state === "failed") {
          setError(status.message ?? "Deploy CI failed.");
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
              onboardAppStatus({ name, releaseTag: nextTags[index] }),
            ),
          );
          if (
            checks.length > 0 &&
            checks.every((check) => check.state === "live")
          ) {
            onProgress({ live: true });
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
        "Activation finished, but the runtime did not report the app as loaded.",
      );
      setPhase("error");
    },
    [apps, onProgress, tags],
  );

  const activate = useCallback(async () => {
    setPhase("activating");
    setError(null);
    try {
      const result = await onboardActivate({ releaseTags: tags, apps, actor });
      const activatedApps = result.activation?.apps ?? [];
      if (!result.ok || activatedApps.some((app) => !app.loaded || app.error)) {
        const failed = activatedApps.find((app) => app.error);
        throw new Error(failed?.error ?? "Activation did not load every app.");
      }
      await verifyLive(apps, tags);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [actor, apps, tags, verifyLive]);

  const reset = useCallback(() => {
    setError(null);
    statusFailuresRef.current = 0;
    setVerifyAttempt(0);
    setDeploymentId(undefined);
    onProgress({ deploymentId: undefined, live: false });
    setPhase(deployment ? "dry_ready" : "idle");
  }, [deployment, onProgress]);

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
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={dryRun}
          disabled={phase !== "idle" && phase !== "dry_ready"}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          {phase === "dry_running" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-1 h-4 w-4" />
          )}
          Dry run
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
          // Enable once the release assets exist (tags populated from status),
          // even if the status flag never flips to "ready" — the build is done
          // and gating activation solely on a poll state can strand a good release.
          disabled={
            tags.length === 0 ||
            !["building", "releasing", "ready"].includes(phase)
          }
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          {phase === "activating" || phase === "verifying" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 h-4 w-4" />
          )}
          Activate
        </Button>
        {["building", "ready", "activating", "verifying"].includes(
          phase,
        ) && (
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
          "dry_running",
          "deploying",
          "building",
          "releasing",
          "activating",
          "verifying",
        ].includes(phase) && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {phase === "idle" &&
          "Run a dry run to preview the deployment manifest."}
        {phase === "dry_running" &&
          "Resolving source and rendering deployment.json."}
        {phase === "dry_ready" && "Dry run is ready. Review it, then deploy."}
        {phase === "deploying" &&
          "Creating or updating the platform deploy branch."}
        {phase === "building" &&
          (tags.length > 0
            ? "Release assets are published — you can activate now even if status sync is still catching up."
            : "Waiting for platform CI and release assets.")}
        {phase === "releasing" &&
          "Release built — verifying assets."}
        {phase === "ready" && "Build is ready for activation."}
        {phase === "activating" &&
          "Promoting the built release into the live branch."}
        {phase === "verifying" &&
          `Checking runtime... attempt ${verifyAttempt}/30`}
        {phase === "live" && "Runtime reports the app is loaded."}
      </div>

      {deploymentId && (
        <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          deployment{" "}
          <code className="text-foreground">{deploymentId}</code>
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
              <span className="text-green-500 text-[10px]">copied</span>
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
  deployment: OnboardDeployPayload;
  tags: string[];
  phase: Phase;
  showManifest: boolean;
  manifestJson: string;
  onToggleManifest: () => void;
}) {
  const platform = deployment.platform;
  const apps = deploymentApps(deployment);
  const source = deployment.source as
    | {
        repository_link?: string;
        owner_repo_name?: string;
        commit_hash?: string;
        ref?: { kind?: string; value?: string };
      }
    | undefined;
  const ciStatus = platform?.ci_status ?? platform?.ciStatus;
  const ciUrl = platform?.ci_url ?? platform?.ciUrl;
  const prNumber = platform?.pr_number ?? platform?.prNumber;
  const prUrl = platform?.pr_url ?? platform?.prUrl;
  const sourceBranch = platform?.source_branch ?? platform?.sourceBranch;
  const target = apps[0]?.target;
  const fileCount = apps.reduce((sum, app) => {
    const files = "files" in app && Array.isArray(app.files) ? app.files : [];
    return sum + files.length;
  }, 0);

  return (
    <div className="border-input bg-muted/20 space-y-3 rounded-xl border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Source"
          value={source?.owner_repo_name ?? source?.repository_link ?? "Repo"}
          detail={
            source?.commit_hash
              ? `${source.commit_hash.slice(0, 12)} from ${
                  source.ref?.value ?? "source"
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

function statusLabel(phase: Phase): string {
  switch (phase) {
    case "dry_ready":
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
