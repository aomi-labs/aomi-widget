"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  AomiRuntimeApiProvider,
  UserState,
  type AomiRuntimeApi,
  type WalletRequest,
  type WalletRequestKind,
  type WalletRequestResult,
  type WalletSolanaSignPayload,
} from "@aomi-labs/react";
import type { UserState as UserStateShape } from "@aomi-labs/client";
import { RuntimeTxHandler } from "../../../shadcn-registry/src/components/runtime-tx-handler";
import { AomiWalletKitContextProvider } from "../../../shadcn-registry/src/lib/wallet-kit/context";
import type { AomiWalletKit } from "../../../shadcn-registry/src/lib/wallet-kit/types";

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

const DRIVER_SESSION_ID = "solana-runtime-driver";
const DRIVER_CLUSTER = "solana:devnet" as const;
const DRIVER_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  "https://api.devnet.solana.com";
const DRIVER_SECRET_STORAGE_KEY = "aomi-solana-runtime-driver-secret-key";

function parseSecretKey(raw: string): Uint8Array | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? Uint8Array.from(parsed) : null;
    }

    return bs58.decode(trimmed);
  } catch {
    return null;
  }
}

function loadOrCreateDriverSigner(): Keypair {
  const envSecret = process.env.NEXT_PUBLIC_SOLANA_DRIVER_SECRET_KEY?.trim();

  if (envSecret) {
    const secret = parseSecretKey(envSecret);
    if (secret) {
      return Keypair.fromSecretKey(secret);
    }
  }

  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(DRIVER_SECRET_STORAGE_KEY);
    if (stored) {
      const secret = parseSecretKey(stored);
      if (secret) {
        return Keypair.fromSecretKey(secret);
      }
    }
  }

  const signer = Keypair.generate();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      DRIVER_SECRET_STORAGE_KEY,
      bs58.encode(signer.secretKey),
    );
  }
  return signer;
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let bin = "";
  for (const byte of bytes) {
    bin += String.fromCharCode(byte);
  }
  return btoa(bin);
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function signSerializedTransaction(
  unsignedTx: string,
  signer: Keypair,
): { signature?: string; signedTx: string } {
  const bytes = decodeBase64(unsignedTx);

  try {
    const tx = VersionedTransaction.deserialize(bytes);
    tx.sign([signer]);
    const signature = tx.signatures[0]
      ? encodeBase64(tx.signatures[0])
      : undefined;
    return {
      signature,
      signedTx: encodeBase64(tx.serialize()),
    };
  } catch {
    const tx = Transaction.from(bytes);
    tx.partialSign(signer);
    return {
      signature: tx.signature ? encodeBase64(tx.signature) : undefined,
      signedTx: encodeBase64(
        tx.serialize({
          requireAllSignatures: true,
          verifySignatures: true,
        }),
      ),
    };
  }
}

async function ensureFunded(
  connection: Connection,
  signer: Keypair,
  appendLog: (level: DriverLog["level"], text: string) => void,
) {
  const minimumLamports = Math.floor(0.02 * LAMPORTS_PER_SOL);
  const currentBalance = await connection.getBalance(signer.publicKey);

  if (currentBalance >= minimumLamports) {
    appendLog(
      "info",
      `signer balance already funded: ${currentBalance / LAMPORTS_PER_SOL} SOL`,
    );
    return currentBalance;
  }

  appendLog("info", "requesting devnet airdrop for local signer");
  const signature = await connection.requestAirdrop(
    signer.publicKey,
    Math.floor(0.1 * LAMPORTS_PER_SOL),
  );
  await connection.confirmTransaction(signature, "confirmed");
  const nextBalance = await connection.getBalance(signer.publicKey);
  appendLog(
    "ok",
    `airdrop confirmed: ${nextBalance / LAMPORTS_PER_SOL} SOL available`,
  );
  return nextBalance;
}

async function buildUnsignedSolanaTransaction(
  connection: Connection,
  signer: Keypair,
  appendLog: (level: DriverLog["level"], text: string) => void,
  requireFunds: boolean,
) {
  if (requireFunds) {
    await ensureFunded(connection, signer, appendLog);
  }

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: signer.publicKey,
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: signer.publicKey,
      lamports: 0,
    }),
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  appendLog(
    "info",
    `prepared unsigned transaction (${serialized.length} bytes) on ${DRIVER_CLUSTER}`,
  );
  return encodeBase64(serialized);
}

async function postDriverReport(runId: string, payload: Record<string, unknown>) {
  try {
    await fetch("/api/dev/solana-runtime-driver", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        runId,
        ...payload,
      }),
    });
  } catch (error) {
    console.error("[solana-runtime-driver] failed to post report", error);
  }
}

function getRequestKindForMode(mode: DriverMode): Extract<
  WalletRequestKind,
  "solana_sign" | "solana_send" | "solana_sign_and_send"
> {
  switch (mode) {
    case "send_fallback":
    case "send_direct":
      return "solana_send";
    case "sign_and_send_direct":
      return "solana_sign_and_send";
    default:
      return "solana_sign";
  }
}

export function SolanaRuntimeDriver() {
  const searchParams = useSearchParams();
  const signerRef = useRef<Keypair | null>(null);
  if (!signerRef.current) {
    signerRef.current = loadOrCreateDriverSigner();
  }
  const signer = signerRef.current;

  const connection = useMemo(
    () => new Connection(DRIVER_RPC_URL, "confirmed"),
    [],
  );

  const [driverMode, setDriverMode] = useState<DriverMode>("send_fallback");
  const [pendingWalletRequests, setPendingWalletRequests] = useState<
    WalletRequest[]
  >([]);
  const [reportStatus, setReportStatus] = useState<DriverReportStatus>("idle");
  const [lastResult, setLastResult] = useState<WalletRequestResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DriverLog[]>([]);
  const requestCounterRef = useRef(1);
  const autorunStartedRef = useRef(false);

  const appendLog = useCallback((level: DriverLog["level"], text: string) => {
    setLogs((prev) => [...prev, { ts: Date.now(), level, text }]);
  }, []);

  const currentUserState = useMemo<UserStateShape>(
    () => ({
      connection: {
        is_connected: true,
        primary_family: "svm",
        provider_label: "Local Solana Driver",
      },
      solana: {
        address: signer.publicKey.toBase58(),
        cluster: DRIVER_CLUSTER,
        wallet_name: "Local Dev Signer",
        transport: "embedded",
        capabilities: {
          can_sign_transaction: true,
          can_send_transaction: true,
          can_sign_and_send_transaction: true,
        },
      },
    }),
    [signer],
  );

  const adapter = useMemo<AomiWalletKit>(() => {
    const baseAdapter: AomiWalletKit = {
      identity: {
        status: "connected",
        isConnected: true,
        primaryLabel: "Local Dev Signer",
        secondaryLabel: DRIVER_CLUSTER,
        svmAddress: signer.publicKey.toBase58(),
        solanaCluster: DRIVER_CLUSTER,
        solanaWalletName: "Local Dev Signer",
        solanaTransport: "embedded",
        solanaCapabilities: {
          canSignTransaction: true,
          canSendTransaction: true,
          canSignAndSendTransaction: true,
        },
      },
      accounts: [
        {
          id: "Local Dev Signer",
          family: "svm",
          address: signer.publicKey.toBase58(),
          walletName: "Local Dev Signer",
          active: true,
        },
      ],
      selectAccount: async () => undefined,
      isReady: true,
      isSwitchingChain: false,
      canConnect: false,
      canOpenAccountUI: false,
      canDisconnect: false,
      connect: async () => undefined,
      signSolanaTransaction: async (payload: WalletSolanaSignPayload) => {
        if (!payload.unsignedTx) {
          throw new Error("Missing unsigned_tx payload");
        }
        appendLog("info", "adapter.signSolanaTransaction invoked");
        return signSerializedTransaction(payload.unsignedTx, signer);
      },
      solanaRpcHttpUrl: DRIVER_RPC_URL,
    };

    if (driverMode === "send_direct") {
      baseAdapter.sendSolanaTransaction = async (
        payload: WalletSolanaSignPayload,
      ) => {
        if (!payload.unsignedTx) {
          throw new Error("Missing unsigned_tx payload");
        }
        appendLog("info", "adapter.sendSolanaTransaction invoked");
        const signed = signSerializedTransaction(payload.unsignedTx, signer);
        const signature = await connection.sendRawTransaction(
          decodeBase64(signed.signedTx),
        );
        await connection.confirmTransaction(signature, "confirmed");
        return {
          signature,
          signedTx: signed.signedTx,
        };
      };
    }

    if (driverMode === "sign_and_send_direct") {
      baseAdapter.signAndSendSolanaTransaction = async (
        payload: WalletSolanaSignPayload,
      ) => {
        if (!payload.unsignedTx) {
          throw new Error("Missing unsigned_tx payload");
        }
        appendLog("info", "adapter.signAndSendSolanaTransaction invoked");
        const signed = signSerializedTransaction(payload.unsignedTx, signer);
        const signature = await connection.sendRawTransaction(
          decodeBase64(signed.signedTx),
        );
        await connection.confirmTransaction(signature, "confirmed");
        return {
          signature,
          signedTx: signed.signedTx,
        };
      };
    }

    if (driverMode === "send_fallback") {
      delete baseAdapter.sendSolanaTransaction;
      delete baseAdapter.signAndSendSolanaTransaction;
    }

    return baseAdapter;
  }, [appendLog, connection, driverMode, signer]);

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
      showNotification: () => "solana-runtime-driver-notification",
      dismissNotification: () => undefined,
      clearAllNotifications: () => undefined,
      pendingWalletRequests,
      hasBlockingWalletRequests: pendingWalletRequests.length > 0,
      startWalletRequest: () => undefined,
      resolveWalletRequest,
      rejectWalletRequest,
      simulateBatchTransactions: async () => {
        throw new Error("simulateBatchTransactions is not used in Solana driver");
      },
      subscribe: () => () => undefined,
      sendSystemCommand: async () => undefined,
      sseStatus: "connected",
    }),
    [
      currentUserState,
      pendingWalletRequests,
      rejectWalletRequest,
      reportStatus,
      resolveWalletRequest,
    ],
  );

  const runId = searchParams.get("runId") ?? undefined;
  const autorun = searchParams.get("autorun") === "1";
  const queryMode = searchParams.get("mode") as DriverMode | null;

  const reportRunState = useCallback(
    async (
      status: DriverReportStatus,
      extra?: { result?: WalletRequestResult | null; error?: string | null },
    ) => {
      if (!runId) {
        return;
      }
      await postDriverReport(runId, {
        status,
        mode: driverMode,
        signer: signer.publicKey.toBase58(),
        rpcUrl: DRIVER_RPC_URL,
        logs: logs.map((entry) => `[${entry.level}] ${entry.text}`),
        result: extra?.result ?? lastResult,
        error: extra?.error ?? lastError,
      });
    },
    [driverMode, lastError, lastResult, logs, runId, signer],
  );

  const enqueueRequest = useCallback(
    async (mode: DriverMode) => {
      setPendingWalletRequests([]);
      setLastResult(null);
      setLastError(null);
      setLogs([]);
      setReportStatus("running");
      setDriverMode(mode);

      const kind = getRequestKindForMode(mode);
      const requiresFunds = kind !== "solana_sign";
      appendLog(
        "info",
        `enqueuing ${kind} request against ${DRIVER_RPC_URL}`,
      );

      try {
        const unsignedTx = await buildUnsignedSolanaTransaction(
          connection,
          signer,
          appendLog,
          requiresFunds,
        );
        const pendingSolanaId = requestCounterRef.current++;
        const requestId = `${kind}-${pendingSolanaId}`;

        setPendingWalletRequests([
          {
            id: requestId,
            kind,
            payload: {
              unsignedTx,
              description: `Runtime driver ${kind}`,
              cluster: DRIVER_CLUSTER,
              pendingSolanaId,
            },
            timestamp: Date.now(),
          } as WalletRequest,
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        setReportStatus("failed");
        setLastError(message);
        appendLog("err", message);
      }
    },
    [appendLog, connection, signer],
  );

  useEffect(() => {
    if (!runId) {
      return;
    }
    void reportRunState(reportStatus);
  }, [reportRunState, reportStatus, runId]);

  useEffect(() => {
    if (!autorun || autorunStartedRef.current) {
      return;
    }
    autorunStartedRef.current = true;
    const nextMode =
      queryMode === "sign" ||
      queryMode === "send_fallback" ||
      queryMode === "send_direct" ||
      queryMode === "sign_and_send_direct"
        ? queryMode
        : "send_fallback";
    void enqueueRequest(nextMode);
  }, [autorun, enqueueRequest, queryMode]);

  useEffect(() => {
    if (!runId) {
      return;
    }

    if (reportStatus === "completed") {
      void reportRunState("completed", { result: lastResult, error: null });
    } else if (reportStatus === "failed") {
      void reportRunState("failed", { result: null, error: lastError });
    }
  }, [lastError, lastResult, reportRunState, reportStatus, runId]);

  return (
    <AomiWalletKitContextProvider value={adapter}>
      <AomiRuntimeApiProvider value={runtimeApi}>
        <RuntimeTxHandler />

        <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
          <div className="mx-auto max-w-4xl space-y-6">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold">
                Solana Runtime Driver
              </h1>
              <p className="max-w-2xl text-sm text-stone-400">
                Backendless harness for the frontend Solana wallet pipeline.
                This page injects Solana wallet requests locally, lets{" "}
                <code>RuntimeTxHandler</code> process them, and records the
                result so a local script can poll for pass or fail.
              </p>
            </header>

            <section className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-stone-400">Signer:</span>{" "}
                  <code>{signer.publicKey.toBase58()}</code>
                </div>
                <div>
                  <span className="text-stone-400">RPC:</span>{" "}
                  <code>{DRIVER_RPC_URL}</code>
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
                {runId ? (
                  <div>
                    <span className="text-stone-400">Run ID:</span>{" "}
                    <code>{runId}</code>
                  </div>
                ) : null}
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

                <button
                  type="button"
                  onClick={() => void enqueueRequest(driverMode)}
                  disabled={reportStatus === "running"}
                  className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reportStatus === "running"
                    ? "Running…"
                    : `Run ${getRequestKindForMode(driverMode)}`}
                </button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <h2 className="mb-3 text-sm uppercase tracking-wide text-stone-400">
                  Last Result
                </h2>
                <pre className="overflow-x-auto text-xs text-stone-200">
                  {JSON.stringify(lastResult ?? { error: lastError }, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <h2 className="mb-3 text-sm uppercase tracking-wide text-stone-400">
                  Pending Queue
                </h2>
                <pre className="overflow-x-auto text-xs text-stone-200">
                  {JSON.stringify(pendingWalletRequests, null, 2)}
                </pre>
              </div>
            </section>

            <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
              <h2 className="mb-3 text-sm uppercase tracking-wide text-stone-400">
                Log
              </h2>
              {logs.length === 0 ? (
                <p className="text-sm text-stone-500">
                  Run a request to populate the log.
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
    </AomiWalletKitContextProvider>
  );
}
