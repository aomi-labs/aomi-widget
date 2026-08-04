"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock, Github } from "lucide-react";
import { githubAppInstallUrl } from "@build/features/launch/client";
import { normalizeRepo } from "@build/features/launch/state";
import type { RepositoryConnectionResult } from "@aomi-labs/deploy/launch";

export type { RepositoryConnectionResult };

export function RepositoryConnector({
  platform,
  result,
  navigate = (url) => window.location.assign(url),
}: {
  platform: string;
  result?: RepositoryConnectionResult;
  navigate?: (url: string) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const repo = normalizeRepo(input);
    if (!repo) {
      setError("Enter a GitHub repository as owner/name.");
      return;
    }

    setError(null);
    setConnecting(true);
    try {
      const returnTo = `${window.location.origin}/projects?platform=${encodeURIComponent(platform)}`;
      navigate(await githubAppInstallUrl({ platform, repo, returnTo }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start GitHub authorization.",
      );
    } finally {
      // A real `navigate` leaves the page, but it is injectable and the button
      // should not be able to strand itself on "Connecting…".
      setConnecting(false);
    }
  }

  return (
    <section aria-labelledby="connect-repository-title" className="space-y-3">
      <div>
        <h2 id="connect-repository-title" className="text-sm font-medium">
          Connect an existing repository
        </h2>
        <p className="text-dim mt-1 text-sm">
          Enter the GitHub repository your partner gave you. It will only be
          added to <span className="text-foreground">{platform}</span> after
          GitHub confirms your access.
        </p>
      </div>

      {result?.status === "success" && (
        <div
          role="status"
          className="border-border bg-surface-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
          <span>
            {result.repo ?? "Repository"} is now connected to {platform}.
          </span>
        </div>
      )}
      {result?.status === "pending" && (
        <div
          role="status"
          className="border-border bg-surface-1 text-dim flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Clock className="size-4 shrink-0" aria-hidden />
          <span>{result.message}</span>
        </div>
      )}
      {result?.status === "error" && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>{result.message}</span>
        </div>
      )}

      <form onSubmit={connect} className="flex max-w-2xl gap-2">
        <div className="relative min-w-0 flex-1">
          <Github
            className="text-dim pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            aria-label="GitHub repository"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="owner/repository"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="border-border bg-background placeholder:text-dim focus:border-muted h-9 w-full rounded-md border pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={connecting || !input.trim()}
          className="bg-primary text-primary-foreground inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
