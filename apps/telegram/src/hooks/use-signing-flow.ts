'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getTelegramStartParam, getTelegramUserId } from '@/lib/telegram-webapp';

// ── Types ──

export type SigningStatus = 'loading' | 'signing' | 'needs_connect' | 'done';
export type RelayStatus = 'pending' | 'awaiting_wallet' | 'signed' | 'rejected' | 'failed' | 'expired';

export interface SigningFlowConfig<T = unknown> {
  /** API endpoint for fetching/updating signing requests (e.g., '/api/operation/tx') */
  apiEndpoint: string;
  /** Query param name for the request ID (e.g., 'tx_id' or 'eip712_id') */
  idParamName: string;
  /** Key in API response containing the request ID */
  idResponseKey: string;
  /** Key in API response containing the data to sign */
  dataResponseKey: string;
  /** Key in API response/sendData for the result (e.g., 'tx_hash' or 'signature') */
  resultKey: string;
  /** Convert relay status to terminal message */
  terminalMessageFromStatus: (status: RelayStatus, result?: string, error?: string) => string;
  /** Whether to check for local private key (transaction signing only) */
  checkLocalPrivateKey?: boolean;
  /** Optional transform function for API response data */
  transformData?: (json: Record<string, unknown>) => T | null;
}

export interface SigningFlowState<T> {
  status: SigningStatus;
  terminalMessage: string | null;
  data: T | null;
  requestId: string | null;
  telegramUserId: string | null;
  localPrivateKey: `0x${string}` | null;
  connectionSettled: boolean;
  isConnected: boolean;
  /** Set status to 'signing' and mark signing as started */
  startSigning: () => void;
  /** Update status to a new value */
  setStatus: (status: SigningStatus) => void;
}

export interface SigningResultHandlers {
  /** Report successful signing to API and Telegram */
  reportSuccess: (requestId: string, result: string, extraData?: Record<string, unknown>) => Promise<void>;
  /** Report signing failure/rejection to API and Telegram */
  reportFailure: (requestId: string, error: unknown, extraData?: Record<string, unknown>) => Promise<void>;
  /** Report awaiting wallet status to API */
  reportAwaitingWallet: (requestId: string) => Promise<void>;
}

// ── Constants ──

const LOCAL_PRIVATE_KEY_STORAGE_KEY = 'aomi_aa_wallet_private_key_v1';
const CONNECTION_SETTLE_TIMEOUT_MS = 3500;

// ── Helper Functions ──

/**
 * Detect if an error is a user rejection (wallet declined).
 */
export function isUserRejectedError(err: unknown): boolean {
  const message = extractErrorMessage(err);
  const lowered = message.toLowerCase();
  const code = extractErrorCode(err);
  return (
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    lowered.includes('user rejected') ||
    lowered.includes('rejected by user') ||
    lowered.includes('user denied') ||
    lowered.includes('user cancelled')
  );
}

function extractErrorCode(err: unknown, depth = 0): unknown {
  if (depth > 4 || !err || typeof err !== 'object') return undefined;
  const rec = err as Record<string, unknown>;
  if (rec.code !== undefined) return rec.code;
  return (
    extractErrorCode(rec.error, depth + 1)
    ?? extractErrorCode(rec.cause, depth + 1)
    ?? extractErrorCode(rec.data, depth + 1)
  );
}

function extractErrorMessage(err: unknown, depth = 0): string {
  if (depth > 4) return 'unknown';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'unknown';
  if (Array.isArray(err)) {
    const parts = err.map((v) => extractErrorMessage(v, depth + 1)).filter(Boolean);
    return parts.length > 0 ? parts.join('; ') : 'unknown';
  }
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    for (const key of ['shortMessage', 'reason', 'message']) {
      const val = rec[key];
      if (typeof val === 'string' && val.trim()) return val;
    }
    for (const key of ['error', 'cause', 'data']) {
      const nested = extractErrorMessage(rec[key], depth + 1);
      if (nested !== 'unknown') return nested;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // ignore
    }
  }
  return String(err ?? 'unknown');
}

/**
 * Terminal message for transaction signing status.
 */
export function terminalMessageFromTxStatus(
  status: RelayStatus,
  txHash?: string,
  errorMessage?: string,
): string {
  switch (status) {
    case 'signed':
      return txHash ? `Already signed: ${txHash}` : 'Already signed.';
    case 'rejected':
      return 'This request was already rejected in wallet.';
    case 'failed':
      return `Signing failed: ${errorMessage ?? 'unknown error'}`;
    case 'expired':
      return 'This signing request expired. Ask the bot to resend it.';
    default:
      return 'Request is not signable.';
  }
}

/**
 * Terminal message for EIP-712 signing status.
 */
export function terminalMessageFromEip712Status(
  status: RelayStatus,
  signature?: string,
  errorMessage?: string,
): string {
  switch (status) {
    case 'signed':
      return signature ? `Already signed: ${signature}` : 'Already signed.';
    case 'rejected':
      return 'This signature request was already rejected in wallet.';
    case 'failed':
      return `Signature failed: ${errorMessage ?? 'unknown error'}`;
    case 'expired':
      return 'This signature request expired. Ask the bot to resend it.';
    default:
      return 'Request is not signable.';
  }
}

// ── Hook ──

/**
 * Shared hook for managing signing flow state and lifecycle.
 * Handles initialization, connection settlement, and status reporting.
 */
export function useSigningFlow<T>(
  config: SigningFlowConfig,
  restoreDone: boolean,
): [SigningFlowState<T>, SigningResultHandlers] {
  const { isConnected } = useAccount();

  // State
  const [status, setStatus] = useState<SigningStatus>('loading');
  const [terminalMessage, setTerminalMessage] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [idParam, setIdParam] = useState<string | null>(null);
  const [telegramUserId, setTelegramUserId] = useState<string | null>(null);
  const [localPrivateKey, setLocalPrivateKey] = useState<`0x${string}` | null>(null);
  const [connectionSettled, setConnectionSettled] = useState(false);

  // Refs to prevent duplicate actions
  const signingStarted = useRef(false);
  const needsConnectReported = useRef(false);

  // ── Initialization: read TG params, local key, URL params ──
  useEffect(() => {
    const queryUserId = new URLSearchParams(window.location.search).get('user_id');
    const userId = getTelegramUserId() ?? queryUserId;
    if (userId) setTelegramUserId(userId);

    const startParam = getTelegramStartParam();
    if (startParam) setIdParam(startParam);

    const urlId = new URLSearchParams(window.location.search).get(config.idParamName);
    if (urlId) setIdParam(urlId);

    // Check for local private key (transaction signing only)
    if (config.checkLocalPrivateKey) {
      try {
        const storedKey = window.localStorage.getItem(LOCAL_PRIVATE_KEY_STORAGE_KEY);
        if (storedKey) {
          // Validate by importing (will throw if invalid)
          import('viem/accounts').then(({ privateKeyToAccount }) => {
            privateKeyToAccount(storedKey as `0x${string}`);
            setLocalPrivateKey(storedKey as `0x${string}`);
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }
  }, [config.idParamName, config.checkLocalPrivateKey]);

  // ── Fetch pending data from API ──
  useEffect(() => {
    if (!telegramUserId && !idParam) return;

    (async () => {
      try {
        const params = new URLSearchParams();
        if (idParam) {
          params.set(config.idParamName, idParam);
        } else if (telegramUserId) {
          params.set('session_key', `telegram:dm:${telegramUserId}`);
        }

        const resp = await fetch(`${config.apiEndpoint}?${params}`);
        const json = await resp.json();

        if (json.pending) {
          const extractedData = config.transformData
            ? config.transformData(json as Record<string, unknown>)
            : json[config.dataResponseKey];
          setData(extractedData as T);
          setRequestId(json[config.idResponseKey] as string);
        } else if (json.status) {
          setStatus('done');
          setTerminalMessage(
            config.terminalMessageFromStatus(
              json.status as RelayStatus,
              json[config.resultKey],
              json.errorMessage,
            ),
          );
        } else {
          setStatus('done');
          setTerminalMessage('No pending signing request found.');
        }
      } catch {
        /* will be caught by polling fallback on Rust side */
      }
    })();
  }, [telegramUserId, idParam, config]);

  // ── Connection settlement: allow wallet restore time ──
  useEffect(() => {
    if (!restoreDone) return;
    if (isConnected || localPrivateKey) {
      setConnectionSettled(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setConnectionSettled(true);
    }, CONNECTION_SETTLE_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [restoreDone, isConnected, localPrivateKey]);

  // ── Detect "needs connect" state ──
  useEffect(() => {
    if (!data || !requestId) return;
    if (!restoreDone) return;
    if (!connectionSettled) return;
    if (signingStarted.current) return;
    if (isConnected || localPrivateKey) return;
    setStatus('needs_connect');
  }, [data, requestId, isConnected, localPrivateKey, restoreDone, connectionSettled]);

  // ── Report "wallet not connected" and close ──
  useEffect(() => {
    if (status !== 'needs_connect') return;
    if (!requestId || needsConnectReported.current) return;
    needsConnectReported.current = true;

    (async () => {
      await fetch(config.apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [config.idParamName]: requestId,
          status: 'failed',
          error_code: 'wallet_not_connected',
          error_message: 'Wallet is not connected in this webview.',
        }),
      }).catch(() => {});

      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(
          JSON.stringify({
            [config.idParamName]: requestId,
            status: 'failed',
            error: 'wallet_not_connected',
          }),
        );
        window.Telegram.WebApp.close();
      }
    })();
  }, [status, requestId, config.apiEndpoint, config.idParamName]);

  // ── Result handlers ──
  const reportAwaitingWallet = useCallback(
    async (reqId: string) => {
      await fetch(config.apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [config.idParamName]: reqId,
          status: 'awaiting_wallet',
        }),
      }).catch(() => {});
    },
    [config.apiEndpoint, config.idParamName],
  );

  const reportSuccess = useCallback(
    async (reqId: string, result: string, extraData?: Record<string, unknown>) => {
      // 1. Store on server (backup in case webview closes before sendData)
      await fetch(config.apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [config.idParamName]: reqId,
          status: 'signed',
          [config.resultKey]: result,
          ...extraData,
        }),
      });

      // 2. Return result to bot via sendData (closes the webview)
      setStatus('done');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(
          JSON.stringify({
            [config.idParamName]: reqId,
            [config.resultKey]: result,
            status: 'signed',
          }),
        );
        window.Telegram.WebApp.close();
      } else {
        console.log('[dev] signed:', reqId, result);
      }
    },
    [config.apiEndpoint, config.idParamName, config.resultKey],
  );

  const reportFailure = useCallback(
    async (reqId: string, error: unknown, extraData?: Record<string, unknown>) => {
      const rejected = isUserRejectedError(error);
      const errorStatus = rejected ? 'rejected' : 'failed';
      const errorMessage = extractErrorMessage(error);
      const errorCode = rejected ? 'user_rejected' : 'signing_failed';

      // Store rejection so polling picks it up
      await fetch(config.apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [config.idParamName]: reqId,
          status: errorStatus,
          error_code: errorCode,
          error_message: errorMessage,
          ...extraData,
        }),
      }).catch(() => {});

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(
          JSON.stringify({
            [config.idParamName]: reqId,
            status: errorStatus,
            error: errorMessage,
          }),
        );
        window.Telegram.WebApp.close();
      }
    },
    [config.apiEndpoint, config.idParamName],
  );

  const startSigning = useCallback(() => {
    signingStarted.current = true;
    setStatus('signing');
  }, []);

  const state: SigningFlowState<T> = {
    status,
    terminalMessage,
    data,
    requestId,
    telegramUserId,
    localPrivateKey,
    connectionSettled,
    isConnected,
    startSigning,
    setStatus,
  };

  const handlers: SigningResultHandlers = {
    reportSuccess,
    reportFailure,
    reportAwaitingWallet,
  };

  return [state, handlers];
}
