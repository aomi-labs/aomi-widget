import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Action } from "@aomi-labs/client";

const runtime = vi.hoisted(() => ({
  pendingActions: [] as Action[],
  actionAttempts: new Map(),
  events: [] as Action[],
  turnState: undefined as string | undefined,
  executeAction: vi.fn(),
  rejectAction: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock("@aomi-labs/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aomi-labs/react")>()),
  useAomiRuntime: () => runtime,
}));

vi.mock("../lib/wallet-kit", () => ({
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

import { RuntimeTxHandler } from "./runtime-tx-handler";

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

describe("RuntimeTxHandler", () => {
  beforeEach(() => {
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

    render(<RuntimeTxHandler />);

    expect(runtime.executeAction).not.toHaveBeenCalled();
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "To 0x222222…222222",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
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

    render(<RuntimeTxHandler />);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

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

    render(<RuntimeTxHandler />);
    expect(runtime.executeAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

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

    render(<RuntimeTxHandler />);

    expect(screen.getByTestId("action-simulation")).toHaveAttribute(
      "data-status",
      "passed",
    );
    expect(screen.getByTestId("action-simulation")).toHaveTextContent(
      "Simulation passed",
    );
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "Estimated gas · 21,000 units",
    );
    expect(screen.getByTestId("transaction-review")).toHaveTextContent(
      "−0.000000000000000001 ETH",
    );
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

    render(<RuntimeTxHandler />);

    expect(screen.getByText("−0.1 aBasUSDC")).toBeInTheDocument();
    expect(screen.getByText("+0.1 USDC")).toBeInTheDocument();
    const effects = screen.getAllByTestId("asset-effect");
    expect(effects[0]).toHaveTextContent("Aave Base USDC");
    expect(effects[1]).toHaveTextContent("USD Coin");
  });

  it("pages through a multi-transaction request without scrolling", () => {
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
        ],
      }),
    ];

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve USDC")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }));
    expect(screen.getByText("Swap USDC to ETH")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
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

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve 0.00758 USDC")).toBeInTheDocument();
    expect(screen.getByText("LI.FI")).toBeInTheDocument();
    expect(screen.getByText("No asset changes detected")).toBeInTheDocument();
    expect(screen.queryByText(/lifi_q_abc123/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }));
    expect(screen.getByText("Swap 0.00758 USDC to ETH")).toBeInTheDocument();
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

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Allow 0.0075 USDC")).toBeInTheDocument();
    expect(screen.getByText("Unlimited WETH spending")).toBeInTheDocument();
    expect(screen.getByText("Revoke DAI spending")).toBeInTheDocument();
    expect(screen.getAllByTestId("approval-effect")).toHaveLength(3);
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

    render(<RuntimeTxHandler />);

    expect(screen.getByText("NFT minted")).toBeInTheDocument();
    expect(screen.getByText("Aomi Founders #42")).toBeInTheDocument();
    expect(screen.getByText("Collectible minted")).toBeInTheDocument();
    expect(screen.getByText("+3 × Aomi Pass #7")).toBeInTheDocument();
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

    render(<RuntimeTxHandler />);

    expect(screen.getByTestId("action-simulation")).toHaveTextContent(
      "Simulation passed",
    );
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

    render(<RuntimeTxHandler />);

    expect(screen.getByRole("button", { name: "Blocked" })).toBeDisabled();
    expect(screen.getByText("No wallet changes simulated")).toBeInTheDocument();
  });
});
