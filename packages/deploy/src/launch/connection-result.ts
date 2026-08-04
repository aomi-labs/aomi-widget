/**
 * How a GitHub OAuth callback lands back on the scoped Projects page.
 *
 * The backend redirects with `launch=<OnboardStatus>` on success and
 * `github_error=<message>` on failure; this turns those query parameters into
 * something the connector can render.
 */
export type RepositoryConnectionResult =
  | { status: "success"; repo?: string }
  | { status: "pending"; message: string }
  | { status: "error"; message: string };

/**
 * The backend's `OnboardStatus` values other than `bound`. Two of them are
 * progress rather than failure — collapsing all of them into "installation was
 * not completed" told an organization member waiting on an owner's approval
 * that something had gone wrong.
 */
const LAUNCH_RESULTS: Record<string, RepositoryConnectionResult> = {
  awaiting_install: {
    status: "pending",
    message:
      "Install requested. A GitHub organization owner has to approve Aomi Build before this repository can connect.",
  },
  awaiting_webhook: {
    status: "pending",
    message:
      "GitHub authorized the install. Finishing the connection — refresh in a moment.",
  },
  personal_required: {
    status: "error",
    message:
      "That installation belongs to an organization. Creating a new repository needs Aomi Build installed on your personal GitHub account.",
  },
};

/**
 * Frame a backend error as quoted detail. We author these messages, but
 * `github_error` is only a URL parameter — anyone can send a user a link
 * carrying arbitrary text — so it is capped and stripped of characters that
 * would let it read as Build's own UI rather than as a reported message.
 */
function connectionError(raw: string): string {
  const detail = raw
    .replace(/[^\p{L}\p{N} .,:;'`@/_-]/gu, " ")
    .trim()
    .slice(0, 200);
  return detail
    ? `Could not connect the repository: ${detail}`
    : "Could not connect the repository. Try connecting again.";
}

export function connectionResult(params: {
  launch?: string;
  repo?: string;
  githubError?: string;
}): RepositoryConnectionResult | undefined {
  if (params.githubError) {
    return { status: "error", message: connectionError(params.githubError) };
  }
  if (params.launch === "bound") return { status: "success", repo: params.repo };
  return params.launch ? LAUNCH_RESULTS[params.launch] : undefined;
}
