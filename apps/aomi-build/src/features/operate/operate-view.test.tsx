import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OperateView, truncateAddress } from "./operate-view";

const operateFetch = vi.fn();
const searchParams = { current: new URLSearchParams("") };

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.current,
}));

vi.mock("@build/components/control-plane/github-session-context", () => ({
  useGitHubSession: () => ({
    account: { loading: false, signedIn: true, login: "gordian" },
  }),
}));

vi.mock("./client", () => ({
  operateFetch: (...args: unknown[]) => operateFetch(...args),
}));

describe("truncateAddress", () => {
  it("shortens long hex addresses and leaves short values alone", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
    expect(truncateAddress("0xabc")).toBe("0xabc");
    expect(truncateAddress("")).toBe("");
    expect(truncateAddress(null)).toBe("");
  });
});

describe("OperateView transactions", () => {
  beforeEach(() => {
    operateFetch.mockReset();
    searchParams.current = new URLSearchParams("");
  });

  it("renders denser columns from wire fields and truncates addresses", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      transactions: [
        {
          id: "1",
          application: "demo",
          status: "confirmed",
          chainId: 8453,
          fromAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          toAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          value: "1000000000000000000",
          description: "Swap USDC",
          txHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          createdAt: 1_700_000_000,
        },
      ],
      nextCursor: null,
    });

    render(<OperateView kind="transactions" />);

    await waitFor(() => {
      expect(screen.getByText("demo")).toBeInTheDocument();
    });

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("0xaaaa…aaaa")).toBeInTheDocument();
    expect(screen.getByText("0xbbbb…bbbb")).toBeInTheDocument();
    expect(screen.getByText("0xcccc…cccc")).toBeInTheDocument();
    expect(screen.getByText("1000000000000000000")).toBeInTheDocument();
    expect(screen.getByText("Swap USDC")).toBeInTheDocument();
  });

  it("shows a clearer empty state when there are no transactions", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      transactions: [],
      nextCursor: null,
    });

    render(<OperateView kind="transactions" />);

    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /open projects/i })).toHaveAttribute(
      "href",
      "/projects",
    );
  });

  it("renders 24h trend tiles and error split when the manager emits them", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      monitoring: { status: "ok", windowSeconds: 900 },
      apps: [
        {
          applicationId: 77,
          application: "goal-digger",
          status: "healthy",
          releaseTag: "apps-1-r0123abcdef-goal-digger-bbbbbbbbbbbb",
          sdkVersion: "3.0.2",
          metrics: {
            available: true,
            chats24h: 47,
            toolCalls24h: 130,
            transactions24h: 12,
            chatsHourly: [0, 3, 5],
            errorRate: 0.025,
            toolErrorRate: 0.12,
            txErrorRate: 0,
            p95LatencyMs: 1234,
            inflightRequests: 3,
            coldStartMs: 1250,
            dylibBytes: 4718592,
          },
        },
      ],
      dashboardLinks: [],
      platformMetrics: [],
    });

    render(<OperateView kind="observability" />);

    await waitFor(() => {
      expect(screen.getByText("goal-digger")).toBeInTheDocument();
    });

    // Counts lead; the requests/min tile is replaced by the trend row.
    expect(screen.getByText("Chats 24h")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("Tx 24h")).toBeInTheDocument();
    expect(screen.queryByText("Requests/min")).not.toBeInTheDocument();
    // Three failure domains, separately.
    expect(screen.getByText("Chat errors")).toBeInTheDocument();
    expect(screen.getByText("2.5%")).toBeInTheDocument();
    expect(screen.getByText("Tool errors")).toBeInTheDocument();
    expect(screen.getByText("12.0%")).toBeInTheDocument();
    expect(screen.getByText("Tx failures")).toBeInTheDocument();
    // Lifecycle footer.
    expect(screen.getByText(/SDK 3\.0\.2 · cold start 1250 ms · 4\.5 MB/)).toBeInTheDocument();
  });

  it("falls back to the legacy live tiles when trend data is absent", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      monitoring: { status: "ok", windowSeconds: 300 },
      apps: [
        {
          applicationId: 78,
          application: "playground-example",
          status: "healthy",
          metrics: {
            available: true,
            requestsPerMinute: 42,
            errorRate: 0.025,
            p95LatencyMs: 1234,
            inflightRequests: 3,
          },
        },
      ],
      dashboardLinks: [],
      platformMetrics: [],
    });

    render(<OperateView kind="observability" />);

    await waitFor(() => {
      expect(screen.getByText("playground-example")).toBeInTheDocument();
    });
    expect(screen.getByText("Requests/min")).toBeInTheDocument();
    expect(screen.getByText("Error rate")).toBeInTheDocument();
    expect(screen.queryByText("Chats 24h")).not.toBeInTheDocument();
    expect(screen.queryByText("Tool errors")).not.toBeInTheDocument();
  });

  it("honors ?project= when loading operate data", async () => {
    searchParams.current = new URLSearchParams("project=42");
    operateFetch.mockResolvedValue({
      sources: [{ id: 42, repositoryLink: "a/b", apps: [] }],
      daily: [],
      breakdown: [],
    });

    render(<OperateView kind="usage" />);

    await waitFor(() => {
      expect(operateFetch).toHaveBeenCalledWith("usage", 42);
    });
  });
});
