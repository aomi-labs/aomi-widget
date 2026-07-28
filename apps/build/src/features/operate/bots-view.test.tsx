import { afterEach, describe, expect, it, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

import type { GitHubAccountState } from "@build/components/control-plane/github-session-context";

let sessionAccount: GitHubAccountState = {
  loading: true,
  signedIn: false,
  githubLogin: null,
  githubAvatarUrl: null,
  installationId: null,
};

vi.mock("@build/components/control-plane/github-session-context", () => ({
  useGitHubSession: () => ({
    account: sessionAccount,
    setAccount: vi.fn(),
  }),
}));

vi.mock("./client", () => ({
  operateFetch: vi.fn(),
}));

import { operateFetch } from "./client";
import { BotsView } from "./bots-view";

const mockedOperateFetch = vi.mocked(operateFetch);

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function mockSession(partial: {
  loading: boolean;
  signedIn: boolean;
  githubLogin?: string | null;
}) {
  sessionAccount = {
    loading: partial.loading,
    signedIn: partial.signedIn,
    githubLogin: partial.githubLogin ?? null,
    githubAvatarUrl: null,
    installationId: null,
  };
}

afterEach(() => {
  mockedOperateFetch.mockReset();
});

describe("BotsView", () => {
  it("shows the sign-in panel when not signed in with GitHub", () => {
    mockSession({ loading: false, signedIn: false });
    render(<BotsView />);
    // GitHubSignInPanel (reused verbatim from state-panels.tsx) renders its
    // CTA as a link ("Continue with GitHub"), not a button — see self-review
    // note in the completion report for why this deviates from the brief's
    // literal `getByRole("button", { name: /sign in with github/i })`.
    expect(
      screen.getByRole("link", { name: /continue with github/i }),
    ).toBeInTheDocument();
    expect(mockedOperateFetch).not.toHaveBeenCalled();
  });

  it("renders registered bots", async () => {
    mockSession({ loading: false, signedIn: true, githubLogin: "octocat" });
    mockedOperateFetch.mockResolvedValue({
      sources: [],
      bots: [
        {
          id: "b1",
          platform: "telegram",
          status: "active",
          label: "Trading assistant",
          defaultApp: "binance",
          platformUsername: "mybot",
          webhookUrl: "https://x",
          threadMode: "single",
          createdAt: 1,
        },
      ],
    });
    render(<BotsView />);
    expect(await screen.findByText("Trading assistant")).toBeInTheDocument();
    expect(screen.getByText("@mybot")).toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument();
  });

  it("requires an app and a token before registering", async () => {
    mockSession({ loading: false, signedIn: true, githubLogin: "octocat" });
    mockedOperateFetch.mockResolvedValue({ sources: [], bots: [] });
    render(<BotsView />);
    expect(
      await screen.findByRole("button", { name: /register bot/i }),
    ).toBeDisabled();
  });
});
