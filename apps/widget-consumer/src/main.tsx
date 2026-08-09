import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AomiWidget, useAomiWalletKit } from "@aomi-labs/widget-lib";
import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/styles.css";
import "./styles.css";

const apiUrl =
  import.meta.env.VITE_AOMI_API_URL?.trim() || "http://localhost:3000";
const applicationId = import.meta.env.VITE_AOMI_APPLICATION_ID?.trim();
const environment =
  import.meta.env.VITE_PARA_ENVIRONMENT === "PROD" ? "PROD" : "BETA";
const SAFE_SIGNING_MESSAGE = "AOMI_WIDGET_SAFE_SIGNING_CHECK_2026_07_22";

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
        apiUrl={apiUrl}
        auth={{
          kind: "embedded_wallet",
          provider: "para",
          environment,
        }}
        height="min(780px, calc(100vh - 230px))"
      >
        <SafeSigningCheck />
      </AomiWidget>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
