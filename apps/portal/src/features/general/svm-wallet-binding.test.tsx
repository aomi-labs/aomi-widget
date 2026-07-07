import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const SVM_ADDRESS = "BindCardWallet1111111111111111111111111111";
const CHALLENGE_MESSAGE = "Aomi Authorization v1\nbind card payload";
const SIGNATURE_BYTES = Uint8Array.from([1, 2, 3, 4]);

const signSolanaMessage = vi.fn(
  async (payload: { message?: string }): Promise<{ signature: string }> => {
    // The shim must hand the wallet the EXACT challenge bytes, base64-encoded.
    expect(payload.message).toBe(toBase64(new TextEncoder().encode(CHALLENGE_MESSAGE)));
    return { signature: toBase64(SIGNATURE_BYTES) };
  },
);

// The hook + card both read the adapter and post through accountScopedFetch;
// the REAL ceremony core (`@aomi-labs/client`) runs against these mocks.
vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiAuthAdapter: () => ({
    identity: {
      svmAddress: SVM_ADDRESS,
      solanaCluster: "devnet",
      solanaCapabilities: { canSignMessage: true },
    },
    signSolanaMessage,
  }),
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

const walletRows: Array<{ address: string; chain_type: string; signing_mode: string }> = [];
const posted: Array<{ path: string; body: unknown }> = [];

vi.mock("@portal/lib/settings-api", () => ({
  accountScopedFetch: async (path: string, options?: RequestInit) => {
    if (path.endsWith("/api/account/wallets")) {
      return { wallets: [...walletRows] };
    }
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    posted.push({ path, body });
    if (path.endsWith("/challenge")) {
      return {
        permit: {
          account: "acct-1",
          chain_type: "svm",
          wallet: SVM_ADDRESS,
          mode: "bind",
          version: 0,
          expiry: 4102444800,
        },
        message_base64: toBase64(new TextEncoder().encode(CHALLENGE_MESSAGE)),
      };
    }
    // commit → the freshly bound row also becomes visible to the next refresh
    walletRows.push({
      address: SVM_ADDRESS,
      chain_type: "svm",
      signing_mode: "human_sync",
    });
    return {
      address: SVM_ADDRESS,
      chain_type: "svm",
      signing_mode: "human_sync",
      authorization_version: 0,
    };
  },
}));

import { SvmWalletBinding } from "./svm-wallet-binding";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

describe("SvmWalletBinding", () => {
  beforeEach(() => {
    walletRows.length = 0;
    posted.length = 0;
    signSolanaMessage.mockClear();
  });

  it("binds an unbound wallet: signs the challenge bytes, commits the signature, reflects bound", async () => {
    render(<SvmWalletBinding />);

    // Unbound → the bind CTA appears once the wallets check resolves.
    const button = await screen.findByRole("button", { name: /bind wallet/i });

    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByText(/bound to your account/i)).toBeInTheDocument(),
    );

    expect(signSolanaMessage).toHaveBeenCalledTimes(1);
    const commit = posted.find((call) => call.path.endsWith("/commit"));
    expect(commit?.body).toMatchObject({
      permit: { wallet: SVM_ADDRESS, mode: "bind" },
      signature: toBase64(SIGNATURE_BYTES),
    });
  });

  it("shows the bound mode without a CTA when a row already exists", async () => {
    walletRows.push({
      address: SVM_ADDRESS,
      chain_type: "svm",
      signing_mode: "human_sync",
    });
    render(<SvmWalletBinding />);

    await waitFor(() =>
      expect(screen.getByText(/signing mode: human_sync/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /bind wallet/i })).toBeNull();
    expect(signSolanaMessage).not.toHaveBeenCalled();
  });
});
