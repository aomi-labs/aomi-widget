export type AomiUserId = string;
export type BetterAuthUserId = string;
export type WalletFamily = "evm" | "svm";
export type WalletKind = "external" | "embedded" | "smart_account";
export type WalletCapability = "read" | "write";
export type LinkedVia =
  | "siwe"
  | "siws"
  | "privy"
  | "para"
  | "import"
  | "observed"
  | "migration";
export type AuthIdentityProvider =
  | "better_auth"
  | "siwe"
  | "privy"
  | "para"
  | "email"
  | "google"
  | "github"
  | "x"
  | "discord"
  | "telegram"
  | "farcaster";

export type DbAomiUser = {
  id: AomiUserId;
  betterAuthUserId: BetterAuthUserId | null;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
  deactivatedAt: Date | null;
  mergedInto: AomiUserId | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DbAomiAuthIdentity = {
  id: string;
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  authMethod: string | null;
  displayLabel: string | null;
  providerMetadata: Record<string, unknown>;
  linkedAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};

export type DbAomiWallet = {
  id: string;
  userId: AomiUserId;
  family: WalletFamily;
  address: string;
  normalizedAddress: string;
  caip10: string | null;
  chainScope: string | null;
  kind: WalletKind;
  provider: string | null;
  providerWalletId: string | null;
  linkedVia: LinkedVia;
  label: string | null;
  displayMetadata: Record<string, unknown>;
  verifiedAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};

export type AomiUserRef = {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

export type LinkedAuthAccount = {
  id: string;
  provider: string;
  subject: string;
  email?: string;
  emailVerified?: boolean;
  displayLabel?: string;
  linkedAt?: number;
  lastSeenAt?: number;
};

export type AccountWallet = {
  id: string;
  family: WalletFamily;
  address: string;
  kind?: WalletKind;
  provider?: string;
  providerWalletId?: string;
  chainScope?: string;
  chainId?: number;
  linkedVia: LinkedVia | (string & {});
  label?: string;
  verifiedAt?: number;
  lastSeenAt?: number;
  capability?: WalletCapability;
};

export type AomiAccountResponse =
  | {
      user: AomiUserRef;
      linkedAccounts: LinkedAuthAccount[];
      wallets: AccountWallet[];
      session: {
        betterAuthUserId: string;
        expiresAt?: number;
        fresh?: boolean;
      };
    }
  | {
      user: null;
      linkedAccounts: [];
      wallets: [];
      session: null;
    };

export type AomiAccountCredential =
  | {
      provider: "privy";
      tokenKind?: "identity_token" | "access_token";
      providerToken: string;
    }
  | {
      provider: "para";
      tokenKind?: "session_jwt";
      providerToken: string;
      keyId?: string;
    }
  | { kind: "token"; provider: "privy" | "para"; token: string; keyId?: string }
  | { kind: "cookie" };

export type VerifiedPrivyToken = {
  subject: string;
  sessionId?: string;
  audience: string;
  issuer: "privy.io";
  expiresAt: number;
  email?: string;
  emailVerified?: boolean;
  linkedAccounts?: unknown[];
  rawClaims: Record<string, unknown>;
};

export type VerifiedParaJwt = {
  subject: string;
  audience: string;
  expiresAt: number;
  email?: string;
  emailVerified?: boolean;
  wallets?: unknown[];
  connectedWallets?: unknown[];
  rawClaims: Record<string, unknown>;
};

export type SignalRef =
  | {
      type: "wallet";
      family: WalletFamily;
      normalizedAddress: string;
      chainScope: string | null;
    }
  | {
      type: "identity";
      provider: AuthIdentityProvider;
      subject: string;
    }
  | { type: "email"; email: string };

export type SignalResolution =
  | { status: "linked" }
  | { status: "noop" }
  | {
      status: "needs_confirmation";
      severity: "yellow" | "red";
      otherUserId: AomiUserId;
      otherAccountWillClose: boolean;
    }
  | { status: "moved" }
  | { status: "merged" };
