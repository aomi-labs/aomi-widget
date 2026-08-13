import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AomiWidget, useAomiWalletKit } from "@aomi-labs/widget-lib";
import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/styles.css";
import { type EIP1193Provider, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { injected } from "wagmi/connectors";
import "./styles.css";

const apiUrl =
  import.meta.env.VITE_AOMI_WITNESS_PORTAL_URL?.trim() ||
  "http://localhost:3002";
const applicationId = import.meta.env.VITE_AOMI_APPLICATION_ID?.trim();
const initialThreadId = import.meta.env.VITE_AOMI_THREAD_ID?.trim();
const environment =
  import.meta.env.VITE_PARA_ENVIRONMENT === "PROD" ? "PROD" : "BETA";
const SAFE_SIGNING_MESSAGE = "AOMI_WIDGET_SAFE_SIGNING_CHECK_2026_07_22";
const witnessPrivateKey = import.meta.env.VITE_AOMI_E2E_PRIVATE_KEY as
  | Hex
  | undefined;

if (!witnessPrivateKey) {
  throw new Error(
    "VITE_AOMI_E2E_PRIVATE_KEY is required for the local witness fixture",
  );
}

const witnessAccount = privateKeyToAccount(witnessPrivateKey);
const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
const witnessProvider: EIP1193Provider = {
  async request({ method, params }) {
    const rpcParams = (params ?? []) as readonly unknown[];
    if (method === "eth_accounts" || method === "eth_requestAccounts") {
      return [witnessAccount.address] as never;
    }
    if (method === "eth_chainId")
      return `0x${baseSepolia.id.toString(16)}` as never;
    if (method === "wallet_requestPermissions") {
      return [{ parentCapability: "eth_accounts", caveats: [] }] as never;
    }
    if (method === "wallet_revokePermissions") return null as never;
    if (method === "wallet_switchEthereumChain") {
      const requested = (rpcParams[0] as { chainId?: string } | undefined)
        ?.chainId;
      if (Number.parseInt(requested ?? "0x0", 16) !== baseSepolia.id) {
        throw new Error("The witness fixture is locked to Base Sepolia");
      }
      return null as never;
    }
    if (method === "wallet_addEthereumChain") return null as never;
    if (method === "personal_sign" || method === "eth_sign") {
      const message = rpcParams.find(
        (value) =>
          typeof value === "string" &&
          value.startsWith("0x") &&
          value.length !== 42,
      );
      if (typeof message !== "string")
        throw new Error("Missing personal-sign message");
      return (await witnessAccount.signMessage({
        message: { raw: message as Hex },
      })) as never;
    }
    if (method === "eth_signTypedData_v4") {
      const encoded = rpcParams.find(
        (value) => typeof value === "string" && value.startsWith("{"),
      );
      if (typeof encoded !== "string")
        throw new Error("Missing typed-data payload");
      return (await witnessAccount.signTypedData(JSON.parse(encoded))) as never;
    }
    if (method === "wallet_getCapabilities") return {} as never;
    if (method === "eth_sendTransaction" || method === "wallet_sendCalls") {
      throw new Error("aa_direct_broadcast_forbidden");
    }
    throw new Error(`Unsupported local witness RPC method: ${method}`);
  },
  on(event, listener) {
    const eventListeners = listeners.get(event) ?? new Set();
    eventListeners.add(listener as (...args: unknown[]) => void);
    listeners.set(event, eventListeners);
    return this;
  },
  removeListener(event, listener) {
    listeners.get(event)?.delete(listener as (...args: unknown[]) => void);
    return this;
  },
};

const witnessConnector = injected({
  shimDisconnect: false,
  target: {
    id: "aomi-witness",
    name: "Aomi witness wallet",
    provider: witnessProvider,
  },
});

function BackendAaSmoke() {
  const walletKit = useAomiWalletKit();
  const witnessAddress = witnessAccount.address.toLowerCase();
  const connectedWitness = walletKit.accounts.find(
    (account) =>
      account.family === "evm" &&
      account.address.toLowerCase() === witnessAddress,
  );
  const isWitnessActive =
    walletKit.identity.address?.toLowerCase() === witnessAddress &&
    walletKit.identity.chainId === baseSepolia.id;
  const [status, setStatus] = useState(
    "Connect the owner wallet, then ask Aomi for an ordinary on-chain action in chat.",
  );
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setStatus(
      "Connecting the Base Sepolia witness owner and establishing its origin-bound session…",
    );
    try {
      if (connectedWitness) {
        await walletKit.selectAccount(connectedWitness.id);
      } else {
        await walletKit.connectEvmWallet?.("aomi-witness");
      }
      setStatus(
        "Owner connected. Stage a normal write in chat; backend policy will select ERC-4337 automatically when enabled.",
      );
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          error.name === "ConnectorAlreadyConnectedError"
        )
      ) {
        setStatus(
          error instanceof Error ? error.message : "Wallet connection failed",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="aa-smoke"
      aria-label="Backend-owned sponsored AA witness"
    >
      <div className="aa-title">
        <div>
          <span className="aa-kicker">Live testnet witness</span>
          <h2>Backend-owned sponsored ERC-4337</h2>
        </div>
        <span className="aa-state">policy resolved</span>
      </div>
      <p className="aa-status">{status}</p>
      <div className="aa-actions">
        <button
          type="button"
          onClick={connect}
          disabled={busy || isWitnessActive}
        >
          {isWitnessActive
            ? "Witness wallet connected"
            : "Connect witness wallet"}
        </button>
      </div>
      <div className="aa-grid">
        <div>
          <span>Action primitive</span>
          <strong>EVM call(s)</strong>
        </div>
        <div>
          <span>Execution envelope</span>
          <strong>Backend policy</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>Base Sepolia (84532)</strong>
        </div>
        <div>
          <span>Sponsorship</span>
          <strong>Required · backend only</strong>
        </div>
      </div>
      <p className="aa-note">
        The bot only stages calls. If the application policy requires sponsored
        4337, the backend prepares the immutable call-and-fee batch and the
        widget automatically opens the shared signing handoff.
      </p>
    </section>
  );
}

function SafeSigningCheck() {
  const walletKit = useAomiWalletKit();
  const [status, setStatus] = useState(
    "Ready when an EVM wallet is connected.",
  );
  const [isSigning, setIsSigning] = useState(false);

  const signMessage = async () => {
    if (!walletKit.signMessage) return;
    setIsSigning(true);
    setStatus("Waiting for wallet approval…");
    try {
      const result = await walletKit.signMessage({
        non_typed_data: SAFE_SIGNING_MESSAGE,
        description: "Harmless off-chain widget signing check",
      });
      const byteLength = Math.max(0, (result.signature.length - 2) / 2);
      setStatus(`Signature received (${byteLength} bytes). Nothing was sent.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Signing failed.");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <section className="signing-check" aria-label="Safe signing check">
      <div>
        <strong>Safe signing check</strong>
        <p>{status}</p>
      </div>
      <button
        type="button"
        disabled={!walletKit.signMessage || isSigning}
        onClick={signMessage}
      >
        {isSigning ? "Signing…" : "Sign harmless message"}
      </button>
    </section>
  );
}

function App() {
  if (!applicationId) {
    return (
      <main className="setup">
        <h1>Aomi widget consumer</h1>
        <p>Copy .env.example to .env.local and set VITE_AOMI_APPLICATION_ID.</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Cross-origin integration fixture</p>
        <h1>Aomi Widget</h1>
        <p>
          This Vite app runs on port 3001 and talks to Portal on port 3000 using
          an origin-bound widget session token. It does not rely on Portal
          cookies.
        </p>
      </header>
      <AomiWidget
        applicationId={applicationId}
        initialThreadId={initialThreadId}
        apiUrl={apiUrl}
        auth={{ kind: "browser_wallet" }}
        wallets={{
          evm: {
            chains: [baseSepolia],
            connectors: [witnessConnector],
            wallets: [],
            coinbase: false,
          },
          solana: false,
        }}
        height="min(780px, calc(100vh - 230px))"
      >
        <BackendAaSmoke />
        <SafeSigningCheck />
      </AomiWidget>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
