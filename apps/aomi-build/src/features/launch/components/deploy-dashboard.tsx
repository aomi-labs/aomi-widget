"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  ExternalLink,
  Github,
  Loader2,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import {
  fetchGitHubSession,
  fetchUserSources,
  hasSourceForLaunchUrlContext,
  launchActivate,
  launchRedeploy,
  launchSdkStatus,
  launchStatus,
  signOutGitHub,
  readLaunchUrlContext,
  loadLaunch,
  isResumingInstall,
  GITHUB_SIGNIN_URL,
  type GitHubSessionInfo,
  type LaunchUrlContext,
  type LaunchProgress,
  type LaunchSdkStatus,
} from "@build/features/launch";
import type { SecretSlot, UserSource } from "@aomi-labs/deploy";
import {
  deploymentLifecycleFromSource,
  deploymentLifecycleFromStatus,
  deploymentIdFromReleaseTag,
  failedActivationApp,
  firstActivatedApp,
  type DeploymentLifecycle,
} from "@aomi-labs/deploy/lifecycle";
import { chatAppUrl } from "@build/lib/chat-url";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { DeployStep } from "./deploy-step";
import { Onboarding } from "./onboarding";

// The subset of `useProjectDetail`'s return value the deploy dashboard needs
// to gate Activate on required secrets — kept narrow (structural typing) so
// this legacy flow doesn't have to mock the whole hook in tests.
export type SecretsGateDetail = {
  hasMissingSecrets: (app: string) => boolean;
  requiredSecrets: Record<
    string,
    { slots: SecretSlot[]; missing: string[] }
  > | null;
  loadRequiredSecrets: () => void;
};

type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "signed_in";
      login: string | null;
      installationId: string | null;
    };

/**
 * The GitHub-identity-first deploy flow:
 *   P1 sign-in gate → P2 install (reuses the existing wizard when nothing is
 *   connected) → P3 source-repository dashboard → P4 inline chat per live app.
 */
export function DeployDashboard() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchGitHubSession().then((s: GitHubSessionInfo) => {
      if (!active) return;
      setSession(
        s.signedIn
          ? {
              status: "signed_in",
              login: s.githubLogin,
              installationId: s.installationId ?? null,
            }
          : { status: "signed_out" },
      );
    });
    return () => {
      active = false;
    };
  }, []);

  if (session.status === "loading") {
    return <CenteredSpinner label="Checking GitHub session…" />;
  }
  if (session.status === "signed_out") {
    return <SignInGate />;
  }
  return (
    <SignedInDashboard
      login={session.login}
      sessionInstallationId={session.installationId}
      onSignOut={async () => {
        await signOutGitHub();
        setSession({ status: "signed_out" });
      }}
    />
  );
}

// ── Page 1: sign-in gate ─────────────────────────────────────────────────────

function SignInGate() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Deploy an example agent
        </h1>
        <p className="text-muted-foreground text-sm">
          Sign in with GitHub to deploy and manage your agents.
        </p>
      </header>

      <a
        href={GITHUB_SIGNIN_URL}
        className="bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
      >
        <Github className="h-4 w-4" /> Sign in with GitHub
      </a>

      <div className="pointer-events-none opacity-50">
        <PathBox
          title="One-click"
          subtitle="We create the repo from our template and deploy it for you."
        />
      </div>
    </div>
  );
}

function PathBox({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-input rounded-2xl border p-4">
      <div className="text-foreground text-sm font-medium">{title}</div>
      <p className="text-muted-foreground mt-1 text-sm leading-5">{subtitle}</p>
    </div>
  );
}

// ── Pages 2–4: signed-in dashboard ───────────────────────────────────────────

function SignedInDashboard({
  login,
  sessionInstallationId,
  onSignOut,
}: {
  login: string | null;
  sessionInstallationId: string | null;
  onSignOut: () => void;
}) {
  const [sources, setSources] = useState<UserSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkStatus, setSdkStatus] = useState<LaunchSdkStatus | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInstall, setShowInstall] = useState(false);
  const [urlContext] = useState<LaunchUrlContext | null>(() =>
    typeof window === "undefined"
      ? null
      : readLaunchUrlContext(window.location.search),
  );
  // A multi-step launch (template → install → deploy) outlives the
  // "nothing connected" gate: the install round-trip is a full-page nav, so by
  // the time we return a source already exists. Capture once at mount whether
  // we're mid-flow so the wizard stays mounted and can advance to Deploy,
  // instead of being yanked to the source list.
  const [resumingWizard] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : isResumingInstall(loadLaunch(), window.location.search),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserSources();
      setSources(result.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    launchSdkStatus()
      .then((status) => {
        if (!active) return;
        setSdkStatus(status);
        setSdkError(null);
      })
      .catch((e) => {
        if (!active) return;
        setSdkError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading && sources === null) {
    return <CenteredSpinner label="Loading your repositories…" />;
  }

  const header = (
    <DashboardHeader login={login} onSignOut={onSignOut} onRefresh={load} />
  );

  if (
    sources !== null &&
    urlContext &&
    !hasSourceForLaunchUrlContext(sources, urlContext)
  ) {
    return (
      <div className="space-y-6">
        {header}
        <SdkStatusPanel status={sdkStatus} error={sdkError} />
        <LaunchContextMismatch
          context={urlContext}
          login={login}
          onRefresh={load}
          onSignOut={onSignOut}
        />
      </div>
    );
  }

  // Page 2: nothing connected yet, the user asked to add another, or a launch
  // is mid-flow returning from the install round-trip → the existing
  // install/template/deploy wizard.
  if (
    showInstall ||
    resumingWizard ||
    (sources !== null && sources.length === 0)
  ) {
    return (
      <div className="space-y-6">
        {header}
        <SdkStatusPanel status={sdkStatus} error={sdkError} />
        {showInstall && sources && sources.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInstall(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Back to your repositories
          </button>
        )}
        <Onboarding
          hideWizardBack
          knownSources={sources ?? []}
          sessionInstallationId={sessionInstallationId}
        />
      </div>
    );
  }

  // Page 3: source-repository cards.
  return (
    <div className="space-y-6">
      {header}
      <SdkStatusPanel status={sdkStatus} error={sdkError} />
      {error && <ErrorBanner message={error} />}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-medium">
          Source Repositories
        </h2>
        <Button
          onClick={() => setShowInstall(true)}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          <Plus className="mr-1 h-4 w-4" /> Deploy another
        </Button>
      </div>
      <div className="space-y-4">
        {(sources ?? []).map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}

function SdkStatusPanel({
  status,
  error,
}: {
  status: LaunchSdkStatus | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-lg border p-3">
        <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="text-foreground text-sm font-medium">
            SDK status unavailable
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  if (!status) {
    return (
      <div className="border-input flex items-center gap-2 rounded-lg border p-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          Checking backend SDK version…
        </span>
      </div>
    );
  }
  const required = status.sdkStatus.requiredVersion;
  return (
    <div className="border-input flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="text-foreground text-sm font-medium">
            Backend requires aomi-sdk {required || "unknown"}
          </div>
          <p className="text-muted-foreground text-sm">
            Deployable repos must pin the SDK exactly before activation.
          </p>
        </div>
      </div>
      {status.sdkStatus.fixCommand && (
        <code className="bg-muted text-foreground rounded px-2 py-1 text-xs">
          {status.sdkStatus.fixCommand}
        </code>
      )}
    </div>
  );
}

function DashboardHeader({
  login,
  onSignOut,
  onRefresh,
}: {
  login: string | null;
  onSignOut: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Github className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-medium">
          {login ? `@${login}` : "Signed in with GitHub"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-full"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </header>
  );
}

function LaunchContextMismatch({
  context,
  login,
  onRefresh,
  onSignOut,
}: {
  context: LaunchUrlContext;
  login: string | null;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-foreground text-sm font-medium">
            This deploy link does not match the signed-in GitHub account.
          </h2>
          <p className="text-muted-foreground text-sm leading-5">
            You are signed in as{" "}
            <span className="text-foreground font-medium">
              {login ? `@${login}` : "another GitHub account"}
            </span>
            , but this URL points at
            {context.repo ? (
              <>
                {" "}
                <code className="text-foreground">{context.repo}</code>
              </>
            ) : (
              " a different repository"
            )}
            {context.installationId ? (
              <>
                {" "}
                on installation{" "}
                <code className="text-foreground">
                  {context.installationId}
                </code>
              </>
            ) : null}
            . Switch GitHub accounts or ask for a link that belongs to the
            current account.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onSignOut}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          <LogOut className="mr-1 h-4 w-4" /> Sign out
        </Button>
        <Button
          onClick={onRefresh}
          className="h-9 rounded-full px-3 text-sm font-medium"
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ── Page 3 card + Page 4 chat ────────────────────────────────────────────────

function SourceCard({ source }: { source: UserSource }) {
  const detail = useProjectDetail(source.id);
  const [localLiveApp, setLocalLiveApp] = useState<{
    name: string;
    applicationId?: number;
  } | null>(null);
  const lifecycle = useMemo(
    () => deploymentLifecycleFromSource(source),
    [source],
  );
  const [statusLifecycle, setStatusLifecycle] =
    useState<DeploymentLifecycle | null>(null);
  const liveLifecycle: DeploymentLifecycle | null = localLiveApp
    ? {
        ...(statusLifecycle ?? lifecycle),
        kind: "live",
        statusLabel: "Live",
        statusTone: "good",
        message: "The latest deployment is active.",
        chatApp: localLiveApp.name,
        chatApplicationId: localLiveApp.applicationId,
      }
    : (statusLifecycle ?? lifecycle).kind === "live"
      ? (statusLifecycle ?? lifecycle)
      : null;
  const visibleLifecycle = liveLifecycle ?? statusLifecycle ?? lifecycle;
  const derivedDeploymentId =
    lifecycle.deploymentId ??
    deploymentIdFromReleaseTag(lifecycle.releaseTags[0]);
  const chatApp = shouldShowChatForLifecycle(visibleLifecycle)
    ? visibleLifecycle.chatApp
    : undefined;

  const [progress, setProgress] = useState<LaunchProgress>(() => ({
    installationId: String(source.installationId),
    repo: lifecycle.repo,
    appSourceId: source.id,
    sourceRef: source.sourceRef ?? source.commitHash ?? undefined,
    apps: lifecycle.appNames,
    releaseTags: lifecycle.releaseTags,
    live: visibleLifecycle.kind === "live",
  }));

  const patch = useCallback(
    (p: Partial<LaunchProgress>) => setProgress((cur) => ({ ...cur, ...p })),
    [],
  );

  useEffect(() => {
    if (!derivedDeploymentId || localLiveApp) return;
    const pollKind = statusLifecycle?.kind ?? lifecycle.kind;
    if (pollKind !== "building" && pollKind !== "build_ready") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const status = await launchStatus(derivedDeploymentId);
        if (cancelled) return;
        const next = deploymentLifecycleFromStatus(lifecycle, status);
        setStatusLifecycle(next);
        if (next.kind === "building") {
          timer = setTimeout(poll, 5000);
        }
      } catch (e) {
        if (cancelled) return;
        setStatusLifecycle({
          ...lifecycle,
          kind: "failed",
          statusLabel: "Status unavailable",
          statusTone: "bad",
          message: e instanceof Error ? e.message : String(e),
          failureReport: e instanceof Error ? e.message : String(e),
        });
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [derivedDeploymentId, lifecycle, localLiveApp, statusLifecycle?.kind]);

  return (
    <div className="border-input space-y-4 rounded-2xl border p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-foreground truncate text-sm font-medium">
            {visibleLifecycle.repo}
          </div>
          <div className="text-muted-foreground text-xs">
            installation {source.installationId}
            {source.apps.length ? ` · ${source.apps.length} app(s)` : ""}
          </div>
        </div>
        <LifecycleBadge lifecycle={visibleLifecycle} />
      </div>

      {visibleLifecycle.kind === "empty" ? (
        <DeployStep
          installationId={String(source.installationId)}
          repo={visibleLifecycle.repo}
          progress={progress}
          onProgress={patch}
          detail={detail}
        />
      ) : (
        <LifecyclePanel
          appSourceId={source.id}
          lifecycle={visibleLifecycle}
          onLifecycleChange={setStatusLifecycle}
          onLive={setLocalLiveApp}
          detail={detail}
        />
      )}

      {chatApp && (
        <ChatEmbed
          appName={chatApp}
          applicationId={visibleLifecycle.chatApplicationId}
        />
      )}
    </div>
  );
}

function LifecycleBadge({ lifecycle }: { lifecycle: DeploymentLifecycle }) {
  const toneClass =
    lifecycle.statusTone === "good"
      ? "bg-green-500/10 text-green-500"
      : lifecycle.statusTone === "bad"
        ? "bg-red-500/10 text-red-500"
        : lifecycle.statusTone === "warning"
          ? "bg-amber-500/10 text-amber-500"
          : "bg-muted text-muted-foreground";
  const Icon =
    lifecycle.statusTone === "good"
      ? CheckCircle2
      : lifecycle.statusTone === "bad"
        ? XCircle
        : Clock3;
  return (
    <span
      className={`${toneClass} inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium`}
    >
      <Icon className="h-3.5 w-3.5" />
      {lifecycle.statusLabel}
    </span>
  );
}

function shouldShowChatForLifecycle(lifecycle: DeploymentLifecycle): boolean {
  return lifecycle.kind === "live" && Boolean(lifecycle.chatApp);
}

export function LifecyclePanel({
  appSourceId,
  lifecycle,
  onLifecycleChange,
  onLive,
  detail,
}: {
  appSourceId: number;
  lifecycle: DeploymentLifecycle;
  onLifecycleChange: (lifecycle: DeploymentLifecycle) => void;
  onLive: (app: { name: string; applicationId?: number }) => void;
  detail: SecretsGateDetail;
}) {
  const [action, setAction] = useState<
    "idle" | "activating" | "redeploying" | "redeploy_done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const canActivate = lifecycle.kind === "build_ready";
  const canRedeploy =
    lifecycle.kind === "live" ||
    lifecycle.kind === "build_ready" ||
    lifecycle.kind === "failed";

  useEffect(() => {
    detail.loadRequiredSecrets();
  }, [detail]);

  const blockedApps = lifecycle.appNames.filter((app) =>
    detail.hasMissingSecrets(app),
  );
  const secretsBlocked = blockedApps.length > 0;
  const missingCount = blockedApps.reduce(
    (n, app) => n + (detail.requiredSecrets?.[app]?.missing.length ?? 0),
    0,
  );

  const activate = useCallback(async () => {
    if (lifecycle.releaseTags.length === 0 || lifecycle.appNames.length === 0) {
      setError("No release tag is available to activate.");
      return;
    }
    setError(null);
    setAction("activating");
    try {
      const result = await launchActivate({
        appSourceId,
        releaseTags: lifecycle.releaseTags,
        apps: lifecycle.appNames,
      });
      const failed = failedActivationApp(result);
      if (!result.ok || failed) {
        throw new Error(failed?.error ?? "Activation failed.");
      }
      const activated = firstActivatedApp(result);
      if (!activated) {
        throw new Error("Activation did not return an application id.");
      }
      onLive({
        name: activated.name,
        applicationId: activated.applicationId ?? undefined,
      });
      setAction("idle");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (isTargetCiPending(message)) {
        onLifecycleChange({
          ...lifecycle,
          kind: "building",
          statusLabel: "Releasing",
          statusTone: "muted",
          message: "Aomi CI is still finishing for this release.",
          progressLabel: "Waiting for Aomi CI",
          progressPercent: Math.max(lifecycle.progressPercent ?? 0, 85),
          failureReport: undefined,
        });
        setError(null);
      } else {
        const body = (e as { body?: { missing?: Record<string, string[]> } })
          .body;
        if (body?.missing) {
          const names = Object.entries(body.missing)
            .map(([app, keys]) => `${app}: ${keys.join(", ")}`)
            .join("; ");
          setError(`Missing required secrets — ${names}`);
        } else {
          setError(message);
        }
      }
      setAction("idle");
    }
  }, [appSourceId, lifecycle, onLifecycleChange, onLive]);

  const redeploy = useCallback(async () => {
    setError(null);
    setAction("redeploying");
    try {
      await launchRedeploy({ appSourceId });
      setAction("redeploy_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAction("idle");
    }
  }, [appSourceId]);

  return (
    <div className="space-y-4 text-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {lifecycle.kind === "building" && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {lifecycle.message}
      </div>

      <LifecycleDetails lifecycle={lifecycle} />

      {lifecycle.progressPercent !== undefined && (
        <LifecycleProgress lifecycle={lifecycle} />
      )}

      {lifecycle.failureReport && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs leading-5 text-red-500">
          {lifecycle.failureReport}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canActivate && (
          <Button
            onClick={activate}
            disabled={action === "activating" || secretsBlocked}
            className="h-9 rounded-full px-3 text-sm font-medium"
          >
            {action === "activating" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-4 w-4" />
            )}
            Activate
          </Button>
        )}
        {canActivate && secretsBlocked && (
          <span className="text-xs text-amber-700">
            {missingCount} required secret{missingCount === 1 ? "" : "s"}{" "}
            missing — set them in the Environment tab.
          </span>
        )}
        {canRedeploy && (
          <Button
            onClick={redeploy}
            disabled={action === "redeploying"}
            className="h-9 rounded-full px-3 text-sm font-medium"
          >
            {action === "redeploying" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-4 w-4" />
            )}
            Redeploy
          </Button>
        )}
        {lifecycle.kind === "building" && (
          <Button
            disabled
            className="h-9 rounded-full px-3 text-sm font-medium"
          >
            <Play className="mr-1 h-4 w-4" />
            Deploying
          </Button>
        )}
        <LifecycleLinks lifecycle={lifecycle} />
      </div>

      {action === "redeploy_done" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-600">
          CI rerun requested. Open CI to watch the new attempt.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600">
          {error}
        </div>
      )}
    </div>
  );
}

function LifecycleProgress({ lifecycle }: { lifecycle: DeploymentLifecycle }) {
  const pct = Math.max(0, Math.min(100, lifecycle.progressPercent ?? 0));
  const barClass =
    lifecycle.kind === "failed"
      ? "bg-red-500"
      : lifecycle.kind === "build_ready"
        ? "bg-green-500"
        : "bg-blue-500";
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{lifecycle.progressLabel ?? lifecycle.statusLabel}</span>
        <span>{pct}%</span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={`${barClass} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function isTargetCiPending(message: string): boolean {
  return (
    message.includes("target CI is pending") ||
    message.includes("activate after Aomi CI passes")
  );
}

function LifecycleDetails({ lifecycle }: { lifecycle: DeploymentLifecycle }) {
  const hasDetails =
    lifecycle.deploymentId ||
    lifecycle.ciStatus ||
    lifecycle.releaseTags.length > 0 ||
    lifecycle.commitHash ||
    lifecycle.buildTarget;
  if (!hasDetails) return null;

  return (
    <div className="border-input bg-muted/20 grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
      <SummaryTile
        label="Deployment"
        value={lifecycle.deploymentId ?? "Current source"}
        detail={lifecycle.commitHash?.slice(0, 12)}
      />
      <SummaryTile
        label="Build"
        value={lifecycle.ciStatus ?? lifecycle.statusLabel}
        detail={lifecycle.deployBranch ?? lifecycle.platformRepo ?? undefined}
        tone={
          lifecycle.ciStatus === "passed"
            ? "good"
            : lifecycle.ciStatus === "failed"
              ? "bad"
              : "muted"
        }
      />
      <SummaryTile
        label="Release"
        value={lifecycle.appNames.join(", ") || "App"}
        detail={[
          lifecycle.buildTarget,
          lifecycle.releaseTags.length > 1
            ? `${lifecycle.releaseTags.length} tags`
            : lifecycle.releaseTags[0],
        ]
          .filter(Boolean)
          .join(" · ")}
      />
    </div>
  );
}

function LifecycleLinks({ lifecycle }: { lifecycle: DeploymentLifecycle }) {
  if (!lifecycle.branchUrl && !lifecycle.ciUrl) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {lifecycle.branchUrl && (
        <a
          href={lifecycle.branchUrl}
          target="_blank"
          rel="noreferrer"
          className="text-foreground inline-flex items-center gap-1 underline"
        >
          Open branch <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {lifecycle.ciUrl && (
        <a
          href={lifecycle.ciUrl}
          target="_blank"
          rel="noreferrer"
          className="text-foreground inline-flex items-center gap-1 underline"
        >
          Open CI <ExternalLink className="h-3.5 w-3.5" />
        </a>
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
      <div className="text-muted-foreground text-[11px] uppercase">{label}</div>
      <div className={`${toneClass} truncate text-sm font-medium`}>
        {value || "Pending"}
      </div>
      {detail && (
        <div className="text-muted-foreground truncate text-xs">{detail}</div>
      )}
    </div>
  );
}

function ChatEmbed({
  appName,
  applicationId,
}: {
  appName: string;
  applicationId?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="text-foreground text-sm font-medium">
        Chat with your agent
      </div>
      <iframe
        src={chatAppUrl(appName, { locked: true, applicationId })}
        title={`Chat with ${appName}`}
        className="border-input bg-background h-[600px] w-full rounded-xl border"
      />
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  );
}
