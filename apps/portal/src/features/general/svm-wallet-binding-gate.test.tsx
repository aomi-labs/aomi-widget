import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const subscribers = new Map<string, (event: { payload?: unknown }) => void>();
const sendMessage = vi.fn(async () => undefined);
const bind = vi.fn(async () => true);

vi.mock("@aomi-labs/react", () => ({
  useAomiRuntime: () => ({
    subscribe: (
      type: string,
      callback: (event: { payload?: unknown }) => void,
    ) => {
      subscribers.set(type, callback);
      return () => subscribers.delete(type);
    },
    sendMessage,
  }),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

vi.mock("./use-svm-wallet-binding", () => ({
  useSvmWalletBinding: () => ({ bind, binding: false, canBind: true }),
}));

import { SvmWalletBindingGate } from "./svm-wallet-binding-gate";

describe("SvmWalletBindingGate", () => {
  it("offers binding on the kernel error and retries after success", async () => {
    render(<SvmWalletBindingGate />);
    act(() => {
      subscribers.get("tool_complete")?.({
        payload: { error: { type: "signing_unbound_wallet" } },
      });
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Bind wallet and retry" }),
    );
    await waitFor(() => expect(bind).toHaveBeenCalledOnce());
    expect(sendMessage).toHaveBeenCalledWith(
      "Retry the previous Solana transaction now that the wallet is bound.",
    );
  });
});
