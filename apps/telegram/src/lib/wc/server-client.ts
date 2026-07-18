import SignClient from "@walletconnect/sign-client";

import {
  DEFAULT_CHAIN_ID,
  SERVER_WC_CONNECT_TIMEOUT_MS,
  SUPPORTED_EIP155_CHAINS,
  SUPPORTED_WC_EVENTS,
  SUPPORTED_WC_METHODS,
  WALLET_SOURCE_SERVER_WC,
} from "@/lib/constants";
import {
  disconnectWallet,
  getWalletState,
  getOperationPayloadById,
  getOperationStateById,
  markConnected,
  markOperationAwaitingWallet,
  markOperationFailure,
  markOperationSuccess,
} from "@/lib/wallet-state/store";
import type { TxCall } from "@/lib/wallet-state/types";

type SignClientInstance = Awaited<ReturnType<typeof SignClient.init>>;

type WcStorage = {
  getKeys: () => Promise<string[]>;
  getEntries: <T = unknown>() => Promise<[string, T][]>;
  getItem: <T = unknown>(key: string) => Promise<T | undefined>;
  setItem: <T = unknown>(key: string, value: T) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type WcGlobalState = typeof globalThis & {
  __aomiWcStorageMap?: Map<string, unknown>;
};

type WcSession = {
  topic: string;
  namespaces?: {
    eip155?: {
      accounts?: string[];
    };
  };
};

type PendingConnect = {
  approval: () => Promise<WcSession>;
  expiresAt: number;
  timeout: ReturnType<typeof setTimeout>;
};

type ServerSession = {
  userId: string;
  topic: string;
  address: string;
  chainId: number;
  updatedAt: number;
};

function isUserRejectedError(err: unknown): boolean {
  const message = errorMessage(err);
  const lowered = message.toLowerCase();

  if (
    lowered.includes("user rejected") ||
    lowered.includes("rejected by user") ||
    lowered.includes("user denied") ||
    lowered.includes("user cancelled")
  ) {
    return true;
  }

  const code = errorCode(err);
  return code === 4001 || code === "ACTION_REJECTED";
}

function errorCode(err: unknown, depth = 0): unknown {
  if (depth > 4 || !err || typeof err !== "object") return undefined;
  const rec = err as Record<string, unknown>;
  if (rec.code !== undefined) return rec.code;
  return (
    errorCode(rec.error, depth + 1) ??
    errorCode(rec.cause, depth + 1) ??
    errorCode(rec.data, depth + 1)
  );
}

function errorMessage(err: unknown): string {
  return errorMessageInner(err, 0);
}

function errorMessageInner(err: unknown, depth: number): string {
  if (depth > 4) return "unknown";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "unknown";
  if (Array.isArray(err)) {
    const parts = err
      .map((v) => errorMessageInner(v, depth + 1))
      .filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : "unknown";
  }
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    for (const key of ["shortMessage", "reason", "message"]) {
      const val = rec[key];
      if (typeof val === "string" && val.trim()) return val;
    }
    for (const key of ["error", "cause", "data"]) {
      const nested = errorMessageInner(rec[key], depth + 1);
      if (nested !== "unknown") return nested;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }
  return String(err ?? "unknown");
}

function toHexQuantity(value: string): `0x${string}` {
  if (value.startsWith("0x")) return value as `0x${string}`;
  const int = BigInt(value || "0");
  return `0x${int.toString(16)}`;
}

function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}`;
}

function parseAccount(account: string): { chainId: number; address: string } {
  const [namespace, chain, address] = account.split(":");
  if (!namespace || !chain || !address || namespace !== "eip155") {
    throw new Error(`invalid_account_format:${account}`);
  }

  const chainId = Number(chain);
  if (!Number.isFinite(chainId) || chainId <= 0) {
    throw new Error(`invalid_chain_id:${chain}`);
  }

  return { chainId, address };
}

function pickSessionAccount(session: WcSession): {
  chainId: number;
  address: string;
} {
  const eip155 = session.namespaces?.eip155;
  const account = eip155?.accounts?.[0];

  if (!account) {
    throw new Error("session_missing_eip155_account");
  }

  return parseAccount(account);
}

function extractTypedDataChainId(
  typedData: Record<string, unknown>,
): number | undefined {
  const domain = typedData.domain;
  if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
    return undefined;
  }

  const value = (domain as { chainId?: unknown }).chainId;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      const parsed = Number.parseInt(value, 16);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return undefined;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return undefined;
}

function isHexBytes(value: string): boolean {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
}

function personalSignData(message: string): string {
  return isHexBytes(message)
    ? message
    : `0x${Buffer.from(message, "utf8").toString("hex")}`;
}

function buildTxRequest(call: TxCall, address: string) {
  return {
    from: address,
    to: call.to,
    value: toHexQuantity(call.value),
    data: call.data ? (call.data as `0x${string}`) : "0x",
  };
}

function getStorageMap(): Map<string, unknown> {
  const g = globalThis as WcGlobalState;
  if (!g.__aomiWcStorageMap) {
    g.__aomiWcStorageMap = new Map<string, unknown>();
  }
  return g.__aomiWcStorageMap;
}

class MemoryStorage implements WcStorage {
  constructor(private readonly map: Map<string, unknown>) {}

  async getKeys(): Promise<string[]> {
    return Array.from(this.map.keys());
  }

  async getEntries<T = unknown>(): Promise<[string, T][]> {
    return Array.from(this.map.entries()) as [string, T][];
  }

  async getItem<T = unknown>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

class ServerWcClient {
  private clientPromise: Promise<SignClientInstance> | null = null;
  private readonly sessions = new Map<string, ServerSession>();
  private readonly topicToUser = new Map<string, string>();
  private readonly pendingConnects = new Map<string, PendingConnect>();

  private getProjectId(): string {
    const projectId =
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      process.env.REOWN_PROJECT_ID;
    if (!projectId) {
      throw new Error("missing_walletconnect_project_id");
    }

    return projectId;
  }

  private async getClient(): Promise<SignClientInstance> {
    if (this.clientPromise) return this.clientPromise;

    const initPromise = SignClient.init({
      projectId: this.getProjectId(),
      // Prevent browser IndexedDB access in server runtime.
      storage: new MemoryStorage(getStorageMap()),
      metadata: {
        name: "Aomi Server WalletConnect",
        description:
          "Server-side WalletConnect proposer for Telegram bot flows",
        url: process.env.MINI_APP_URL || "https://mini-app.aomi.dev",
        icons: [],
      },
    }).then((client) => {
      client.on("session_delete", (event: { topic: string }) => {
        this.dropSessionByTopic(event.topic);
      });
      client.on("session_expire", (event: { topic: string }) => {
        this.dropSessionByTopic(event.topic);
      });

      return client;
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("SignClient.init timed out after 15s")),
        15_000,
      ),
    );

    this.clientPromise = Promise.race([initPromise, timeout]).catch((err) => {
      // Reset so the next call retries instead of returning the rejected promise.
      this.clientPromise = null;
      throw err;
    });

    return this.clientPromise;
  }

  private cancelPendingConnect(userId: string): void {
    const pending = this.pendingConnects.get(userId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingConnects.delete(userId);
  }

  private upsertSession(userId: string, session: WcSession): ServerSession {
    const { address, chainId } = pickSessionAccount(session);
    const next: ServerSession = {
      userId,
      topic: session.topic,
      address,
      chainId,
      updatedAt: Date.now(),
    };

    const prev = this.sessions.get(userId);
    if (prev) {
      this.topicToUser.delete(prev.topic);
    }

    this.sessions.set(userId, next);
    this.topicToUser.set(next.topic, userId);
    markConnected(userId, {
      address: next.address,
      chainId: next.chainId,
      source: WALLET_SOURCE_SERVER_WC,
    });

    return next;
  }

  private dropSessionByTopic(topic: string): void {
    const userId = this.topicToUser.get(topic);
    if (!userId) return;

    const session = this.sessions.get(userId);
    if (session?.topic === topic) {
      this.sessions.delete(userId);
      disconnectWallet(userId, "session_dropped");
    }

    this.topicToUser.delete(topic);
  }

  private getSession(userId: string): ServerSession {
    const session = this.sessions.get(userId);
    if (!session) {
      throw new Error("wallet_not_connected_server_wc");
    }

    return session;
  }

  async connect(userId: string): Promise<{ uri: string; expiresAt: number }> {
    await this.clearSession(userId, { clearWallet: false });

    const client = await this.getClient();
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        eip155: {
          methods: [...SUPPORTED_WC_METHODS],
          chains: [...SUPPORTED_EIP155_CHAINS],
          events: [...SUPPORTED_WC_EVENTS],
        },
      },
    });

    if (!uri) {
      throw new Error("walletconnect_uri_missing");
    }

    this.cancelPendingConnect(userId);
    const expiresAt = Date.now() + SERVER_WC_CONNECT_TIMEOUT_MS;
    const timeout = setTimeout(() => {
      const pending = this.pendingConnects.get(userId);
      if (pending && pending.expiresAt === expiresAt) {
        this.pendingConnects.delete(userId);
        const state = getWalletState(userId);
        const op = state.activeOperation;
        if (op && op.kind === "connect") {
          markOperationFailure(op.operationId, {
            errorCode: "connect_timed_out",
            errorMessage: "Wallet connection approval timed out.",
            rejected: false,
          });
        }
      }
    }, SERVER_WC_CONNECT_TIMEOUT_MS + 1000);

    this.pendingConnects.set(userId, {
      approval,
      expiresAt,
      timeout,
    });

    void this.awaitApproval(userId, expiresAt);

    return { uri, expiresAt };
  }

  private async awaitApproval(
    userId: string,
    expiresAt: number,
  ): Promise<void> {
    const pending = this.pendingConnects.get(userId);
    if (!pending || pending.expiresAt !== expiresAt) {
      return;
    }

    try {
      const session = await pending.approval();
      const latest = this.pendingConnects.get(userId);
      if (!latest || latest.expiresAt !== expiresAt) {
        return;
      }

      clearTimeout(latest.timeout);
      this.pendingConnects.delete(userId);
      this.upsertSession(userId, session);
    } catch (err) {
      const latest = this.pendingConnects.get(userId);
      if (latest && latest.expiresAt === expiresAt) {
        clearTimeout(latest.timeout);
        this.pendingConnects.delete(userId);
      }

      const state = getWalletState(userId);
      const op = state.activeOperation;
      if (op && op.kind === "connect") {
        markOperationFailure(op.operationId, {
          errorCode: isUserRejectedError(err)
            ? "user_rejected"
            : "connect_failed",
          errorMessage: errorMessage(err),
          rejected: isUserRejectedError(err),
        });
      }

      console.warn("[wc-server] approval failed:", errorMessage(err));
    }
  }

  async clearSession(
    userId: string,
    options?: { clearWallet?: boolean },
  ): Promise<void> {
    this.cancelPendingConnect(userId);

    const existing = this.sessions.get(userId);
    if (!existing) {
      if (options?.clearWallet ?? true) {
        disconnectWallet(userId);
      }
      return;
    }

    this.sessions.delete(userId);
    this.topicToUser.delete(existing.topic);

    try {
      const client = await this.getClient();
      await client.disconnect({
        topic: existing.topic,
        reason: {
          code: 6000,
          message: "User disconnected",
        },
      });
    } catch (err) {
      console.warn("[wc-server] disconnect failed:", errorMessage(err));
    }

    if (options?.clearWallet ?? true) {
      disconnectWallet(userId);
    }
  }

  async startTx(userId: string, txId: string): Promise<void> {
    const found = getOperationStateById(txId);
    if (!found || found.operation.kind !== "sign_tx") {
      throw new Error("pending_tx_not_found");
    }
    const payload = getOperationPayloadById(txId);
    if (!payload || payload.kind !== "sign_tx") {
      throw new Error("pending_tx_payload_not_found");
    }

    this.getSession(userId);
    markOperationAwaitingWallet(txId);

    try {
      const session = this.getSession(userId);
      const client = await this.getClient();
      const hashes: string[] = [];
      let lastChainId = session.chainId;

      for (const call of payload.calls) {
        const chainId = call.chainId || session.chainId || DEFAULT_CHAIN_ID;
        lastChainId = chainId;

        const txHash = await client.request<string>({
          topic: session.topic,
          chainId: `eip155:${chainId}`,
          request: {
            method: "eth_sendTransaction",
            params: [buildTxRequest(call, session.address)],
          },
        });

        if (typeof txHash === "string") {
          hashes.push(txHash);
        }
      }

      const lastHash = hashes[hashes.length - 1];

      markOperationSuccess(txId, {
        txHash: lastHash,
        txHashes: hashes,
        chainId: lastChainId,
        address: session.address,
      });

      this.sessions.set(userId, {
        ...session,
        chainId: lastChainId,
        updatedAt: Date.now(),
      });
    } catch (err) {
      const rejected = isUserRejectedError(err);
      markOperationFailure(txId, {
        errorCode: rejected ? "user_rejected" : "signing_failed",
        errorMessage: errorMessage(err),
        rejected,
      });
    }
  }

  async startEip712(userId: string, eip712Id: string): Promise<void> {
    const found = getOperationStateById(eip712Id);
    if (!found || found.operation.kind !== "sign_eip712") {
      throw new Error("pending_eip712_not_found");
    }
    const payload = getOperationPayloadById(eip712Id);
    if (!payload || payload.kind !== "sign_eip712") {
      throw new Error("pending_eip712_payload_not_found");
    }

    this.getSession(userId);
    markOperationAwaitingWallet(eip712Id);

    try {
      const session = this.getSession(userId);
      const client = await this.getClient();
      const chainId = payload.typedData
        ? extractTypedDataChainId(payload.typedData) ||
          session.chainId ||
          DEFAULT_CHAIN_ID
        : session.chainId || DEFAULT_CHAIN_ID;
      const request = payload.typedData
        ? {
            method: "eth_signTypedData_v4",
            params: [session.address, JSON.stringify(payload.typedData)],
          }
        : {
            method: "personal_sign",
            params: [
              personalSignData(payload.nonTypedData ?? ""),
              session.address,
            ],
          };

      const signature = await client.request<string>({
        topic: session.topic,
        chainId: `eip155:${chainId}`,
        request,
      });

      markOperationSuccess(eip712Id, {
        signature: String(signature),
        chainId,
        address: session.address,
      });

      this.sessions.set(userId, {
        ...session,
        chainId,
        updatedAt: Date.now(),
      });
    } catch (err) {
      const rejected = isUserRejectedError(err);
      markOperationFailure(eip712Id, {
        errorCode: rejected ? "user_rejected" : "signing_failed",
        errorMessage: errorMessage(err),
        rejected,
      });
    }
  }

  async startNetworkSwitch(userId: string, switchId: string): Promise<void> {
    const found = getOperationStateById(switchId);
    if (!found || found.operation.kind !== "switch_network") {
      throw new Error("pending_network_switch_not_found");
    }
    const payload = getOperationPayloadById(switchId);
    if (!payload || payload.kind !== "switch_network") {
      throw new Error("pending_network_switch_payload_not_found");
    }

    this.getSession(userId);
    markOperationAwaitingWallet(switchId);
    try {
      const session = this.getSession(userId);
      const client = await this.getClient();
      await client.request({
        topic: session.topic,
        chainId: `eip155:${session.chainId}`,
        request: {
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHexChainId(payload.chainId) }],
        },
      });

      markOperationSuccess(switchId, {
        chainId: payload.chainId,
        address: session.address,
      });

      this.sessions.set(userId, {
        ...session,
        chainId: payload.chainId,
        updatedAt: Date.now(),
      });
    } catch (err) {
      const rejected = isUserRejectedError(err);
      markOperationFailure(switchId, {
        errorCode: rejected ? "user_rejected" : "switch_failed",
        errorMessage: errorMessage(err),
        rejected,
      });
    }
  }
}

const globalRef = globalThis as typeof globalThis & {
  __serverWcClient?: ServerWcClient;
};

export function getServerWcClient(): ServerWcClient {
  if (!globalRef.__serverWcClient) {
    globalRef.__serverWcClient = new ServerWcClient();
  }

  return globalRef.__serverWcClient;
}
