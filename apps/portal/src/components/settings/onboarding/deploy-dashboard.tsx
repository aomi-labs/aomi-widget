"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Github,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@aomi-labs/widget-lib";
import {
  fetchGitHubSession,
  fetchUserSources,
  signOutGitHub,
  GITHUB_SIGNIN_URL,
  type GitHubSessionInfo,
  type UserSource,
} from "@portal/lib/dashboard";
import { normalizeRepo, type PathProgress } from "@portal/lib/onboarding";
import { chatAppUrl } from "@portal/lib/chat-url";
import { DeployStep } from "./deploy-step";
import { Onboarding } from "./onboarding";

type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; login: string | null };

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
          ? { status: "signed_in", login: s.githubLogin }
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

      <div className="pointer-events-none grid gap-3 opacity-50 sm:grid-cols-2">
        <PathBox
          title="One-click"
          subtitle="We create the repo and deploy it for you."
        />
        <PathBox
          title="Fork & customize"
          subtitle="Make your own repo from our template, then we deploy it."
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Choose a path after signing in.
      </p>
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
  onSignOut,
}: {
  login: string | null;
  onSignOut: () => void;
}) {
  const [sources, setSources] = useState<UserSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInstall, setShowInstall] = useState(false);

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

  if (loading && sources === null) {
    return <CenteredSpinner label="Loading your repositories…" />;
  }

  const header = (
    <DashboardHeader login={login} onSignOut={onSignOut} onRefresh={load} />
  );

  // Page 2: nothing connected yet (or the user asked to add another) → the
  // existing install/template/deploy wizard.
  if (showInstall || (sources !== null && sources.length === 0)) {
    return (
      <div className="space-y-6">
        {header}
        {showInstall && sources && sources.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInstall(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Back to your repositories
          </button>
        )}
        <Onboarding />
      </div>
    );
  }

  // Page 3: source-repository cards.
  return (
    <div className="space-y-6">
      {header}
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

// ── Page 3 card + Page 4 chat ────────────────────────────────────────────────

function SourceCard({ source }: { source: UserSource }) {
  const repo =
    normalizeRepo(source.repositoryLink ?? "") ??
    source.repositoryLink ??
    `source ${source.id}`;
  const liveApp = source.apps.find((a) => a.isActive && a.loaded);

  const [progress, setProgress] = useState<PathProgress>(() => ({
    installationId: String(source.installationId),
    repo,
    apps: source.apps.map((a) => a.name),
    releaseTags: source.apps
      .map((a) => a.appReleaseTag ?? "")
      .filter((tag): tag is string => Boolean(tag)),
    live: Boolean(liveApp),
  }));

  const patch = useCallback(
    (p: Partial<PathProgress>) => setProgress((cur) => ({ ...cur, ...p })),
    [],
  );

  const chatApp = progress.live
    ? (progress.apps?.[0] ?? liveApp?.name)
    : undefined;

  return (
    <div className="border-input space-y-4 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-foreground truncate text-sm font-medium">
            {repo}
          </div>
          <div className="text-muted-foreground text-xs">
            installation {source.installationId}
            {source.apps.length ? ` · ${source.apps.length} app(s)` : ""}
          </div>
        </div>
        {liveApp && (
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
            live
          </span>
        )}
      </div>

      <DeployStep
        path="bootstrap"
        installationId={String(source.installationId)}
        repo={repo}
        progress={progress}
        onProgress={patch}
      />

      {chatApp && <ChatEmbed appName={chatApp} />}
    </div>
  );
}

function ChatEmbed({ appName }: { appName: string }) {
  return (
    <div className="space-y-2">
      <div className="text-foreground text-sm font-medium">
        Chat with your agent
      </div>
      <iframe
        src={chatAppUrl(appName)}
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
