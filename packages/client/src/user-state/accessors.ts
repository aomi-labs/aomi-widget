import type {
  UserState,
  UserStateAAMode,
  UserStateAuthMethod,
  UserStateSponsorProvider,
  UserStateWalletKind,
  UserStateWalletProvider,
} from "./index";
import { normalizeUserState } from "./normalize";

type UnknownRecord = Record<string, unknown>;

function asObject(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function evmBlock(userState?: UserState | null): UnknownRecord | undefined {
  return asObject(normalizeUserState(userState)?.evm);
}
function svmBlock(userState?: UserState | null): UnknownRecord | undefined {
  return asObject(normalizeUserState(userState)?.svm);
}
function connBlock(userState?: UserState | null): UnknownRecord | undefined {
  return asObject(normalizeUserState(userState)?.connection);
}
function aaBlock(userState?: UserState | null): UnknownRecord | undefined {
  return asObject(evmBlock(userState)?.aa);
}
function sponsorshipBlock(
  userState?: UserState | null,
): UnknownRecord | undefined {
  return asObject(evmBlock(userState)?.sponsorship);
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = trimmed.startsWith("0x")
    ? Number.parseInt(trimmed.slice(2), 16)
    : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function optionalAddress(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function timestamp(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const AUTH_METHODS = new Set<UserStateAuthMethod>([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi",
]);

export function address(userState?: UserState | null): string | undefined {
  const value = evmBlock(userState)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const evmAddress = address;

export function svmAddress(userState?: UserState | null): string | undefined {
  const value = svmBlock(userState)?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function chainId(userState?: UserState | null): number | undefined {
  return parseChainId(evmBlock(userState)?.chain_id);
}

export function ensName(userState?: UserState | null): string | undefined {
  const value = evmBlock(userState)?.ens_name;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function aaMode(
  userState?: UserState | null,
): UserStateAAMode | null | undefined {
  const value = aaBlock(userState)?.mode;
  if (value === null) return null;
  return value === "none" || value === "4337" || value === "7702"
    ? value
    : undefined;
}

export function SmartAccount4337(
  userState?: UserState | null,
): string | null | undefined {
  return optionalAddress(aaBlock(userState)?.smart_account);
}

export function Delegation7702(
  userState?: UserState | null,
): string | null | undefined {
  return optionalAddress(aaBlock(userState)?.delegation_7702);
}

export function walletKind(
  userState?: UserState | null,
): UserStateWalletKind | undefined {
  const addr = address(userState);
  if (!addr) return undefined;
  const smartAccount = SmartAccount4337(userState);
  return smartAccount && addr.toLowerCase() === smartAccount.toLowerCase()
    ? "smart-account"
    : "eoa";
}

export function isConnected(userState?: UserState | null): boolean | undefined {
  const value = connBlock(userState)?.is_connected;
  return typeof value === "boolean" ? value : undefined;
}

export function walletProvider(
  userState?: UserState | null,
): UserStateWalletProvider | null | undefined {
  const value = connBlock(userState)?.provider;
  if (value === null) return null;
  return value === "para" || value === "privy" || value === "baseAccount"
    ? value
    : undefined;
}

export function walletProviderSubject(
  userState?: UserState | null,
): string | null | undefined {
  return optionalString(connBlock(userState)?.wallet_provider_subject);
}

export function authMethod(
  userState?: UserState | null,
): UserStateAuthMethod | null | undefined {
  const value = connBlock(userState)?.auth_method;
  if (value === null) return null;
  return typeof value === "string" && AUTH_METHODS.has(value as UserStateAuthMethod)
    ? (value as UserStateAuthMethod)
    : undefined;
}

export function authValue(
  userState?: UserState | null,
): string | null | undefined {
  return optionalString(connBlock(userState)?.auth_value);
}

export function authVerifiedAt(
  userState?: UserState | null,
): number | null | undefined {
  return timestamp(connBlock(userState)?.auth_verified_at);
}

export function sponsored(
  userState?: UserState | null,
): boolean | null | undefined {
  const value = sponsorshipBlock(userState)?.sponsored;
  if (value === null) return null;
  return typeof value === "boolean" ? value : undefined;
}

export function sponsorProvider(
  userState?: UserState | null,
): UserStateSponsorProvider | null | undefined {
  const value = sponsorshipBlock(userState)?.sponsor_provider;
  if (value === null) return null;
  return value === "alchemy" ||
    value === "coinbase" ||
    value === "pimlico" ||
    value === "self"
    ? value
    : undefined;
}

export function sponsorAccount(
  userState?: UserState | null,
): string | null | undefined {
  return optionalAddress(sponsorshipBlock(userState)?.sponsor_account);
}

export function withExt(
  userState: UserState,
  key: string,
  value: unknown,
): UserState {
  const normalizedUserState = normalizeUserState(userState) ?? {};
  const currentExt = asObject(normalizedUserState.ext) ?? {};

  return {
    ...normalizedUserState,
    ext: {
      ...currentExt,
      [key]: value,
    },
  };
}
