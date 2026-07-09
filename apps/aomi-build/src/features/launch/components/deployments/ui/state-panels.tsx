import type { ReactNode } from "react";
import { Github } from "lucide-react";
import { GITHUB_SIGNIN_URL } from "@build/features/launch/dashboard";

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-4 py-10 text-center text-sm text-zinc-500">
      {label}
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-4 py-10 text-center text-sm text-red-600">
      {message}
    </div>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-4 py-10 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function GitHubSignInPanel({ error }: { error?: string | null }) {
  const errorMessage =
    error === "service_auth_forbidden"
      ? "The backend rejected the Aomi Build service bearer. Use a local backend with the dev service key, or set PORTAL_SERVICE_PRIVATE_KEY to the matching staging or production BFF key for the backend you are targeting."
      : error === "exchange_failed"
        ? "GitHub sign-in reached the backend, but the OAuth exchange failed. Check the backend GitHub App OAuth settings and callback URL."
        : error === "invalid_oauth_state"
          ? "GitHub sign-in state expired. Start the sign-in flow again."
          : error === "identity_unresolved"
            ? "GitHub sign-in completed, but the backend could not resolve your GitHub identity."
            : null;

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border border-zinc-200">
        <Github className="size-5" aria-hidden />
      </div>
      <div>
        <div className="text-base font-semibold">Sign in with GitHub</div>
        <div className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
          Deployment history is scoped to repositories connected to your GitHub
          account.
        </div>
      </div>
      {errorMessage && (
        <div className="max-w-xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm leading-6 text-amber-900">
          {errorMessage}
        </div>
      )}
      <a
        href={GITHUB_SIGNIN_URL}
        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Continue with GitHub
      </a>
    </div>
  );
}
