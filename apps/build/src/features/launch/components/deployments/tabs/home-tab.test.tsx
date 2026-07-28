import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const loadSecrets = vi.fn();
const operateFetch = vi.fn();

vi.mock("@aomi-labs/deploy/lifecycle", () => ({
  deploymentLifecycleFromSource: () => ({
    kind: "empty",
    repo: "a/b",
    statusLabel: "No deployment",
    statusTone: "muted",
    message: "No deployment recorded yet.",
    appNames: [],
    releaseTags: [],
  }),
}));

vi.mock("@build/features/operate/client", () => ({
  operateFetch: (...args: unknown[]) => operateFetch(...args),
}));

vi.mock("@build/features/launch/hooks/use-project-detail", () => ({
  useProjectDetail: () => detail,
}));

const detail = {
  source: {
    id: 1,
    repositoryLink: "a/b",
    apps: [],
    latestDeployment: null,
    installationId: 5,
  },
  loading: false,
  error: null,
  secretsByApp: {},
  secretsError: null,
  loadSecrets,
} as unknown as ReturnType<
  typeof import("@build/features/launch/hooks/use-project-detail").useProjectDetail
>;

import { HomeTab } from "./home-tab";

describe("HomeTab", () => {
  beforeEach(() => {
    loadSecrets.mockClear();
    operateFetch.mockReset();
    operateFetch.mockResolvedValue({ daily: [] });
    (detail.source as { apps: unknown[] }).apps = [];
  });

  it("shows status cards and a deploy next action when not live", async () => {
    render(
      <HomeTab detail={detail} tabHref={(tab) => `/projects/1?tab=${tab}`} />,
    );

    expect(loadSecrets).toHaveBeenCalled();
    expect(screen.getByText("Project home")).toBeInTheDocument();
    expect(screen.getByText("Not live")).toBeInTheDocument();
    expect(screen.getByText("Keys missing")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", {
        name: /redeploy from linked repository/i,
      }),
    ).toHaveAttribute("href", "/projects/1?tab=deployments");
    expect(
      screen.getByRole("link", { name: /open environment/i }),
    ).toHaveAttribute("href", "/projects/1?tab=environment");
    expect(await screen.findByText("No traffic yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^open usage$/i })).toHaveAttribute(
      "href",
      "/operate/usage?project=1",
    );
    expect(screen.queryByText("Monetization")).not.toBeInTheDocument();
  });

  it("shows credits and tokens when usage has traffic", async () => {
    operateFetch.mockResolvedValue({
      daily: [
        {
          periodUtcDay: "2026-07-12",
          creditsUsed: 1.5,
          inputTokens: 1000,
          outputTokens: 250,
        },
      ],
    });
    render(
      <HomeTab detail={detail} tabHref={(tab) => `/projects/1?tab=${tab}`} />,
    );
    expect(await screen.findByText("1.50 credits")).toBeInTheDocument();
    expect(screen.getByText(/1\.3k tokens/i)).toBeInTheDocument();
  });

  it("shows configured monetization before the first paid call", async () => {
    (detail.source as { apps: unknown[] }).apps = [
      {
        name: "somm-agent",
        pricing: {
          config: {
            resources: {
              get_idle_assets: {
                pricing: { flat: 100 },
                beneficiary: "banana_evm",
              },
            },
            beneficiaries: [
              {
                name: "banana_evm",
                chain: "eip155:84532",
                value: "0x5D907BEa404e6F821d467314a9cA07663CF64c9B",
              },
            ],
          },
        },
      },
    ];

    render(
      <HomeTab detail={detail} tabHref={(tab) => `/projects/1?tab=${tab}`} />,
    );

    expect(screen.getByText("Monetization")).toBeInTheDocument();
    expect(screen.getByText("1 priced tool")).toBeInTheDocument();
    expect(
      screen.getByText(/100\.00 credits \(\$1\.00\) per successful call/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Base Sepolia/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View partner ledger" }),
    ).toHaveAttribute("href", "/operate/usage?project=1#partner-payments");
    expect(await screen.findByText("No traffic yet")).toBeInTheDocument();
  });
});
