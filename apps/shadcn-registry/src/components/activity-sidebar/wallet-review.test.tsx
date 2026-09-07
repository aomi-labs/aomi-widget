import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Action, Event } from "@aomi-labs/client";

const runtime = vi.hoisted(() => ({
  pendingActions: [] as Action[],
  actionAttempts: new Map(),
  events: [] as Event[],
  isRunning: false,
  turnState: undefined as string | undefined,
  executeAction: vi.fn(),
  rejectAction: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock("@aomi-labs/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aomi-labs/react")>()),
  useAomiRuntime: () => runtime,
}));

vi.mock("@/components/assistant-ui/markdown-text", async () => {
  const { useMessagePartText } = await vi.importActual<
    typeof import("@assistant-ui/react")
  >("@assistant-ui/react");
  return {
    MarkdownText: () => {
      const { text } = useMessagePartText();
      const parts = text.split("**");
      return (
        <span className="aui-md">
          {parts.map((part, index) =>
            index % 2 ? <strong key={index}>{part}</strong> : part,
          )}
        </span>
      );
    },
  };
});

vi.mock("../../lib/capabilities/skill-catalog", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../lib/capabilities/skill-catalog")
  >()),
  useSkillCatalog: () => ({
    skills: [{ id: "aave", name: "aave" }],
    loading: false,
    error: null,
  }),
}));

vi.mock("../../lib/wallet-kit", () => ({
  useAomiWalletKit: () => ({
    supportedChains: [
      {
        id: 1,
        name: "Ethereum",
        nativeCurrency: { symbol: "ETH" },
      },
      { id: 8453, name: "Base", nativeCurrency: { symbol: "ETH" } },
    ],
  }),
}));

import { ActivitySidebar } from "./activity-sidebar";
import { WalletReview } from "./wallet-review";

function action(request: Action["request"]): Action {
  return {
    type: "action",
    event_id: "event-1",
    sequence: 1,
    turn_id: "turn-1",
    occurred_at: 1,
    id: "action-1",
    revision: 1,
    state: "pending",
    request,
    result: null,
    created_at: 1,
    expires_at: null,
  };
}

function simulation(): Extract<
  Action["request"],
  { type: "execute_evm" }
>["simulation"] {
  return {
    status: "passed",
    balanceChanges: [],
    approvals: [],
    fees: [],
    gas: null,
    guards: [],
    logs: [],
    warnings: [],
  };
}

describe("WalletReview", () => {
  beforeEach(() => {
    runtime.isRunning = false;
    runtime.pendingActions = [];
    runtime.events = [];
    runtime.turnState = undefined;
    runtime.executeAction.mockReset().mockResolvedValue(undefined);
    runtime.rejectAction.mockReset().mockResolvedValue(undefined);
    runtime.showNotification.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  it("requires explicit approval before executing an EVM Action", async () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        simulation: simulation(),
        transactions: [
          {
            chain_id: 1,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x",
            label: "Transfer",
            kind: "transfer",
          },
        ],
      }),
    ];
    runtime.events = runtime.pendingActions;
    runtime.turnState = "awaiting_action";

    render(<WalletReview />);

    expect(runtime.executeAction).not.toHaveBeenCalled();
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "To 0x222222…222222",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send to wallet" }));
    await waitFor(() =>
      expect(runtime.executeAction).toHaveBeenCalledWith("action-1"),
    );
  });

  it("keeps wallet failures local instead of reporting user rejection", async () => {
    runtime.executeAction.mockRejectedValue(new Error("wallet unavailable"));
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        simulation: simulation(),
        transactions: [
          {
            chain_id: 1,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x",
            label: "Transfer",
            kind: "transfer",
          },
        ],
      }),
    ];

    render(<WalletReview />);

    fireEvent.click(screen.getByRole("button", { name: "Send to wallet" }));

    await waitFor(() =>
      expect(runtime.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: "wallet unavailable" }),
      ),
    );
    expect(runtime.rejectAction).not.toHaveBeenCalled();
  });

  it("requires explicit approval for attended signing Actions", async () => {
    runtime.pendingActions = [
      action({
        type: "sign",
        requestId: "sign-1",
        chainFamily: "evm",
        executionKind: "erc4337",
        signer: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        description: "Authorize account execution",
        payloads: [{ kind: "evm_personal", message: "0x01" }],
      }),
    ];

    render(<WalletReview />);
    expect(runtime.executeAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Send to wallet" }));

    await waitFor(() =>
      expect(runtime.executeAction).toHaveBeenCalledWith("action-1"),
    );
  });

  it("renders the canonical simulation nested in an Action request", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 1,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x",
            label: "Transfer",
            kind: "transfer",
          },
        ],
        simulation: {
          status: "passed",
          balanceChanges: [
            {
              account: "0x1111111111111111111111111111111111111111",
              asset: "native",
              amount: "1",
              direction: "out",
              symbol: "ETH",
              standard: "native",
            },
          ],
          approvals: [],
          fees: [],
          gas: { units: "21000", priceWei: null, nativeCost: null },
          logs: [],
          warnings: [],
          guards: [],
        },
      }),
    ];

    render(<WalletReview />);

    expect(screen.queryByTestId("action-simulation")).not.toBeInTheDocument();
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "Estimated gas · 21,000 units",
    );
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "−0.000000000000000001 ETH",
    );
    expect(
      screen
        .getByTestId("asset-effect")
        .querySelector('[data-asset-icon="eth"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Simulated wallet impact" }),
    ).not.toHaveClass("sm:grid-cols-2");
  });

  it("pairs token names and tickers with exact decimal display amounts", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x01",
            label: "Withdraw USDC",
            kind: "withdraw",
          },
        ],
        simulation: {
          ...simulation(),
          balanceChanges: [
            {
              account: "0x1111111111111111111111111111111111111111",
              asset: "0x3333333333333333333333333333333333333333",
              amount: "100000",
              direction: "out",
              standard: "erc20",
              name: "Aave Base USDC",
              symbol: "aBasUSDC",
              decimals: 6,
              chainId: 8453,
            },
            {
              account: "0x1111111111111111111111111111111111111111",
              asset: "0x4444444444444444444444444444444444444444",
              amount: "100000",
              direction: "in",
              standard: "erc20",
              name: "USD Coin",
              symbol: "USDC",
              decimals: 6,
              chainId: 8453,
            },
          ],
        },
      }),
    ];

    render(<WalletReview />);

    expect(screen.getByLabelText("−0.1 aBasUSDC")).toBeInTheDocument();
    expect(screen.getByLabelText("+0.1 USDC")).toBeInTheDocument();
    const effects = screen.getAllByTestId("asset-effect");
    expect(effects[0]).toHaveTextContent("Aave Base USDC");
    expect(effects[1]).toHaveTextContent("USD Coin");
    expect(
      effects.every((effect) =>
        Boolean(effect.querySelector('[data-asset-icon="coin"]')),
      ),
    ).toBe(true);
  });

  it("shows the full batch with readable expandable transaction details", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        simulation: simulation(),
        transactions: [
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x01",
            label: "Approve USDC",
            kind: "approval",
            protocol: "LI.FI",
          },
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x3333333333333333333333333333333333333333",
            data: "0x02",
            label: "Swap USDC to ETH",
            kind: "swap",
            protocol: "LI.FI",
          },
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x4444444444444444444444444444444444444444",
            data: "0x03",
            label: "Send ETH",
            kind: "transfer",
          },
        ],
      }),
    ];

    render(<WalletReview />);

    expect(screen.getAllByText("Approve USDC")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Swap USDC to ETH")[0]).toBeInTheDocument();
    const rows = screen.getAllByTestId("transaction-step");
    expect(rows).toHaveLength(3);
    expect(rows[0]?.querySelector(".lucide-pencil-line")).toBeTruthy();
    expect(rows[1]?.querySelector(".lucide-arrow-right-left")).toBeTruthy();
    expect(rows[2]).toHaveTextContent("Send ETH");
    expect(rows[2]).toHaveTextContent("3 of 3");
  });

  it("turns protocol-generated swap labels into readable review steps", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        simulation: simulation(),
        transactions: [
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x01",
            label:
              "Approve LI.FI swap spender for exact 0.00758 USDC using quote lifi_q_abc123",
            kind: "erc20_approve",
            protocol: "lifi",
          },
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x3333333333333333333333333333333333333333",
            data: "0x02",
            label:
              "LI.FI same-chain swap quote lifi_q_abc123: 0.00758 USDC to ETH on chain 8453",
            kind: "lifi_swap",
            protocol: "lifi",
          },
        ],
      }),
    ];

    render(<WalletReview />);

    expect(screen.getAllByText("Approve 0.00758 USDC")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/LI\.FI/).length).toBeGreaterThan(0);
    expect(screen.getByText("Wallet changes unavailable")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("transaction-step")[0].querySelector("summary"),
    ).not.toHaveTextContent("lifi_q_abc123");
    expect(
      screen.getAllByText("Swap 0.00758 USDC to ETH")[0],
    ).toBeInTheDocument();
  });

  it("shows exact, unlimited, and revoked token permissions explicitly", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x01",
            label: "Update token permissions",
            kind: "approval",
          },
        ],
        simulation: {
          ...simulation(),
          approvals: [
            {
              account: "0x1111111111111111111111111111111111111111",
              spender: "0x2222222222222222222222222222222222222222",
              asset: "0x3333333333333333333333333333333333333333",
              kind: "allowance",
              amount: "7500",
              approved: true,
              unlimited: false,
              standard: "erc20",
              symbol: "USDC",
              decimals: 6,
              chainId: 8453,
            },
            {
              account: "0x1111111111111111111111111111111111111111",
              spender: "0x2222222222222222222222222222222222222222",
              asset: "0x4444444444444444444444444444444444444444",
              kind: "allowance",
              amount: "1000000000000000000000000000000000000000",
              approved: true,
              unlimited: true,
              standard: "erc20",
              symbol: "WETH",
              decimals: 18,
              chainId: 8453,
            },
            {
              account: "0x1111111111111111111111111111111111111111",
              spender: "0x2222222222222222222222222222222222222222",
              asset: "0x5555555555555555555555555555555555555555",
              kind: "allowance",
              amount: "0",
              approved: false,
              unlimited: false,
              standard: "erc20",
              symbol: "DAI",
              decimals: 18,
              chainId: 8453,
            },
          ],
        },
      }),
    ];

    render(<WalletReview />);

    expect(screen.getByText("Allow 0.0075 USDC")).toBeInTheDocument();
    expect(screen.getByText("Unlimited WETH spending")).toBeInTheDocument();
    expect(screen.getAllByTestId("approval-effect")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Next wallet impact page" }),
    );
    expect(screen.getByText("Revoke DAI spending")).toBeInTheDocument();
    expect(screen.getAllByTestId("approval-effect")).toHaveLength(1);
  });

  it("describes NFT minting and collection-wide access", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 8453,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x01",
            label: "Mint collectible",
            kind: "mint",
          },
        ],
        simulation: {
          ...simulation(),
          balanceChanges: [
            {
              account: "0x1111111111111111111111111111111111111111",
              asset: "0x2222222222222222222222222222222222222222",
              amount: "1",
              direction: "in",
              standard: "erc721",
              name: "Aomi Founders",
              tokenId: "42",
              counterparty: "0x0000000000000000000000000000000000000000",
              chainId: 8453,
            },
            {
              account: "0x1111111111111111111111111111111111111111",
              asset: "0x3333333333333333333333333333333333333333",
              amount: "3",
              direction: "in",
              standard: "erc1155",
              name: "Aomi Pass",
              tokenId: "7",
              counterparty: "0x0000000000000000000000000000000000000000",
              chainId: 8453,
            },
          ],
          approvals: [
            {
              account: "0x1111111111111111111111111111111111111111",
              spender: "0x4444444444444444444444444444444444444444",
              asset: "0x3333333333333333333333333333333333333333",
              kind: "operator",
              approved: true,
              standard: "erc1155",
              name: "Aomi Pass",
              chainId: 8453,
            },
          ],
        },
      }),
    ];

    render(<WalletReview />);

    expect(screen.getByText("NFT minted")).toBeInTheDocument();
    expect(screen.getByText("Aomi Founders #42")).toBeInTheDocument();
    expect(screen.getByText("Collectible minted")).toBeInTheDocument();
    expect(screen.getByText("+3 × Aomi Pass #7")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Next wallet impact page" }),
    );
    expect(
      screen.getByText("Allow access to all Aomi Pass"),
    ).toBeInTheDocument();
  });

  it("does not show a stale failure warning beside a passed verdict", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 1,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x",
            label: "Transfer",
            kind: "transfer",
          },
        ],
        simulation: {
          ...simulation(),
          warnings: ["Simulation did not pass"],
        },
      }),
    ];

    render(<WalletReview />);

    expect(screen.queryByTestId("action-simulation")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Simulation did not pass"),
    ).not.toBeInTheDocument();
  });

  it("blocks approval when simulation failed", () => {
    runtime.pendingActions = [
      action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 1,
            from: "0x1111111111111111111111111111111111111111",
            to: "0x2222222222222222222222222222222222222222",
            data: "0x",
            label: "Transfer",
            kind: "transfer",
          },
        ],
        simulation: {
          ...simulation(),
          status: "failed",
          warnings: ["Execution reverted"],
        },
      }),
    ];

    render(<WalletReview />);

    expect(
      screen.getByRole("button", { name: "Send to wallet" }),
    ).toBeDisabled();
    expect(screen.getByText("No wallet changes simulated")).toBeInTheDocument();
  });
});

describe("activity signing strip", () => {
  it("keeps Signed neutral until signing and puts rejection in the strip", () => {
    const current = action({
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x123",
          to: "0x456",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
      simulation: simulation(),
    });
    runtime.pendingActions = [current];
    runtime.events = [current];
    const { rerender } = render(<ActivitySidebar />);
    expect(screen.getByTitle("Not yet signed").firstElementChild).toHaveClass(
      "bg-aomi-border",
    );
    runtime.pendingActions = [];
    runtime.events = [
      {
        ...current,
        state: "rejected",
        revision: 2,
        result: { status: "rejected", reason: "Request rejected" },
      },
    ];
    rerender(<ActivitySidebar />);
    expect(screen.getByTitle("Signing rejected").firstElementChild).toHaveClass(
      "bg-aomi-danger",
    );
    expect(screen.getByTestId("activity-transaction")).not.toHaveTextContent(
      "rejected",
    );
    expect(screen.queryByTestId("transaction-review")).not.toBeInTheDocument();
  });
  it("colors Signed blue when the wallet returns a submitted leg", () => {
    const current = action({
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x123",
          to: "0x456",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
      simulation: simulation(),
    });
    runtime.pendingActions = [];
    runtime.events = [
      {
        ...current,
        state: "completed",
        result: {
          status: "submitted",
          legs: [{ id: "leg_1", status: "submitted", transactionId: "0xhash" }],
        },
      },
    ];
    render(<ActivitySidebar />);
    expect(screen.getByTitle("Signed").firstElementChild).toHaveClass(
      "bg-aomi-accent",
    );
    expect(screen.getByTestId("activity-transaction")).not.toHaveTextContent(
      "submitted",
    );
  });
});

describe("active transaction presentation", () => {
  it("moves animation to signing, then stops for completed work", () => {
    const current = action({
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x123",
          to: "0x456",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
      simulation: simulation(),
    });
    runtime.events = [current];
    runtime.pendingActions = [current];
    const { rerender } = render(<ActivitySidebar />);
    expect(screen.getByTitle("Commit").firstElementChild).toHaveAttribute(
      "data-active-phase",
      "true",
    );
    expect(
      screen
        .getByTestId("activity-transaction")
        .querySelector("details, summary, pre"),
    ).toBeNull();
    runtime.actionAttempts.set(current.id, { state: "executing" });
    rerender(<ActivitySidebar />);
    expect(
      screen.getByTitle("Not yet signed").firstElementChild,
    ).toHaveAttribute("data-active-phase", "true");
    runtime.actionAttempts.clear();
    runtime.pendingActions = [];
    runtime.events = [
      {
        ...current,
        state: "completed",
        result: {
          status: "submitted",
          legs: [{ id: "leg_1", status: "submitted", transactionId: "0xhash" }],
        },
      },
    ];
    rerender(<ActivitySidebar />);
    expect(
      screen
        .getByTestId("activity-transaction")
        .querySelector("[data-active-phase]"),
    ).toBeNull();
  });
  it("does not animate an older unresolved request when a new turn is working", () => {
    const current = action({
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x123",
          to: "0x456",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
      simulation: simulation(),
    });
    runtime.pendingActions = [current];
    runtime.isRunning = true;
    runtime.events = [
      current,
      {
        type: "message",
        event_id: "new",
        sequence: 2,
        turn_id: "new-turn",
        occurred_at: 2,
        sender: "user",
        content: "New request",
      },
    ];
    render(<ActivitySidebar />);
    expect(
      screen
        .getByTestId("activity-transaction")
        .querySelector("[data-active-phase]"),
    ).toBeNull();
  });
  it("uses Library skill display labels", () => {
    runtime.pendingActions = [];
    runtime.events = [
      {
        type: "message",
        event_id: "skill",
        sequence: 1,
        turn_id: "turn-1",
        occurred_at: 1,
        sender: "agent",
        content: "",
        tool_result: [
          "activate_skill",
          JSON.stringify({ activated: ["aave"] }),
        ],
      },
    ];
    const { container } = render(<ActivitySidebar />);
    expect(screen.getByText("Aave")).toBeInTheDocument();
    expect(screen.queryByText("aave")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Skills 1" });
    const content = container.querySelector(
      '[data-activity-group-content="Skills"]',
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveClass("grid-rows-[1fr]", "opacity-100");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("grid-rows-[0fr]", "opacity-0");
    expect(content).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Aave")).toBeInTheDocument();
  });

  it("uses icon states and only renders the formatted subagent result", () => {
    runtime.pendingActions = [];
    runtime.events = [
      {
        type: "task_started",
        event_id: "task-started",
        sequence: 1,
        turn_id: "turn-1",
        occurred_at: 1,
        call_id: "call-1",
        agent_id: "agent-1",
        label: "ETH price",
        app: "research",
        resumed: false,
      },
      {
        type: "task_phase",
        event_id: "task-phase",
        sequence: 2,
        turn_id: "turn-1",
        occurred_at: 2,
        call_id: "call-1",
        agent_id: "agent-1",
        app: "research",
        phase: "task_completed",
        elapsed_ms: 100,
        observed_at_ms: 2,
      },
      {
        type: "task_activity",
        event_id: "task-tool",
        sequence: 3,
        turn_id: "turn-1",
        occurred_at: 3,
        call_id: "call-1",
        agent_id: "agent-1",
        child_seq: 1,
        kind: "tool_call",
        tool_name: "brave_search",
        args: {},
        result_preview: "search result",
      },
      {
        type: "task_completed",
        event_id: "task-completed",
        sequence: 4,
        turn_id: "turn-1",
        occurred_at: 4,
        call_id: "call-1",
        agent_id: "agent-1",
        status: "completed",
        message: "ETH spot price: **$2,502.20 USD**",
        staged_count: 0,
        steps: 1,
        duration_ms: 100,
      },
    ] as Event[];

    const { container } = render(<ActivitySidebar />);
    expect(
      screen.getByRole("status", { name: "Completed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
    expect(screen.queryByText("task_completed")).not.toBeInTheDocument();
    expect(screen.queryByText("brave search")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /ETH price/ });
    const content = container.querySelector(
      '[data-subagent-content="agent-1"]',
    );
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("grid-rows-[0fr]", "opacity-0");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveClass("grid-rows-[1fr]", "opacity-100");
    expect(screen.getByText("$2,502.20 USD").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*\$2,502/)).not.toBeInTheDocument();
  });

  it("shows a spinner instead of Working text for an active subagent", () => {
    runtime.pendingActions = [];
    runtime.events = [
      {
        type: "task_started",
        event_id: "task-started",
        sequence: 1,
        turn_id: "turn-1",
        occurred_at: 1,
        call_id: "call-1",
        agent_id: "agent-1",
        label: "ETH price",
        app: "research",
        resumed: false,
      },
    ] as Event[];

    render(<ActivitySidebar />);
    expect(screen.getByRole("status", { name: "Working" })).toBeInTheDocument();
    expect(screen.queryByText("Working")).not.toBeInTheDocument();
  });
});

describe("unified live transaction review", () => {
  beforeEach(() => {
    runtime.events = [];
    runtime.pendingActions = [];
    runtime.actionAttempts.clear();
    runtime.isRunning = false;
    runtime.executeAction.mockReset().mockResolvedValue(undefined);
    runtime.rejectAction.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);
  function transfer(id: string) {
    return {
      ...action({
        type: "execute_evm",
        transactions: [
          {
            chain_id: 8453,
            from: "0x123",
            to: "0x456",
            data: "0x",
            label: `Send ${id}`,
            kind: "transfer",
          },
        ],
        simulation: simulation(),
      }),
      id,
    };
  }
  it("reviews only the head request once and advances to the next request", async () => {
    const first = transfer("first"),
      second = transfer("second");
    runtime.pendingActions = [first, second];
    runtime.events = [first, second];
    const { rerender } = render(<ActivitySidebar />);
    expect(screen.getAllByText("Send first")).toHaveLength(1);
    expect(screen.queryByTestId("transaction-step")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Transactions/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Wallet request: 1 transaction/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send to wallet" }));
    await waitFor(() =>
      expect(runtime.executeAction).toHaveBeenCalledWith("first"),
    );
    runtime.pendingActions = [second];
    runtime.events = [
      {
        ...first,
        state: "rejected",
        result: { status: "rejected", reason: "No" },
      },
      second,
    ];
    rerender(<ActivitySidebar />);
    expect(screen.getByTestId("transaction-review")).toHaveAttribute(
      "data-action-id",
      "second",
    );
    expect(screen.getAllByTestId("activity-transaction")).toHaveLength(2);
  });
  it("keeps a failed durable request rejectable without offering signing", async () => {
    const failed = transfer("failed");
    if (failed.request.type !== "execute_evm") throw new Error("fixture");
    failed.request.simulation.status = "failed";
    runtime.pendingActions = [failed];
    runtime.events = [failed];
    render(<ActivitySidebar />);
    expect(
      screen.queryByRole("button", { name: "Send to wallet" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Transactions/ }),
    ).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reject request" }));
    await waitFor(() =>
      expect(runtime.rejectAction).toHaveBeenCalledWith(
        "failed",
        "Request rejected",
      ),
    );
  });
  it("retains completed transactions across newer turns in the unified list", () => {
    const past = { ...transfer("past"), state: "completed" as const };
    runtime.events = [
      past,
      {
        type: "message",
        event_id: "new-message",
        turn_id: "new-turn",
        sequence: 3,
        occurred_at: 3,
        role: "user",
        content: "Hello",
      } as Event,
    ];
    render(<ActivitySidebar />);
    expect(screen.queryByText("Past transactions")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transactions 1" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Send past")).toBeInTheDocument();
    expect(screen.queryByTestId("transaction-review")).not.toBeInTheDocument();
  });
  it("orders mixed transaction history newest first without duplicates", () => {
    const older = {
      ...transfer("older"),
      sequence: 1,
      state: "completed" as const,
    };
    const newest = { ...transfer("newest"), sequence: 9 };
    const middle = {
      ...transfer("middle"),
      sequence: 5,
      state: "rejected" as const,
    };
    runtime.events = [middle, newest, older];
    runtime.pendingActions = [newest];
    render(<ActivitySidebar />);
    const rows = screen.getAllByTestId("activity-transaction");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Send newest");
    expect(rows[1]).toHaveTextContent("Send middle");
    expect(rows[2]).toHaveTextContent("Send older");
    expect(screen.queryByText("Past transactions")).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Transactions, newest first" }),
    ).toHaveStyle({ height: "272px" });
  });
  it("expands the shared list and distinguishes pending from finalized without Review labels", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      ...transfer(`item-${i}`),
      sequence: i + 1,
      state: i === 4 ? ("pending" as const) : ("completed" as const),
    }));
    runtime.events = items;
    runtime.pendingActions = [items[4]];
    render(<ActivitySidebar />);
    expect(
      screen.queryByText("Review", { exact: true }),
    ).not.toBeInTheDocument();
    const rows = screen.getAllByTestId("activity-transaction");
    expect(rows[0]).toHaveClass("border-dashed");
    expect(rows[1]).not.toHaveClass("border-dashed");
    const expand = screen.getByRole("button", {
      name: "Show all 5 transactions",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    const less = screen.getByRole("button", {
      name: "Show fewer transactions",
    });
    expect(less).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByTestId("activity-transaction")).toHaveLength(5);
    fireEvent.click(less);
    expect(
      screen.getByRole("button", { name: "Show all 5 transactions" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(runtime.executeAction).not.toHaveBeenCalled();
  });
});
