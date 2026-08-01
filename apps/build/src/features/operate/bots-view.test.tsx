import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
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

  it("edit mode locks thread mode and can be cancelled", async () => {
    mockSession({ loading: false, signedIn: true, githubLogin: "octocat" });
    mockedOperateFetch.mockResolvedValue({
      sources: [
        {
          id: 1,
          repositoryLink: "ceciliaz030/local-8",
          apps: [{ id: 11, name: "playground-example" }],
        },
      ],
      bots: [
        {
          id: "b1",
          platform: "telegram",
          status: "active",
          label: null,
          defaultApp: "playground-example",
          platformUsername: "chico_chico_bot",
          webhookUrl: "https://x",
          threadMode: "single",
          createdAt: 1,
          apps: [
            {
              applicationId: 11,
              appSourceId: 1,
              sourceLabel: "ceciliaz030/local-8",
              name: "playground-example",
              label: "playground-example",
              isPrimary: true,
            },
          ],
        },
      ],
    });
    render(<BotsView />);

    fireEvent.click(await screen.findByRole("button", { name: /edit apps/i }));
    expect(
      screen.getByText(/editing apps for @chico_chico_bot/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/thread mode/i)).toBeDisabled();
    expect(
      screen.getByText(/thread mode can't be changed after registration/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save apps/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.getByRole("button", { name: /register bot/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/editing apps for @chico_chico_bot/i),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/thread mode/i)).toBeEnabled();
  });

  it("blocks saving while unavailable apps stay selected", async () => {
    mockSession({ loading: false, signedIn: true, githubLogin: "octocat" });
    mockedOperateFetch.mockResolvedValue({
      sources: [
        {
          id: 1,
          repositoryLink: "ceciliaz030/local-8",
          apps: [{ id: 11, name: "playground-example" }],
        },
      ],
      bots: [
        {
          id: "b1",
          platform: "telegram",
          status: "active",
          label: null,
          defaultApp: "playground-example",
          platformUsername: "chico_chico_bot",
          webhookUrl: "https://x",
          threadMode: "single",
          createdAt: 1,
          apps: [
            {
              applicationId: 11,
              appSourceId: 1,
              sourceLabel: "ceciliaz030/local-8",
              name: "playground-example",
              label: "playground-example",
              isPrimary: true,
            },
            {
              applicationId: 99,
              appSourceId: null,
              sourceLabel: "ceciliaz030/retired",
              name: "gone-app",
              label: "gone-app",
              isPrimary: false,
            },
          ],
        },
      ],
    });
    render(<BotsView />);

    fireEvent.click(await screen.findByRole("button", { name: /edit apps/i }));
    expect(screen.getByText("No longer available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save apps/i })).toBeDisabled();
    expect(
      screen.getByText(/uncheck the apps that are no longer available/i),
    ).toBeInTheDocument();

    const ghostRow = screen.getByRole("checkbox", { name: /gone-app/i });
    expect(ghostRow).toBeEnabled();
    fireEvent.click(ghostRow);
    expect(ghostRow).toBeDisabled();
    expect(screen.getByRole("button", { name: /save apps/i })).toBeEnabled();
    expect(
      screen.queryByText(/uncheck the apps that are no longer available/i),
    ).not.toBeInTheDocument();
  });
});
