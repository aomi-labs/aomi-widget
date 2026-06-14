"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";
import { Button, Input, useAomiWalletKit } from "@aomi-labs/widget-lib";
import {
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsDescriptionClass,
  settingsHeaderClass,
  settingsLabelClass,
  settingsPageClass,
  settingsPrimaryButtonClass,
  settingsTitleClass,
} from "./settings-styles";

const EXAMPLE_REPO_URL = "https://github.com/aomi-labs/aomi-app-example";

type DryRun = {
  slug: string;
  releaseTag: string;
  appPath: string;
  targetRepo: string;
  files: { path: string; bytes: number }[];
  manifest: Record<string, unknown>;
};

type DeployResult = {
  releaseTag: string;
  sourceCommit: string;
  publishCommitSha: string;
  appPath: string;
  ciUrl: string;
};

type Status = {
  ci: "pending" | "running" | "success" | "failure" | "unknown";
  release: "absent" | "building" | "ready";
  releaseTag: string | null;
};

type Phase = "idle" | "deploying" | "building" | "activating" | "live" | "error";
type CheckState = "pending" | "running" | "done" | "failed";
type FailedStep = "push" | "ci" | "activate" | null;

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function DeploySettings() {
  const adapter = useAomiWalletKit();
  const actor = adapter.identity.address ?? undefined;

  const [appName, setAppName] = useState("");
  const slug = toSlug(appName);

  const [dryRun, setDryRun] = useState<DryRun | null>(null);
  const [dryRunning, setDryRunning] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<FailedStep>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [github, setGithub] = useState("");
  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const post = useCallback(async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `request failed (${res.status})`);
    return json;
  }, []);

  // ----- 1. Preview -----------------------------------------------------------
  const handleDryRun = useCallback(async () => {
    setDryRunning(true);
    setError(null);
    try {
      setDryRun(await post("/api/deploy/dry-run", { name: appName }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDryRunning(false);
    }
  }, [appName, post]);

  // ----- 3. Deploy ------------------------------------------------------------
  const activate = useCallback(
    async (result: DeployResult, appSlug: string) => {
      setPhase("activating");
      try {
        await post("/api/deploy/activate", {
          slug: appSlug,
          releaseTag: result.releaseTag,
          sourceCommit: result.sourceCommit,
          actor,
        });
        setPhase("live");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setFailedStep("activate");
        setPhase("error");
      }
    },
    [actor, post],
  );

  useEffect(() => {
    if (phase !== "building" || !deployResult || !dryRun) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s: Status = await (
          await fetch(`/api/deploy/status?slug=${encodeURIComponent(dryRun.slug)}`)
        ).json();
        if (cancelled) return;
        setStatus(s);
        if (s.release === "ready" && s.releaseTag === deployResult.releaseTag) {
          void activate(deployResult, dryRun.slug);
          return;
        }
        if (s.ci === "failure") {
          setError("CI build failed — check the workflow run.");
          setFailedStep("ci");
          setPhase("error");
          return;
        }
        pollRef.current = setTimeout(tick, 4000);
      } catch {
        if (!cancelled) pollRef.current = setTimeout(tick, 6000);
      }
    };
    pollRef.current = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [phase, deployResult, dryRun, activate]);

  const handleDeploy = useCallback(async () => {
    setError(null);
    setStatus(null);
    setFailedStep(null);
    setDeployResult(null);
    setPhase("deploying");
    try {
      const plan = dryRun ?? (await post("/api/deploy/dry-run", { name: appName }));
      if (!dryRun) setDryRun(plan);
      const result: DeployResult = await post("/api/deploy", { name: appName, actor });
      setDeployResult(result);
      setPhase("building");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFailedStep("push");
      setPhase("error");
    }
  }, [dryRun, appName, actor, post]);

  // ----- 2. Publish your own app ---------------------------------------------
  const handleRequest = useCallback(async () => {
    setRequesting(true);
    setRequestStatus(null);
    try {
      await post("/api/deploy/request-activation", { githubAccount: github, email });
      setRequestStatus({
        ok: true,
        msg: `Request sent. Ops will invite ${github} to the platform repo and email your activation code to ${email}.`,
      });
      setGithub("");
      setEmail("");
    } catch (e) {
      setRequestStatus({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setRequesting(false);
    }
  }, [github, email, post]);

  const deploying = phase === "deploying" || phase === "building" || phase === "activating";
  const nameValid = slug.length > 0;

  return (
    <div className={settingsPageClass}>
      <header className={settingsHeaderClass}>
        <h1 className={settingsTitleClass}>Deploy</h1>
        <p className={settingsDescriptionClass}>
          Spin up your own app from the starter at{" "}
          <a href={EXAMPLE_REPO_URL} target="_blank" rel="noreferrer" className="underline">
            github.com/aomi-labs/aomi-app-example
          </a>
          . Name it, and we publish, build, and activate it for you — no code, no CLI, no tokens.
        </p>
      </header>

      {/* 1. Preview */}
      <section className={settingsCardStackClass}>
        <h2 className={settingsCardTitleClass}>Preview</h2>
        <p className={settingsBodyTextClass}>
          Name your app, then see exactly what would be published before anything is pushed.
        </p>
        <div className="max-w-md">
          <label className={settingsLabelClass}>App name</label>
          <Input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="alice-app-123"
            disabled={deploying || phase === "live"}
          />
          {appName.trim() && (
            <p className="text-muted-foreground mt-1 pl-1 text-xs">
              deploys as <code className="text-foreground">{slug || "—"}</code>
            </p>
          )}
        </div>
        <div>
          <Button
            onClick={handleDryRun}
            disabled={dryRunning || !nameValid}
            className={settingsPrimaryButtonClass}
          >
            {dryRunning ? "Running…" : "Dry run"}
          </Button>
        </div>
        {dryRun && (
          <div className="space-y-2">
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 pl-2 text-sm">
              <span>
                app <code className="text-foreground">{dryRun.slug}</code>
              </span>
              <span>
                release <code className="text-foreground">{dryRun.releaseTag}</code>
              </span>
              <span>
                {dryRun.files.length} file{dryRun.files.length === 1 ? "" : "s"} →{" "}
                <code className="text-foreground">{dryRun.appPath}/</code>
              </span>
            </div>
            <details open className="bg-muted/40 rounded-2xl p-4">
              <summary className="text-foreground cursor-pointer text-sm font-medium">
                .aomi/deployment.json
              </summary>
              <pre className="text-muted-foreground mt-3 overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(dryRun.manifest, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </section>

      {/* 2. Publish your own app */}
      <section className={settingsCardStackClass}>
        <h2 className={settingsCardTitleClass}>Publish your own app</h2>
        <p className={settingsBodyTextClass}>
          Ready to ship a real app from your own machine? Request contributor access and ops will
          invite your GitHub account and email you a per-app activation code.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={settingsLabelClass}>Your GitHub</label>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="your-github-user" />
          </div>
          <div>
            <label className={settingsLabelClass}>Your email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <Button
            onClick={handleRequest}
            disabled={requesting || !github.trim() || !email.trim()}
            className={settingsPrimaryButtonClass}
          >
            {requesting ? "Sending…" : "Request activation"}
          </Button>
        </div>
        {requestStatus && (
          <div
            className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${
              requestStatus.ok ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"
            }`}
          >
            {requestStatus.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{requestStatus.msg}</span>
          </div>
        )}
      </section>

      {/* 3. Deploy — GitHub-checks-style status panel */}
      <section className={settingsCardStackClass}>
        <h2 className={settingsCardTitleClass}>Deploy</h2>
        <p className={settingsBodyTextClass}>
          Publishes <code className="text-foreground">{slug || "your app"}</code>, waits for CI to
          build the release, then activates it automatically.
        </p>
        <div>
          <Button onClick={handleDeploy} disabled={deploying || !nameValid} className={settingsPrimaryButtonClass}>
            {phase === "idle" || phase === "error" ? "Deploy" : "Deploying…"}
          </Button>
        </div>

        {phase !== "idle" && (
          <DeployChecks
            phase={phase}
            status={status}
            deployResult={deployResult}
            error={error}
            failedStep={failedStep}
          />
        )}

        {phase === "live" && (
          <NextSteps slug={dryRun?.slug ?? slug} ciUrl={deployResult?.ciUrl} />
        )}
      </section>
    </div>
  );
}

// =============================================================================
// "Now customize it" — clone → edit → re-deploy with aomi-git
// =============================================================================

function NextSteps({ slug, ciUrl }: { slug: string; ciUrl?: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-sm">
      <div className="text-foreground font-medium">
        🎉 <code>{slug}</code> is live on staging.{" "}
        {ciUrl && (
          <a href={ciUrl} target="_blank" rel="noreferrer" className="underline">
            View build
          </a>
        )}
      </div>
      <div className="text-muted-foreground">Make it yours — clone the starter, edit, redeploy:</div>
      <pre className="bg-background/60 overflow-x-auto rounded-xl p-3 text-xs leading-relaxed">
        {`# 1. clone the starter
git clone ${EXAMPLE_REPO_URL}.git ${slug}
cd ${slug}/app

# 2. set the app name + make your changes
#    aomi.toml:  name = "${slug}"
$EDITOR src/lib.rs

# 3. request access once (GitHub + email above), then deploy from your machine
aomi-git deploy
aomi-git activate`}
      </pre>
    </div>
  );
}

// =============================================================================
// GitHub-checks-style deploy status panel
// =============================================================================

function DeployChecks({
  phase,
  status,
  deployResult,
  error,
  failedStep,
}: {
  phase: Phase;
  status: Status | null;
  deployResult: DeployResult | null;
  error: string | null;
  failedStep: FailedStep;
}) {
  const reachedActivate = phase === "activating" || phase === "live" || failedStep === "activate";
  const pushDone = !!deployResult || phase === "building" || reachedActivate;
  const ciDone = reachedActivate;

  const pushState: CheckState =
    failedStep === "push" ? "failed" : pushDone ? "done" : phase === "deploying" ? "running" : "pending";
  const ciState: CheckState =
    failedStep === "ci" ? "failed" : ciDone ? "done" : phase === "building" ? "running" : "pending";
  const activateState: CheckState =
    failedStep === "activate"
      ? "failed"
      : phase === "live"
        ? "done"
        : phase === "activating"
          ? "running"
          : "pending";
  const liveState: CheckState = phase === "live" ? "done" : "pending";

  const rows = [
    {
      title: "Push to publish",
      desc: deployResult ? `Committed ${deployResult.appPath}/ → publish` : "Commit the app to the publish branch",
      state: pushState,
    },
    {
      title: "CI / Build & release",
      desc:
        ciState === "running"
          ? `Building${status?.ci ? ` · ${status.ci}` : "…"}`
          : ciState === "done"
            ? "Release published"
            : ciState === "failed"
              ? "Build failed"
              : "Waiting for CI",
      state: ciState,
      href: deployResult?.ciUrl,
    },
    {
      title: "Activate",
      desc:
        activateState === "running"
          ? "Activating on staging…"
          : activateState === "done"
            ? "Activated"
            : activateState === "failed"
              ? "Activation failed"
              : "Waiting for release",
      state: activateState,
    },
    { title: "Live on staging", desc: "App loaded and serving", state: liveState },
  ];

  const failed = phase === "error";
  const live = phase === "live";

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="bg-muted/40 flex items-center gap-3 border-b px-4 py-3">
        <StatusIcon state={live ? "done" : failed ? "failed" : "running"} large />
        <div>
          <div className="text-foreground text-sm font-semibold">
            {live ? "App is live on staging" : failed ? "Deploy blocked" : "Deploy in progress"}
          </div>
          <div className="text-muted-foreground text-xs">
            {live
              ? `Release ${deployResult?.releaseTag}`
              : failed
                ? (error ?? "A step failed")
                : "Publishing → building → activating"}
          </div>
        </div>
      </div>

      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center gap-3 px-4 py-3">
            <StatusIcon state={r.state} />
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium">
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer" className="hover:underline">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
              </div>
              <div className="text-muted-foreground truncate text-xs">{r.desc}</div>
            </div>
            <StateBadge state={r.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIcon({ state, large }: { state: CheckState; large?: boolean }) {
  const cls = large ? "h-5 w-5" : "h-4 w-4";
  if (state === "done") return <CheckCircle2 className={`${cls} shrink-0 text-green-500`} />;
  if (state === "failed") return <XCircle className={`${cls} shrink-0 text-red-500`} />;
  if (state === "running") return <Loader2 className={`${cls} shrink-0 animate-spin text-blue-500`} />;
  return <Circle className={`${cls} text-muted-foreground/40 shrink-0`} />;
}

function StateBadge({ state }: { state: CheckState }) {
  const map: Record<CheckState, { label: string; cls: string }> = {
    done: { label: "passed", cls: "text-green-600 border-green-500/40" },
    failed: { label: "failed", cls: "text-red-600 border-red-500/40" },
    running: { label: "in progress", cls: "text-blue-600 border-blue-500/40" },
    pending: { label: "queued", cls: "text-muted-foreground border-border" },
  };
  const { label, cls } = map[state];
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}
