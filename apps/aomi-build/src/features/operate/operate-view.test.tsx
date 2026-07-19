import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      expect(screen.getAllByText("demo").length).toBeGreaterThan(0);
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

  it("expands a tx row into the receipt detail with SVM vocabulary", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      transactions: [
        {
          id: "tx-svm",
          application: "goal-digger",
          status: "failed",
          family: "svm",
          chainName: "Solana",
          chainId: 0,
          fromAddress: "7fUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovLS7",
          toAddress: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
          toLabel: "Raydium AMM v4",
          value: "4.0 SOL",
          description: "Swap 4 SOL to BONK",
          txHash: "4kNwPz2eXcRv9qLtB1sJdYgFmA7oHiU3TnKehM6ybWaGr8CQ",
          slot: "289,432,881",
          txFee: "0.000012 SOL",
          computeUnits: "41,022",
          computeLimit: "200,000",
          revertReason: "custom program error 0x1771 — SlippageToleranceExceeded",
          createdAt: 1_700_000_000,
        },
      ],
      nextCursor: null,
    });

    render(<OperateView kind="transactions" />);
    await waitFor(() => {
      expect(screen.getByText("Solana")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Swap 4 SOL to BONK"));
    expect(screen.getByText("Signature")).toBeInTheDocument();
    expect(screen.getByText("Slot")).toBeInTheDocument();
    expect(screen.getByText("Program")).toBeInTheDocument();
    expect(screen.getByText(/SlippageToleranceExceeded/)).toBeInTheDocument();
    expect(screen.getByText(/41,022 CU of 200,000/)).toBeInTheDocument();
    // Privacy ruling: intents never render.
    expect(screen.getByText("hidden · user privacy")).toBeInTheDocument();
  });

  it("renders invocation log records dense and expands args/result", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      logs: [
        {
          id: "log-1",
          occurredAt: 1_700_000_000,
          eventType: "tool_invocation",
          application: "goal-digger",
          summary: "SOL → USDC 2.5 · out 412.34",
          kind: "invocation",
          status: "ok",
          tool: "swap_quote",
          durationMs: 1840,
          threadId: "thread_af92c1",
          args: '{ "token_in": "SOL" }',
          result: '{ "amount_out": "412.34" }',
        },
        {
          id: "log-2",
          occurredAt: 1_699_990_000,
          eventType: "deployment",
          application: "goal-digger",
          summary: "Activated release r1dac12ad71",
        },
      ],
      nextCursor: null,
    });

    render(<OperateView kind="logs" />);
    await waitFor(() => {
      // Appears in both the tool filter and the record line.
      expect(screen.getAllByText("swap_quote").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("1840ms")).toBeInTheDocument();
    expect(screen.getByText("Activated release r1dac12ad71")).toBeInTheDocument();
    // Expand the invocation record.
    fireEvent.click(screen.getByText("SOL → USDC 2.5 · out 412.34"));
    expect(screen.getByText(/token_in/)).toBeInTheDocument();
    expect(screen.getByText(/amount_out/)).toBeInTheDocument();
  });

  it("renders the statement when present, meter otherwise", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      daily: [],
      breakdown: [],
      // BFF filled the statement from example fixtures (BE not live yet).
      example: true,
      // BE statement vocabulary: subjects, entries, raw USD floats.
      statement: {
        range: { fromDate: "2026-07-01", toDate: "2026-07-15" },
        summary: {
          grossRevenue: 183.25,
          platformFees: 28.33,
          serviceCharges: 41.9,
          net: 113.02,
        },
        revenue: [
          {
            subject: "tool_invocation",
            application: "goal-digger",
            applicationId: 77,
            events: 128,
            gross: 128.0,
            platformFee: 12.8,
            net: 115.2,
          },
        ],
        charges: [
          {
            item: "hosting",
            application: "goal-digger",
            applicationId: 77,
            events: 1,
            amount: 10.0,
          },
        ],
        entries: [
          {
            day: "2026-07-15",
            application: "goal-digger",
            subject: "model",
            events: 68,
            gross: 4.1,
            platformFee: 0.37,
            net: -4.1,
          },
        ],
      },
    });

    render(<OperateView kind="usage" />);
    await waitFor(() => {
      expect(screen.getByText("Gross revenue")).toBeInTheDocument();
    });
    // Floats format at render time; the period comes from the range.
    expect(screen.getByText("+$113.02")).toBeInTheDocument();
    expect(screen.getByText("Tool invocations")).toBeInTheDocument();
    expect(screen.getByText("$115.20")).toBeInTheDocument();
    expect(screen.getByText("App hosting")).toBeInTheDocument();
    expect(screen.getByText("Model usage")).toBeInTheDocument();
    expect(screen.getByText("−$4.10")).toBeInTheDocument();
    expect(screen.getAllByText("Jul 1 – Jul 15").length).toBeGreaterThan(0);
    // example: true → the header labels the page as example data.
    expect(screen.getByText("Example data")).toBeInTheDocument();
  });

  it("falls back to the token meter without a statement", async () => {
    operateFetch.mockResolvedValue({
      sources: [],
      daily: [
        { periodUtcDay: "2026-07-15", application: "demo", inputTokens: 412000, outputTokens: 58400, creditsUsed: 3.4182 },
      ],
      breakdown: [],
      statement: null,
    });

    render(<OperateView kind="usage" />);
    await waitFor(() => {
      expect(screen.getByText("412,000")).toBeInTheDocument();
    });
    expect(screen.queryByText("Gross revenue")).not.toBeInTheDocument();
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
