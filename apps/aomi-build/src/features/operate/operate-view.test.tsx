import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OperateView, truncateAddress } from "./operate-view";

const operateFetch = vi.fn();

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
      expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/configure its environment/i),
    ).toBeInTheDocument();
  });
});
