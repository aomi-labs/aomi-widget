"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { UserState as UserStateShape } from "@aomi-labs/client";
import {
  AomiRuntimeApiProvider,
  type AomiRuntimeApi,
  type WalletRequest,
  type WalletRequestResult,
} from "@aomi-labs/react";
import { LandingPrivyProvider } from "../../app/components/landing-privy-provider";
import { RuntimeTxHandler } from "../../../shadcn-registry/src/components/runtime-tx-handler";
import {
  useAomiWalletKit,
  type AomiWalletKit,
} from "../../../shadcn-registry/src/lib/wallet-kit";
import {
  createSolanaDriverRequest,
  type SolanaDriverRequestKind,
} from "./solana-runtime-driver-request";

type DriverMode =
  | "sign"
  | "send_fallback"
  | "send_direct"
  | "sign_and_send_direct";

type DriverLog = {
  ts: number;
  level: "info" | "ok" | "err";
  text: string;
};

type DriverReportStatus = "idle" | "running" | "completed" | "failed";

const DRIVER_SESSION_ID = "privy-solana-runtime-driver";
const DRIVER_CLUSTER = "solana:devnet" as const;
const DRIVER_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL?.trim() ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  "https://api.devnet.solana.com";
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

async function buildUnsignedSolanaTransaction(
  connection: Connection,
  publicKey: string,
  appendLog: (level: DriverLog["level"], text: string) => void,
) {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const feePayer = new PublicKey(publicKey);

  const tx = new Transaction({
    feePayer,
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: feePayer,
      toPubkey: feePayer,
      lamports: 0,
    }),
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  appendLog(
    "info",
    `prepared unsigned transaction (${serialized.length} bytes) for ${publicKey}`,
  );

  return encodeBase64(serialized);
}

function getRequestKindForMode(mode: DriverMode): SolanaDriverRequestKind {
  switch (mode) {
    case "send_fallback":
    case "send_direct":
      return "solana_send";
    case "sign_and_send_direct":
      return "solana_sign_and_send";
    default:
      return "signing";
  }
}

function identityToUserState(adapter: AomiWalletKit): UserStateShape {
  const identity = adapter.identity;
  return {
    connection: {
      is_connected: identity.isConnected,
      provider: "privy",
      provider_label: identity.secondaryLabel ?? undefined,
    },
    evm: {
      address: identity.address ?? undefined,
      chain_id: identity.chainId ?? undefined,
    },
    svm: {
      address: identity.svmAddress ?? undefined,
      cluster: identity.solanaCluster ?? undefined,
      wallet_name: identity.solanaWalletName ?? undefined,
      transport: identity.solanaTransport ?? undefined,
      // Backend `SolCapabilitiesUserState` wants a list of enabled
      // capability names, not a flag object.
      capabilities: identity.solanaCapabilities
        ? Object.entries({
            can_sign_message: identity.solanaCapabilities.canSignMessage,
            can_sign_transaction:
              identity.solanaCapabilities.canSignTransaction,
            can_sign_all_transactions:
              identity.solanaCapabilities.canSignAllTransactions,
            can_send_transaction:
              identity.solanaCapabilities.canSendTransaction,
            can_sign_and_send_transaction:
              identity.solanaCapabilities.canSignAndSendTransaction,
          })
            .filter(([, enabled]) => enabled === true)
            .map(([name]) => name)
        : undefined,
    },
  };
}

function PrivySolanaRuntimeDriverInner() {
  const searchParams = useSearchParams();
  const adapter = useAomiWalletKit();
  const connection = useMemo(
    () => new Connection(DRIVER_RPC_URL, "confirmed"),
    [],
  );
  const [driverMode, setDriverMode] = useState<DriverMode>("sign");
  const [pendingWalletRequests, setPendingWalletRequests] = useState<
    WalletRequest[]
  >([]);
  const [reportStatus, setReportStatus] = useState<DriverReportStatus>("idle");
  const [lastResult, setLastResult] = useState<WalletRequestResult | null>(
    null,
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DriverLog[]>([]);
  const requestCounterRef = useRef(1);
  const autorunStartedRef = useRef(false);
  const connectAttemptedRef = useRef(false);

  const appendLog = useCallback((level: DriverLog["level"], text: string) => {
    setLogs((prev) => [...prev, { ts: Date.now(), level, text }]);
  }, []);

  const currentUserState = useMemo(
    () => identityToUserState(adapter),
    [adapter],
  );

  const resolveWalletRequest = useCallback(
    async (id: string, result: WalletRequestResult) => {
      setPendingWalletRequests((prev) =>
        prev.filter((request) => request.id !== id),
      );
      setLastResult(result);
      setLastError(null);
      setReportStatus("completed");
      appendLog("ok", `request ${id} resolved as ${result.kind}`);
    },
    [appendLog],
  );

  const rejectWalletRequest = useCallback(
    async (id: string, error?: string) => {
      setPendingWalletRequests((prev) =>
        prev.filter((request) => request.id !== id),
      );
      setLastResult(null);
      setLastError(error ?? "request_rejected");
      setReportStatus("failed");
      appendLog("err", `request ${id} rejected: ${error ?? "unknown_error"}`);
    },
    [appendLog],
  );

  const dismissWalletRequest = useCallback((id: string) => {
    setPendingWalletRequests((prev) =>
      prev.filter((request) => request.id !== id),
    );
  }, []);

  const runtimeApi = useMemo<AomiRuntimeApi>(
    () => ({
      user: currentUserState,
      getUserState: () => currentUserState,
      setUser: () => undefined,
      addExtValue: () => undefined,
      removeExtValue: () => undefined,
      onUserStateChange: () => () => undefined,
      currentThreadId: DRIVER_SESSION_ID,
      threadViewKey: 0,
      threadListError: false,
      threadMetadata: new Map(),
      getThreadMetadata: () => undefined,
      createThread: async () => DRIVER_SESSION_ID,
      deleteThread: async () => undefined,
      renameThread: async () => undefined,
      archiveThread: async () => undefined,
      selectThread: () => undefined,
      isRunning: reportStatus === "running",
      getMessages: () => [],
      sendMessage: async () => undefined,
      cancelGeneration: () => undefined,
      notifications: [],
      showNotification: () => "privy-solana-runtime-driver-notification",
      dismissNotification: () => undefined,
      clearAllNotifications: () => undefined,
      pendingWalletRequests,
      hasBlockingWalletRequests: pendingWalletRequests.length > 0,
      startWalletRequest: () => undefined,
      dismissWalletRequest,
      resolveWalletRequest,
      rejectWalletRequest,
      simulateBatchTransactions: async () => {
        throw new Error(
          "simulateBatchTransactions is not used in Solana driver",
        );
      },
      subscribe: () => () => undefined,
      sseStatus: "connected",
    }),
    [
      currentUserState,
      dismissWalletRequest,
      pendingWalletRequests,
      rejectWalletRequest,
      reportStatus,
      resolveWalletRequest,
    ],
  );

  const autorun = searchParams.get("autorun") === "1";
  const queryMode = searchParams.get("mode") as DriverMode | null;

  const enqueueRequest = useCallback(
    async (mode: DriverMode) => {
      if (!PRIVY_APP_ID) {
        const message = "NEXT_PUBLIC_PRIVY_APP_ID is not configured";
        setReportStatus("failed");
        setLastError(message);
        appendLog("err", message);
        return;
      }

      if (!adapter.identity.svmAddress) {
        const message = "Connect a Solana wallet through Privy before running";
        setReportStatus("failed");
        setLastError(message);
        appendLog("err", message);
        return;
      }

      const kind = getRequestKindForMode(mode);
      const supportsSign =
        adapter.identity.solanaCapabilities?.canSignTransaction ||
        Boolean(adapter.signSolanaTransaction);

      if (!supportsSign) {
        const message =
          "Privy session is connected but no Solana signing capability is exposed";
        setReportStatus("failed");
        setLastError(message);
        appendLog("err", message);
        return;
      }

      setPendingWalletRequests([]);
      setLastResult(null);
      setLastError(null);
      setLogs([]);
      setReportStatus("running");
      setDriverMode(mode);

      appendLog(
        "info",
        `enqueuing ${kind} request for ${adapter.identity.svmAddress}`,
      );

      try {
        const unsignedTx = await buildUnsignedSolanaTransaction(
          connection,
          adapter.identity.svmAddress,
          appendLog,
        );
        const pendingSolanaId = requestCounterRef.current++;
        setPendingWalletRequests([
          createSolanaDriverRequest({
            kind,
            unsignedTx,
            signer: adapter.identity.svmAddress,
            description: `Privy runtime driver ${kind}`,
            cluster: DRIVER_CLUSTER,
            pendingSolanaId,
          }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setReportStatus("failed");
        setLastError(message);
        appendLog("err", message);
      }
    },
    [adapter, appendLog, connection],
  );

  useEffect(() => {
    if (!autorun) {
      return;
    }

    const nextMode =
      queryMode === "sign" ||
      queryMode === "send_fallback" ||
      queryMode === "send_direct" ||
      queryMode === "sign_and_send_direct"
        ? queryMode
        : "sign";

    if (!PRIVY_APP_ID) {
      if (!autorunStartedRef.current) {
        autorunStartedRef.current = true;
        appendLog("err", "NEXT_PUBLIC_PRIVY_APP_ID is not configured");
        setReportStatus("failed");
        setLastError("NEXT_PUBLIC_PRIVY_APP_ID is not configured");
      }
      return;
    }

    if (!adapter.identity.isConnected) {
      if (!connectAttemptedRef.current && adapter.canConnect) {
        connectAttemptedRef.current = true;
        appendLog("info", "opening Privy login modal");
        void adapter.connect();
      }
      return;
    }

    if (!autorunStartedRef.current && adapter.identity.svmAddress) {
      autorunStartedRef.current = true;
      void enqueueRequest(nextMode);
    }
  }, [adapter, appendLog, autorun, enqueueRequest, queryMode]);

  const canRun =
    Boolean(PRIVY_APP_ID) &&
    Boolean(adapter.identity.svmAddress) &&
    (adapter.identity.solanaCapabilities?.canSignTransaction ??
      Boolean(adapter.signSolanaTransaction));

  return (
    <AomiRuntimeApiProvider value={runtimeApi}>
      <RuntimeTxHandler />

      <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">
              Privy Solana Runtime Driver
            </h1>
            <p className="max-w-2xl text-sm text-stone-400">
              Uses the real Privy adapter. Log in through Privy (smart-wallet
              enforcement is enabled, so an EVM smart account is also
              provisioned), then enqueue a local Solana request so{" "}
              <code>RuntimeTxHandler</code> resolves it through Privy&apos;s
              embedded Solana wallet popup.
            </p>
          </header>

          <section className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-400">Privy configured:</span>{" "}
                <span
                  className={
                    PRIVY_APP_ID ? "text-emerald-300" : "text-rose-300"
                  }
                >
                  {PRIVY_APP_ID ? "yes" : "no"}
                </span>
              </div>
              <div>
                <span className="text-stone-400">Connected:</span>{" "}
                <span
                  className={
                    adapter.identity.isConnected
                      ? "text-emerald-300"
                      : "text-stone-300"
                  }
                >
                  {String(adapter.identity.isConnected)}
                </span>
              </div>
              <div>
                <span className="text-stone-400">EVM smart account:</span>{" "}
                <code>{adapter.identity.address ?? "not provisioned"}</code>
              </div>
              <div>
                <span className="text-stone-400">Solana address:</span>{" "}
                <code>{adapter.identity.svmAddress ?? "not connected"}</code>
              </div>
              <div>
                <span className="text-stone-400">Wallet:</span>{" "}
                <code>{adapter.identity.solanaWalletName ?? "none"}</code>
              </div>
              <div>
                <span className="text-stone-400">Transport:</span>{" "}
                <code>{adapter.identity.solanaTransport ?? "none"}</code>
              </div>
              <div>
                <span className="text-stone-400">Status:</span>{" "}
                <span
                  className={
                    reportStatus === "completed"
                      ? "text-emerald-300"
                      : reportStatus === "failed"
                        ? "text-rose-300"
                        : reportStatus === "running"
                          ? "text-amber-300"
                          : "text-stone-200"
                  }
                >
                  {reportStatus}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["sign", "sign only"],
                    ["send_fallback", "send via sign+broadcast"],
                    ["send_direct", "send direct"],
                    ["sign_and_send_direct", "sign and send direct"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDriverMode(value)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      driverMode === value
                        ? "border-emerald-300 bg-emerald-300 text-stone-900"
                        : "border-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (adapter.identity.isConnected) {
                      if (adapter.openAccountUI) {
                        void adapter.openAccountUI();
                      }
                      return;
                    }
                    if (adapter.canConnect) {
                      void adapter.connect();
                    }
                  }}
                  className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold hover:border-stone-400"
                >
                  {adapter.identity.isConnected
                    ? "Manage Privy account"
                    : "Connect with Privy"}
                </button>

                {adapter.disconnect && adapter.identity.isConnected ? (
                  <button
                    type="button"
                    onClick={() => void adapter.disconnect?.()}
                    className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold hover:border-stone-400"
                  >
                    Disconnect
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void enqueueRequest(driverMode)}
                  disabled={!canRun || reportStatus === "running"}
                  className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reportStatus === "running"
                    ? "Running…"
                    : `Run ${getRequestKindForMode(driverMode)}`}
                </button>
              </div>

              <p className="text-xs text-stone-500">
                Privy provisions an embedded Solana wallet on first login (and
                an EVM smart account, since smart wallets are required by this
                adapter). `sign` mode is the cheapest popup test because it
                doesn&apos;t need a funded Solana account.
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
              <h2 className="mb-3 text-sm tracking-wide text-stone-400 uppercase">
                Identity
              </h2>
              <pre className="overflow-x-auto text-xs text-stone-200">
                {JSON.stringify(adapter.identity, null, 2)}
              </pre>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
              <h2 className="mb-3 text-sm tracking-wide text-stone-400 uppercase">
                Last Result
              </h2>
              <pre className="overflow-x-auto text-xs text-stone-200">
                {JSON.stringify(lastResult ?? { error: lastError }, null, 2)}
              </pre>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
            <h2 className="mb-3 text-sm tracking-wide text-stone-400 uppercase">
              Log
            </h2>
            {logs.length === 0 ? (
              <p className="text-sm text-stone-500">
                Use the Privy connect button, then run a Solana request.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {logs.map((entry) => (
                  <div
                    key={`${entry.ts}-${entry.text}`}
                    className={
                      entry.level === "ok"
                        ? "text-emerald-300"
                        : entry.level === "err"
                          ? "text-rose-300"
                          : "text-stone-300"
                    }
                  >
                    <span className="mr-2 text-stone-500">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                    {entry.text}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AomiRuntimeApiProvider>
  );
}

export function PrivySolanaRuntimeDriver() {
  return (
    <LandingPrivyProvider>
      <PrivySolanaRuntimeDriverInner />
    </LandingPrivyProvider>
  );
}
