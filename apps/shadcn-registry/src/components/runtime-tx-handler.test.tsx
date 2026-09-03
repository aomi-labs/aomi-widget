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
            },
          ],
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
      screen.getByRole("region", { name: "Estimated wallet changes" }),
    ).not.toHaveClass("sm:grid-cols-2");
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
    expect(screen.getByText("Token changes unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/lifi_q_abc123/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next transaction" }));
    expect(screen.getByText("Swap 0.00758 USDC to ETH")).toBeInTheDocument();
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
});
