"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import {
  onboardDeploy,
  onboardStatus,
  type OnboardingPath,
} from "@portal/lib/onboarding";

type Phase = "deploying" | "building" | "live" | "error";

/**
 * The one backend-coupled step, shared by both wizards. Auto-starts once it
 * becomes the active step: kicks off the deploy, then polls until the release
 * is live. Reports results up so the parent can persist them.
 *
 * The deploy/status calls hit /api/onboard/* — currently 501 stubs pending the
 * backend's application_id contract. Until those land, this renders a clear
 * "backend wiring pending" notice with a retry, and the GitHub-side steps above
 * stay fully functional.
 */
export function DeployStep({
  path,
  installationId,
  repo,
  actor,
  active,
  releaseTag,
  onDeployStarted,
  onLive,
}: {
  path: OnboardingPath;
  installationId: string;
  repo?: string;
  actor?: string;
  active: boolean;
  /** Set if a deploy was already kicked off (resume after reload). */
  releaseTag?: string;
  /** Fires when the deploy is accepted (repo + releaseTag known) — persist this
   *  so a reload resumes polling rather than re-running create. */
  onDeployStarted: (result: {
    repo: string;
    releaseTag: string;
    applicationId?: string;
  }) => void;
  onLive: (result: {
    repo: string;
    releaseTag: string;
    applicationId?: string;
  }) => void;
}) {
  const [phase, setPhase] = useState<Phase>(releaseTag ? "building" : "deploying");
  const [tag, setTag] = useState<string | undefined>(releaseTag);
  const [resolvedRepo, setResolvedRepo] = useState<string | undefined>(repo);
  const [appId, setAppId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Kick off the deploy once, when this becomes the active step.
  useEffect(() => {
    if (!active || startedRef.current || tag) return;
    startedRef.current = true;
    setPhase("deploying");
    setError(null);
    (async () => {
      try {
        const result = await onboardDeploy({ path, installationId, repo, actor });
        setTag(result.releaseTag);
        setResolvedRepo(result.repo);
        setAppId(result.applicationId);
        onDeployStarted(result);
        setPhase("building");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    })();
  }, [active, tag, path, installationId, repo, actor, attempt, onDeployStarted]);

  // 2. Poll until the release is live.
  useEffect(() => {
    if (phase !== "building" || !tag) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await onboardStatus(tag);
        if (cancelled) return;
        if (s.state === "live") {
          setPhase("live");
          onLive({
            repo: resolvedRepo ?? repo ?? "",
            releaseTag: tag,
            applicationId: appId,
          });
          return;
        }
        if (s.state === "failed") {
          setError(s.message ?? "Build failed.");
          setPhase("error");
          return;
        }
        pollRef.current = setTimeout(tick, 4000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    };
    pollRef.current = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [phase, tag, resolvedRepo, repo, appId, onLive]);

  const retry = useCallback(() => {
    startedRef.current = false;
    setTag(undefined);
    setError(null);
    setPhase("deploying");
    setAttempt((n) => n + 1);
  }, []);

  if (phase === "error") {
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <div className="text-foreground flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <div className="font-medium">Backend wiring pending</div>
            <div className="text-muted-foreground mt-0.5 text-xs break-words">
              {error}
            </div>
          </div>
        </div>
        <Button
          onClick={retry}
          className="h-8 rounded-full px-3 text-xs font-medium"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      {phase === "deploying"
        ? path === "oneshot"
          ? "Creating your repo and starting the deploy…"
          : "Starting the deploy…"
        : "Building release → activating…"}
      {tag && <code className="text-foreground text-xs">{tag}</code>}
    </div>
  );
}
