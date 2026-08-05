"use client";

// src/lib/wallet-kit/identity.ts
var AOMI_SESSION_DISCONNECTED_IDENTITY = {
  status: "disconnected",
  isConnected: false,
  address: void 0,
  walletKind: void 0,
  aaMode: void 0,
  SmartAccount4337: void 0,
  Delegation7702: void 0,
  sponsored: void 0,
  sponsorProvider: void 0,
  sponsorAccount: void 0,
  chainId: void 0,
  svmAddress: void 0,
  walletProvider: void 0,
  walletProviderSubject: void 0,
  authMethod: void 0,
  authProvider: void 0,
  authValue: void 0,
  authVerifiedAt: void 0
};
var AOMI_SESSION_BOOTING_IDENTITY = {
  status: "booting",
  isConnected: false,
  address: void 0,
  walletKind: void 0,
  aaMode: void 0,
  SmartAccount4337: void 0,
  Delegation7702: void 0,
  sponsored: void 0,
  sponsorProvider: void 0,
  sponsorAccount: void 0,
  chainId: void 0,
  svmAddress: void 0,
  walletProvider: void 0,
  walletProviderSubject: void 0,
  authMethod: void 0,
  authProvider: void 0,
  authValue: void 0,
  authVerifiedAt: void 0
};
function formatWalletAddress(address) {
  if (!address) return void 0;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}
function formatWalletProvider(provider) {
  if (!provider) return void 0;
  const labelMap = {
    none: "Wallet",
    para: "Para",
    privy: "Privy",
    baseAccount: "Base Account"
  };
  return labelMap[provider] ?? provider;
}
function formatAuthMethod(method) {
  if (!method) return void 0;
  const labelMap = {
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    facebook: "Facebook",
    x: "X",
    discord: "Discord",
    farcaster: "Farcaster",
    telegram: "Telegram",
    email: "Email",
    phone: "Phone",
    passkey: "Passkey",
    wallet: "Wallet",
    wagmi: "External Wallet"
  };
  return labelMap[method];
}
var OAUTH_METHODS = /* @__PURE__ */ new Set([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone"
]);
function inferAuthMethod(authMethods) {
  if (!(authMethods instanceof Set) || authMethods.size === 0) return void 0;
  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (OAUTH_METHODS.has(normalized)) {
      return normalized;
    }
  }
  return void 0;
}

// src/lib/wallet-kit/context.tsx
import { createContext, useContext, useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { jsx, jsxs } from "react/jsx-runtime";
var DISCONNECTED_WALLET_KIT = {
  identity: AOMI_SESSION_DISCONNECTED_IDENTITY,
  isReady: true,
  isSwitchingChain: false,
  canConnect: false,
  canOpenAccountUI: false,
  canDisconnect: false,
  accounts: [],
  selectAccount: async () => void 0,
  evmWallets: [],
  solanaWallets: [],
  socialLoginOptions: [],
  supportedNetworks: {
    evm: [],
    solana: []
  },
  connect: async () => void 0
};
var AomiWalletKitContext = createContext(DISCONNECTED_WALLET_KIT);
function toSvmCapabilities(capabilities) {
  if (!capabilities) return void 0;
  return Object.entries(capabilities).filter(([, enabled]) => enabled).map(
    ([name]) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  );
}
function AomiWalletKitSync({ walletKit }) {
  const { setUser } = useUser();
  const identity = walletKit.identity;
  useEffect(() => {
    setUser({
      address: identity.address ?? void 0,
      walletKind: identity.walletKind ?? void 0,
      chainId: identity.chainId ?? void 0,
      isConnected: identity.isConnected,
      svm: {
        address: identity.svmAddress ?? null,
        cluster: identity.svmCluster ?? void 0,
        wallet_name: identity.svmWalletName ?? null,
        transport: identity.svmTransport ?? null,
        capabilities: toSvmCapabilities(identity.svmCapabilities) ?? []
      },
      walletProvider: identity.isConnected ? identity.sessionProvider ?? identity.embeddedProvider ?? identity.walletProvider ?? null : null,
      walletProviderSubject: identity.isConnected ? identity.walletProviderSubject ?? null : null,
      authMethod: identity.isConnected ? identity.authMethod ?? null : null,
      authValue: identity.isConnected ? identity.authValue ?? null : null,
      authVerifiedAt: identity.isConnected ? identity.authVerifiedAt ?? null : null,
      sponsored: identity.isConnected ? identity.sponsored ?? null : null,
      sponsorProvider: identity.isConnected ? identity.sponsorProvider ?? null : null,
      sponsorAccount: identity.isConnected ? identity.sponsorAccount ?? null : null
    });
  }, [
    identity.address,
    identity.authMethod,
    identity.authValue,
    identity.authVerifiedAt,
    identity.chainId,
    identity.isConnected,
    identity.walletKind,
    identity.sponsorAccount,
    identity.sponsorProvider,
    identity.sponsored,
    identity.svmCapabilities,
    identity.svmCluster,
    identity.svmTransport,
    identity.svmWalletName,
    identity.svmAddress,
    identity.embeddedProvider,
    identity.sessionProvider,
    identity.walletProvider,
    identity.walletProviderSubject,
    setUser
  ]);
  return null;
}
function AomiWalletKitContextProvider({
  children,
  value
}) {
  return /* @__PURE__ */ jsxs(AomiWalletKitContext.Provider, { value, children: [
    /* @__PURE__ */ jsx(AomiWalletKitSync, { walletKit: value }),
    children
  ] });
}
function useAomiWalletKit() {
  return useContext(AomiWalletKitContext);
}

// src/lib/wallet-kit/catalog/wallet-branding.ts
function normalizeWalletOptionId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
var providerBrandRegistry = [];
function registerWalletBrand(descriptor) {
  if (!providerBrandRegistry.some((entry) => entry.key === descriptor.key)) {
    providerBrandRegistry.push(descriptor);
  }
}
function canonicalWalletKey(value) {
  const normalized = normalizeWalletOptionId(value);
  for (const brand of providerBrandRegistry) {
    if (brand.matchers.some((matcher) => normalized.includes(matcher))) {
      return brand.key;
    }
  }
  if (normalized.includes("metamask")) return "metamask";
  if (normalized.includes("rabby")) return "rabby";
  if (normalized.includes("coinbase")) return "coinbase";
  if (normalized.includes("rainbow")) return "rainbow";
  if (normalized.includes("walletconnect")) return "walletconnect";
  if (normalized.includes("baseaccount") || normalized === "base") {
    return "base";
  }
  if (normalized.includes("phantom")) return "phantom";
  if (normalized.includes("solflare")) return "solflare";
  if (normalized.includes("backpack")) return "backpack";
  if (normalized.includes("glow")) return "glow";
  return normalized;
}

// src/lib/wallet-kit/registry/types.ts
var REGISTRY_STORAGE_KEY = "aomi.wallet.registry.v1";
var POPUP_REATTACH_BUDGET = 2;
var REATTACH_SUPPRESSION_MS = 3e5;
var SETTLE_QUIET_MS = 1200;
var AUTH_FLOW_RECONNECT_SETTLE_MS = 8e3;
var EVM_IDENTITY_GRACE_MS = 1800;

// src/lib/wallet-kit/wallet-debug.ts
var DEBUG_KEY = "aomi.wallet.debug";
function walletDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const flag = window.localStorage.getItem(DEBUG_KEY);
    if (flag === "1" || flag === "true") return true;
    if (flag === "0" || flag === "false") return false;
  } catch {
  }
  return false;
}
function walletDebug(event, data) {
  if (!walletDebugEnabled()) return;
  if (data === void 0) {
    console.info(`[aomi-wallet] ${event}`);
  } else {
    console.info(`[aomi-wallet] ${event}`, data);
  }
}

// src/lib/wallet-kit/composer/AomiWalletKitComposer.tsx
import { useEffect as useEffect2, useMemo, useState } from "react";
import { UserState, useUser as useUser2 } from "@aomi-labs/react";

// src/lib/wallet-kit/account/disabled-runtime.ts
var DISABLED_ACCOUNT_RUNTIME = {
  status: "disabled",
  linkedAccounts: [],
  wallets: [],
  refresh: async () => void 0
};

// src/lib/wallet-kit/wallet-utils.ts
function normalizeWalletAddress(family, address) {
  const trimmed = address.trim();
  return family === "evm" ? trimmed.toLowerCase() : trimmed;
}
function walletKey(family, address) {
  return `${family}:${normalizeWalletAddress(family, address)}`;
}
function toRegistryFamily(family, fallback = "evm") {
  if (!family) return fallback;
  return family === "solana" ? "svm" : family;
}

// src/lib/wallet-kit/accounts.ts
var GENERIC_WALLET_NAMES = /* @__PURE__ */ new Set(["", "injected", "browser wallet", "wallet"]);
function isRealBrandName(name) {
  return !GENERIC_WALLET_NAMES.has((name ?? "").trim().toLowerCase());
}
function buildAccounts(input) {
  const accounts = [];
  const active = input.activeEvmAddress ? walletKey("evm", input.activeEvmAddress) : void 0;
  const activeConnId = input.activeEvmConnectionId;
  const evmGroups = /* @__PURE__ */ new Map();
  for (const conn of input.evmConnections) {
    const key = walletKey("evm", conn.address);
    const group = evmGroups.get(key);
    if (group) group.push(conn);
    else evmGroups.set(key, [conn]);
  }
  for (const [lowerAddr, conns] of evmGroups) {
    const activeConn = activeConnId ? conns.find((c) => c.id === activeConnId) : void 0;
    const display = activeConn ?? conns.find((c) => isRealBrandName(c.walletName)) ?? conns[0];
    const isActive = activeConnId ? conns.some((c) => c.id === activeConnId) : !!active && lowerAddr === active;
    accounts.push({
      id: (activeConn ?? display).id,
      family: "evm",
      address: display.address,
      label: formatWalletAddress(display.address),
      walletName: display.walletName,
      chainId: display.chainId,
      provider: display.provider,
      walletKind: display.walletKind,
      connectorIds: conns.map((c) => c.id),
      active: isActive
    });
  }
  const seenSvm = /* @__PURE__ */ new Set();
  for (const connection of input.svmConnections ?? []) {
    const key = walletKey("svm", connection.publicKey);
    if (seenSvm.has(key)) continue;
    seenSvm.add(key);
    accounts.push({
      id: connection.id ?? connection.walletName ?? connection.publicKey,
      family: "svm",
      address: connection.publicKey,
      label: formatWalletAddress(connection.publicKey),
      walletName: connection.walletName,
      provider: connection.provider,
      walletKind: connection.walletKind,
      active: connection.publicKey === input.activeSvmAddress
    });
  }
  return accounts;
}
function buildWalletKitAccounts({
  accounts,
  accountWallets = [],
  transformAccounts,
  canManageAccount
}) {
  const linked = applyStoredWalletLinks(accounts, accountWallets);
  const transformed = transformAccounts ? transformAccounts(linked) : linked;
  if (!canManageAccount) return transformed;
  return transformed.map(
    (account) => canManageAccount(account) ? { ...account, manageable: true } : account
  );
}
function applyStoredWalletLinks(accounts, wallets) {
  if (wallets.length === 0) return accounts;
  const storedByKey = new Map(
    wallets.map((wallet) => [walletKey(wallet.family, wallet.address), wallet])
  );
  return accounts.map((account) => {
    const stored = storedByKey.get(walletKey(account.family, account.address));
    if (!stored) return account;
    return {
      ...account,
      linked: true,
      linkedVia: stored.linkedVia,
      capability: stored.capability
    };
  });
}

// src/lib/wallet-kit/composer/build-identity.ts
function buildWalletKitIdentity({
  auth,
  address,
  chainId,
  isBooting,
  isConnected,
  svm,
  aa,
  sponsorship,
  walletName,
  walletSource
}) {
  const svmIdentity = svm?.identity(Date.now());
  const svmAddress = svmIdentity?.address;
  const svmTransport = svmIdentity?.transport;
  const svmCapabilities = svmIdentity?.capabilities;
  const baseSvm = {
    svmAddress,
    svmCluster: svmIdentity?.cluster,
    svmWalletName: svmIdentity?.walletName,
    svmTransport: svmAddress ? svmTransport : void 0,
    svmCapabilities,
    solanaCluster: svmIdentity?.cluster,
    solanaWalletName: svmIdentity?.walletName,
    solanaTransport: svmAddress ? svmTransport : void 0,
    solanaCapabilities: svmCapabilities
  };
  if (isBooting) {
    return {
      ...AOMI_SESSION_BOOTING_IDENTITY,
      chainId,
      ...baseSvm
    };
  }
  if (isConnected && auth.primaryLabel) {
    return {
      status: "connected",
      isConnected: true,
      address,
      walletKind: "eoa",
      ...aa,
      ...sponsorship,
      chainId,
      sessionProvider: auth.sessionProvider,
      embeddedProvider: auth.embeddedProvider,
      walletSource: walletSource ?? (address && auth.embeddedProvider ? "embedded" : void 0),
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod,
      authProvider: auth.authMethod,
      authValue: auth.authValue,
      primaryLabel: auth.primaryLabel,
      secondaryLabel: formatAuthMethod(auth.authMethod) ?? formatWalletProvider(auth.provider),
      ...baseSvm
    };
  }
  if (isConnected && address) {
    return {
      status: "connected",
      isConnected: true,
      address,
      walletKind: "eoa",
      ...aa,
      ...sponsorship,
      chainId,
      sessionProvider: auth.sessionProvider,
      embeddedProvider: auth.embeddedProvider,
      walletSource: walletSource ?? (auth.embeddedProvider ? "embedded" : "injected"),
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod ?? "wagmi",
      authProvider: auth.authMethod ?? "wagmi",
      authValue: auth.authValue,
      primaryLabel: formatWalletAddress(address) ?? "Connected wallet",
      secondaryLabel: walletName ?? formatAuthMethod(auth.authMethod ?? "wagmi") ?? formatWalletProvider(auth.provider),
      ...baseSvm
    };
  }
  if (svmAddress) {
    return {
      status: "connected",
      isConnected: true,
      walletKind: void 0,
      aaMode: void 0,
      chainId,
      svmAddress,
      sessionProvider: auth.sessionProvider,
      walletSource: "injected",
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod,
      authProvider: auth.authMethod,
      authValue: auth.authValue,
      primaryLabel: formatWalletAddress(svmAddress) ?? "Connected Solana wallet",
      secondaryLabel: "Solana",
      svmCluster: svmIdentity?.cluster,
      svmWalletName: svmIdentity?.walletName,
      svmTransport,
      svmCapabilities,
      solanaCluster: svmIdentity?.cluster,
      solanaWalletName: svmIdentity?.walletName,
      solanaTransport: svmTransport,
      solanaCapabilities: svmCapabilities
    };
  }
  return {
    ...AOMI_SESSION_DISCONNECTED_IDENTITY,
    chainId,
    sessionProvider: auth.sessionProvider,
    walletProvider: auth.legacyWalletProvider,
    walletProviderSubject: auth.subject,
    authMethod: auth.authMethod,
    authProvider: auth.authMethod,
    authValue: auth.authValue,
    svmCluster: svmIdentity?.cluster,
    solanaCluster: svmIdentity?.cluster
  };
}

// src/lib/wallet-kit/composer/build-wallet-kit-actions.ts
function buildWalletKitActions({
  accounts,
  auth,
  evm,
  svm,
  execution,
  registryStore,
  evmAddress,
  registryEvmConnected,
  svmIdentity
}) {
  return {
    selectAccount: async (id) => {
      const target = accounts.find(
        (account) => account.id === id || account.family === "evm" && account.connectorIds?.includes(id)
      );
      if (!target) {
        throw new Error(`Unknown account: ${id}`);
      }
      if (target.family === "evm") {
        await evm.selectAccount(id);
        return;
      }
      await svm?.selectAccount(id);
    },
    connectEvmWallet: evm.connect,
    connectSocial: async (id) => {
      await auth.login?.(`social-login:${id}`);
    },
    connectSolanaWallet: svm ? async (walletName) => {
      await svm.connect(walletName);
    } : void 0,
    connect: async (options) => {
      const requestedFamily = toRegistryFamily(options?.family);
      if (requestedFamily === "svm" && svm) {
        await svm.connect();
        return;
      }
      if (requestedFamily === "evm" && (evmAddress || registryEvmConnected)) {
        return;
      }
      await auth.login?.("auth-modal");
    },
    disconnect: async (options) => {
      if (options?.accountId) {
        const target = accounts.find((a) => a.id === options.accountId);
        if (target?.family === "evm") {
          await evm.disconnect(target.id);
        }
        if (target?.family === "svm") {
          await svm?.disconnect(target.id);
        }
        if (target && options.providerSignOut) {
          auth.startFlow?.("provider-logout");
          await auth.logout?.();
        }
        return;
      }
      const requestedFamily = options?.family ?? "all";
      const registryFamily = requestedFamily === "all" ? "all" : toRegistryFamily(requestedFamily);
      const wantsAll = requestedFamily === "all";
      auth.startFlow?.(wantsAll ? "provider-logout" : "family-disconnect");
      if (wantsAll) {
        registryStore.dispatch({
          type: "user/disconnect-family",
          family: "all",
          now: Date.now()
        });
        await auth.logout?.();
        return;
      }
      if (registryFamily === "evm") {
        await evm.disconnect();
        return;
      }
      await svm?.disconnect();
    },
    openAccountUI: async (options) => {
      const requestedFamily = toRegistryFamily(options?.family);
      if (requestedFamily === "svm" && svm && !svmIdentity?.address) {
        await svm.connect();
        return;
      }
      await auth.openAccountUI?.("account-modal", "ACCOUNT_MAIN");
    },
    switchChain: execution.evm.switchChainAsync ? async (chainId) => evm.selectNetwork(chainId) : void 0,
    selectNetwork: async (target) => {
      if (target.family === "evm") {
        await evm.selectNetwork(target.chainId);
        return;
      }
      await svm?.selectNetwork(target.networkId);
    }
  };
}

// src/lib/wallet-kit/composer/merge-wallet-rows.ts
function mergeWalletRows({
  accounts,
  storedWallets = [],
  canLinkWallet = false,
  auth,
  options = []
}) {
  const rows = accounts.map((account) => {
    const stored = storedWallets.find(
      (wallet) => wallet.family === account.family && walletKey(wallet.family, wallet.address) === walletKey(account.family, account.address)
    );
    const linked = account.linked ?? Boolean(stored);
    const actions = account.actions?.length ? account.actions.map((action) => ({
      kind: action.kind,
      label: action.label ?? (action.kind === "manage" ? "Manage" : action.kind === "signout" ? "Sign out" : "Disconnect")
    })) : defaultLiveWalletActions({ account, linked, canLinkWallet });
    return {
      id: account.id,
      family: account.family,
      address: account.address,
      chainId: account.chainId,
      label: account.label ?? account.walletName ?? account.address,
      walletName: account.walletName,
      source: "live",
      status: account.active ? "active" : "connected",
      provider: account.provider ?? stored?.provider,
      walletKind: account.walletKind ?? stored?.kind,
      linked,
      linkedVia: account.linkedVia ?? stored?.linkedVia,
      capability: account.capability ?? stored?.capability,
      manageable: account.manageable,
      actions
    };
  });
  const liveKeys = new Set(
    accounts.map((account) => walletKey(account.family, account.address))
  );
  for (const wallet of storedWallets) {
    if (liveKeys.has(walletKey(wallet.family, wallet.address))) continue;
    const embeddedSignedOut = wallet.kind === "embedded" && wallet.provider === auth?.provider && auth?.status !== "authenticated";
    rows.push({
      id: wallet.id,
      family: wallet.family,
      address: wallet.address,
      label: wallet.label ?? wallet.address,
      source: "stored",
      status: "stored",
      provider: wallet.provider,
      walletKind: wallet.kind,
      linked: true,
      capability: wallet.capability,
      actions: [
        embeddedSignedOut ? { kind: "authenticate", label: "Sign in" } : { kind: "connect", label: "Connect" }
      ]
    });
  }
  for (const option of options) {
    rows.push({
      id: option.id,
      family: option.family === "multichain" ? "evm" : toRegistryFamily(option.family),
      label: option.label,
      walletName: option.label,
      iconUrl: option.iconUrl,
      kind: option.kind,
      source: "option",
      status: option.status === "unavailable" ? "unavailable" : "available",
      provider: option.connectorId,
      actions: [
        {
          kind: option.kind === "social" ? "authenticate" : "connect",
          label: option.kind === "social" ? "Sign in" : "Connect"
        }
      ]
    });
  }
  return rows;
}
function defaultLiveWalletActions({
  account,
  linked,
  canLinkWallet
}) {
  const actions = [];
  const canLinkFamily = account.family === "evm" || account.family === "svm" && account.walletKind !== "embedded" && account.walletKind !== "smart_account";
  if (canLinkWallet && !linked && canLinkFamily) {
    actions.push({ kind: "link", label: "Link" });
  }
  actions.push(
    account.manageable ? { kind: "manage", label: "Manage" } : { kind: "disconnect", label: "Disconnect" }
  );
  return actions;
}

// src/lib/wallet-kit/composer/AomiWalletKitComposer.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function AomiWalletKitComposer({
  children,
  auth,
  evm,
  svm,
  execution,
  account = DISABLED_ACCOUNT_RUNTIME,
  additionalEvmWalletOptions = [],
  transformEvmIdentity,
  transformAccounts,
  canManageAccount,
  supportedChains
}) {
  const { user } = useUser2();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);
  const [evmIdentityGraceVersion, bumpEvmIdentityGrace] = useState(0);
  const { registryStore, registryState } = evm;
  const registryEvmIdentity = useMemo(() => {
    const identity = evm.identity(Date.now());
    return transformEvmIdentity ? transformEvmIdentity(identity) : identity;
  }, [evmIdentityGraceVersion, evm, transformEvmIdentity]);
  const gracefulEvmIdentity = {
    identity: registryEvmIdentity,
    disconnectedAt: registryState.evmGrace.disconnectedAt,
    usingCachedIdentity: Boolean(
      registryState.evmGrace.disconnectedAt && registryEvmIdentity.address
    )
  };
  useEffect2(() => {
    if (!gracefulEvmIdentity.usingCachedIdentity || gracefulEvmIdentity.disconnectedAt === null) {
      return;
    }
    const elapsed = Date.now() - gracefulEvmIdentity.disconnectedAt;
    const timeout = window.setTimeout(
      () => bumpEvmIdentityGrace((version) => version + 1),
      Math.max(0, EVM_IDENTITY_GRACE_MS - elapsed) + 1
    );
    return () => window.clearTimeout(timeout);
  }, [
    gracefulEvmIdentity.disconnectedAt,
    gracefulEvmIdentity.usingCachedIdentity
  ]);
  useEffect2(() => {
    if (registryState.phase !== "stable") return;
    const registryAddress = registryState.activeByFamily.evm?.address.toLowerCase() ?? null;
    const liveAddress = gracefulEvmIdentity.identity.address?.toLowerCase() ?? null;
    if (registryAddress === liveAddress) return;
    walletDebug("registry:shadow-diff", {
      registryAddress,
      liveAddress,
      registryActive: registryState.activeByFamily.evm
    });
  }, [
    gracefulEvmIdentity.identity.address,
    registryState.activeByFamily.evm,
    registryState.phase
  ]);
  const adapter = useMemo(() => {
    const address = gracefulEvmIdentity.identity.address;
    const effectiveChainId = gracefulEvmIdentity.identity.chainId;
    const svmIdentity = svm?.identity(Date.now());
    const registryEvmConnected = registryState.connections.some(
      (connection) => connection.family === "evm"
    );
    const isConnected = Boolean(
      auth.status === "authenticated" || registryEvmConnected || address || svmIdentity?.address
    );
    const isBooting = auth.status === "booting" && !isConnected;
    const solanaWalletDescriptors = svm?.options.map((option) => ({
      name: option.label,
      installed: Boolean(option.installed),
      ready: option.ready !== false && option.status !== "unavailable",
      iconUrl: option.iconUrl
    })) ?? [];
    const accounts = buildWalletKitAccounts({
      accounts: [
        ...evm.accounts(Date.now()),
        ...svm?.accounts(Date.now()) ?? []
      ],
      accountWallets: account.wallets,
      transformAccounts,
      canManageAccount
    });
    const evmWalletOptions = [...evm.options, ...additionalEvmWalletOptions];
    const svmWalletOptions = svm?.options.map((option) => ({
      ...option,
      family: "svm",
      kind: "solana"
    })) ?? [];
    const walletModalRows = mergeWalletRows({
      accounts,
      storedWallets: account.wallets,
      canLinkWallet: Boolean(account.linkWallet),
      auth,
      options: [...evmWalletOptions, ...svmWalletOptions, ...auth.methods]
    });
    const actions = buildWalletKitActions({
      accounts,
      auth,
      evm,
      svm,
      execution,
      registryStore,
      evmAddress: address,
      registryEvmConnected,
      svmIdentity
    });
    const hasAnyDisconnectablePath = Boolean(
      registryState.connections.length > 0 || svmIdentity?.address
    );
    const identity = buildWalletKitIdentity({
      auth,
      address,
      chainId: effectiveChainId ?? void 0,
      isBooting,
      isConnected,
      svm,
      aa: {
        aaMode: userAAMode ?? "none",
        SmartAccount4337: userSmartAccount4337 ?? void 0,
        Delegation7702: userDelegation7702 ?? void 0
      },
      sponsorship: {
        sponsored: execution.sponsorship.sponsored,
        sponsorProvider: execution.sponsorship.sponsorProvider,
        sponsorAccount: execution.sponsorship.sponsorAccount
      },
      walletName: gracefulEvmIdentity.identity.walletName,
      walletSource: gracefulEvmIdentity.identity.walletSource
    });
    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: evm.isSwitchingChain,
      canConnect: Boolean(auth.canOpenModal) || Boolean(solanaWalletDescriptors.length) || Boolean(evmWalletOptions.length),
      canOpenAccountUI: Boolean(auth.openAccountUI) && auth.status === "authenticated" && identity.isConnected,
      canDisconnect: hasAnyDisconnectablePath,
      accounts,
      walletModalRows,
      accountStatus: account.status,
      accountError: account.error,
      accountUser: account.user,
      accountLinkedAccounts: account.linkedAccounts,
      accountWallets: account.wallets,
      signOutAccount: account.signOut,
      deleteAccount: account.deleteAccount,
      updateAccount: account.updateAccount,
      linkWallet: account.linkWallet,
      updateLinkedAccount: account.updateAuthIdentity,
      updateLinkedWallet: account.updateWallet,
      unlinkLinkedWallet: account.unlinkWallet,
      unlinkLinkedAccount: account.unlinkAuthIdentity,
      selectAccount: actions.selectAccount,
      evmWallets: evmWalletOptions,
      connectEvmWallet: actions.connectEvmWallet,
      socialLoginOptions: auth.methods,
      connectSocial: actions.connectSocial,
      solanaWallets: solanaWalletDescriptors,
      connectSolanaWallet: actions.connectSolanaWallet,
      supportedChains,
      supportedNetworks: {
        evm: supportedChains,
        solana: svm?.supportedNetworks ?? []
      },
      selectedSolanaNetwork: svm?.selectedNetwork,
      solanaNetworkSwitchRequiresReconnect: Boolean(svmIdentity?.address),
      connect: actions.connect,
      disconnect: actions.disconnect,
      openAccountUI: actions.openAccountUI,
      switchChain: actions.switchChain,
      selectNetwork: actions.selectNetwork,
      sendTransaction: execution.evm.sendTransaction,
      signTypedData: execution.evm.signTypedData,
      signMessage: execution.evm.signMessage,
      signAaRequests: execution.evm.signAaRequests,
      getAccountCredential: auth.status === "authenticated" ? auth.getCredential : void 0,
      getAccountBearer: account.getAccountBearer,
      signSolanaTransaction: svm?.execution.signSolanaTransaction,
      signSolanaMessage: svm?.execution.signSolanaMessage,
      sendSolanaTransaction: svm?.execution.sendSolanaTransaction,
      signAndSendSolanaTransaction: svm?.execution.signAndSendSolanaTransaction,
      solanaRpcHttpUrl: svm?.execution.solanaRpcHttpUrl,
      solanaRpcWsUrl: svm?.execution.solanaRpcWsUrl
    };
  }, [
    auth,
    account.wallets,
    account.linkedAccounts,
    account.status,
    account.error,
    account.deleteAccount,
    account.updateAccount,
    account.linkWallet,
    account.updateAuthIdentity,
    account.unlinkWallet,
    account.unlinkAuthIdentity,
    account.updateWallet,
    account.user,
    account.getAccountBearer,
    additionalEvmWalletOptions,
    canManageAccount,
    evm,
    execution,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.walletName,
    registryStore,
    svm,
    supportedChains,
    transformAccounts,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337
  ]);
  return /* @__PURE__ */ jsx2(AomiWalletKitContextProvider, { value: adapter, children });
}

// src/lib/wallet-kit/runtime/evm/brands.ts
import { useEffect as useEffect3, useMemo as useMemo2, useRef, useState as useState2 } from "react";
var walletLabelOverrides = {
  base: "Base Account",
  baseaccount: "Base Account",
  coinbase: "Coinbase Wallet",
  coinbasewallet: "Coinbase Wallet",
  injected: "Browser wallet",
  metamask: "MetaMask",
  rabby: "Rabby",
  rainbow: "Rainbow",
  walletconnect: "WalletConnect"
};
function brandDisplayName(walletNameOrId) {
  if (!walletNameOrId) return "Wallet";
  const key = canonicalWalletKey(walletNameOrId);
  return walletLabelOverrides[key] ?? walletNameOrId;
}
var emptyInstalledWalletFlags = {
  metamask: false,
  rabby: false,
  coinbase: false,
  rainbow: false
};
function readInjectedValue(source, key) {
  if (!source || typeof source !== "object") return void 0;
  try {
    return source[key];
  } catch {
    return void 0;
  }
}
function readInjectedFlag(source, key) {
  return Boolean(readInjectedValue(source, key));
}
function detectInstalledWalletFlags() {
  if (typeof window === "undefined") return emptyInstalledWalletFlags;
  const hostWindow = window;
  const injected2 = readInjectedValue(hostWindow, "ethereum");
  const rabbyProvider = readInjectedValue(
    hostWindow,
    "rabby"
  );
  const injectedProviders = readInjectedValue(injected2, "providers") ?? [];
  const providers = [injected2, rabbyProvider, ...injectedProviders].filter(
    Boolean
  );
  return {
    metamask: providers.some(
      (provider) => readInjectedFlag(provider, "isMetaMask")
    ),
    rabby: Boolean(rabbyProvider) || providers.some((provider) => readInjectedFlag(provider, "isRabby")),
    coinbase: readInjectedFlag(hostWindow, "coinbaseWalletExtension") || providers.some(
      (provider) => readInjectedFlag(provider, "isCoinbaseWallet")
    ),
    rainbow: providers.some(
      (provider) => readInjectedFlag(provider, "isRainbow")
    )
  };
}
function mergeInstalledWalletFlags(current, next) {
  return {
    metamask: current.metamask || Boolean(next.metamask),
    rabby: current.rabby || Boolean(next.rabby),
    coinbase: current.coinbase || Boolean(next.coinbase),
    rainbow: current.rainbow || Boolean(next.rainbow)
  };
}
function flagsFromEip6963Provider(info) {
  const key = canonicalWalletKey(`${info.rdns ?? ""} ${info.name ?? ""}`);
  return {
    metamask: key === "metamask",
    rabby: key === "rabby",
    coinbase: key === "coinbase",
    rainbow: key === "rainbow"
  };
}
function useInstalledWalletFlags() {
  const [flags, setFlags] = useState2(
    () => detectInstalledWalletFlags()
  );
  useEffect3(() => {
    if (typeof window === "undefined") return;
    setFlags(
      (current) => mergeInstalledWalletFlags(current, detectInstalledWalletFlags())
    );
    const handleProvider = (event) => {
      const detail = event.detail;
      const info = detail?.info;
      if (!info) return;
      setFlags(
        (current) => mergeInstalledWalletFlags(current, flagsFromEip6963Provider(info))
      );
    };
    window.addEventListener("eip6963:announceProvider", handleProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => {
      window.removeEventListener("eip6963:announceProvider", handleProvider);
    };
  }, []);
  return flags;
}
function inferWalletLabel(connector) {
  const connectorName = connector.name?.trim() || connector.id || "Wallet";
  const normalized = walletLabelOverrides[normalizeWalletOptionId(connectorName)] ?? walletLabelOverrides[normalizeWalletOptionId(connector.id ?? "")];
  return normalized ?? connectorName;
}
function inferWalletKind(connector) {
  const key = normalizeWalletOptionId(
    `${connector.id ?? ""} ${connector.name ?? ""} ${connector.type ?? ""}`
  );
  return key.includes("walletconnect") ? "walletconnect" : "evm";
}
function connectorReady(connector) {
  return connector.ready;
}
function knownWalletInstalled(key, flags) {
  if (key === "metamask") return flags.metamask;
  if (key === "rabby") return flags.rabby;
  if (key === "coinbase") return flags.coinbase;
  if (key === "rainbow") return flags.rainbow;
  return void 0;
}
function toEvmWalletOption(connector, installedWalletFlags) {
  const id = connector.uid || connector.id || normalizeWalletOptionId(connector.name);
  const kind = inferWalletKind(connector);
  const ready = connectorReady(connector);
  const label = inferWalletLabel(connector);
  const knownInstalled = knownWalletInstalled(
    canonicalWalletKey(label),
    installedWalletFlags
  );
  const installed = ready === true || knownInstalled === true || knownInstalled === void 0 && connector.type === "injected";
  return {
    id,
    connectorId: connector.id,
    label,
    family: kind === "walletconnect" ? "multichain" : "evm",
    kind,
    status: kind === "walletconnect" ? "qr" : ready === false ? "unavailable" : installed ? "installed" : "available",
    installed,
    ready: ready !== false,
    description: kind === "walletconnect" ? "Scan with a mobile wallet" : "Connect an Ethereum wallet"
  };
}
function dedupeWalletOptions(options) {
  const byKey = /* @__PURE__ */ new Map();
  for (const option of options) {
    const key = canonicalWalletKey(option.label);
    const previous = byKey.get(key);
    if (!previous || optionIsMoreProviderSpecific(option, previous)) {
      byKey.set(key, option);
    }
  }
  return [...byKey.values()];
}
function optionIsMoreProviderSpecific(candidate, current) {
  const candidateId = candidate.connectorId ?? candidate.id;
  const currentId = current.connectorId ?? current.id;
  const candidateLooksRdns = candidateId.includes(".");
  const currentLooksRdns = currentId.includes(".");
  if (candidateLooksRdns !== currentLooksRdns) return candidateLooksRdns;
  if (candidate.status === "installed" && current.status !== "installed") {
    return true;
  }
  return false;
}
function walletOptionIsDetected(option) {
  if (option.status === "unavailable" || option.ready === false) return false;
  if (option.kind === "evm") {
    const key = canonicalWalletKey(`${option.id} ${option.label}`);
    if (key === "coinbase" || key === "basewallet" || key === "base") {
      return option.status === "installed" || option.status === "available";
    }
    return option.status === "installed";
  }
  return option.status === "installed" || option.status === "qr";
}
var socialLoginLabels = {
  APPLE: "Continue with Apple",
  DISCORD: "Continue with Discord",
  FACEBOOK: "Continue with Facebook",
  FARCASTER: "Continue with Farcaster",
  GITHUB: "Continue with GitHub",
  GOOGLE: "Email or Google",
  TELEGRAM: "Continue with Telegram",
  X: "Continue with X"
};
var socialLoginDescriptions = {
  GOOGLE: "Fast account sign-in"
};
function toSocialLoginOption(method) {
  const id = method.toLowerCase();
  return {
    id,
    label: socialLoginLabels[method] ?? `Continue with ${method}`,
    family: "multichain",
    kind: "social",
    status: "available",
    ready: true,
    description: socialLoginDescriptions[method] ?? "Create or use an Aomi account"
  };
}
function detectEvmProviderBrand(provider) {
  if (!provider || typeof provider !== "object") return void 0;
  if (readInjectedFlag(provider, "isRabby")) return "Rabby";
  if (readInjectedFlag(provider, "isPhantom")) return "Phantom";
  if (readInjectedFlag(provider, "isBraveWallet")) return "Brave Wallet";
  if (readInjectedFlag(provider, "isRainbow")) return "Rainbow";
  if (readInjectedFlag(provider, "isCoinbaseWallet")) {
    return "Coinbase Wallet";
  }
  if (readInjectedFlag(provider, "isMetaMask")) return "MetaMask";
  return void 0;
}
function useEvmProviderBrands(connections, connectors) {
  const [brands, setBrands] = useState2({});
  const membershipKey = useMemo2(
    () => connections.map((connection) => `${connection.connectorId}:${connection.address}`).sort().join("|"),
    [connections]
  );
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;
  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;
  useEffect3(() => {
    if (!membershipKey) {
      setBrands((previous) => Object.keys(previous).length ? {} : previous);
      return;
    }
    let cancelled = false;
    void Promise.all(
      connectionsRef.current.map(async (connection) => {
        const connector = connectorsRef.current.find(
          (candidate) => candidate.uid === connection.connectorId
        );
        if (!connector?.getProvider) return null;
        try {
          const provider = await connector.getProvider();
          const brand = detectEvmProviderBrand(provider);
          return brand ? [connection.connectorId, brand] : null;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setBrands(
        Object.fromEntries(
          entries.filter(
            (entry) => entry !== null
          )
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [membershipKey]);
  return brands;
}

// src/lib/wallet-kit/account/aomi-backend-runtime.ts
import { useCallback, useEffect as useEffect5, useMemo as useMemo4, useRef as useRef3, useState as useState3 } from "react";
import { buildSiwsMessage } from "@aomi-labs/client";

// src/lib/wallet-kit/account/aomi-backend-client.ts
var AomiAccountRequestError = class extends Error {
  constructor(status, code, signalType = null) {
    super(formatAccountRequestError(status, code, signalType));
    this.status = status;
    this.code = code;
    this.signalType = signalType;
    this.name = "AomiAccountRequestError";
  }
};
var DEFAULT_ENDPOINTS = {
  accountPath: "/api/aomi/account",
  signOutPath: "/api/aomi/sign-out",
  existingSessionProviderExchangePath: "/api/aomi/provider/exchange",
  newSessionProviderExchangePath: "/api/auth/aomi/provider/exchange",
  walletLinkPath: "/api/aomi/wallets/link",
  walletPath: (walletId) => `/api/aomi/wallets/${encodeURIComponent(walletId)}`,
  identityPath: (identityId) => `/api/aomi/identities/${encodeURIComponent(identityId)}`,
  siweNoncePath: "/api/auth/siwe/nonce",
  siweVerifyPath: "/api/auth/siwe/verify",
  siwsNoncePath: "/api/auth/siws/nonce",
  siwsVerifyPath: "/api/auth/siws/verify"
};
function createAomiBackendAccountClient(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const fetchImpl = input.fetch ?? fetch;
  const endpoints = { ...DEFAULT_ENDPOINTS, ...input.endpoints ?? {} };
  const auth = input.auth ?? { credentials: "include" };
  const urlFor = (path) => `${baseUrl}${path}`;
  const request = (path, init) => fetchJson(fetchImpl, urlFor(path), init, auth);
  const requestVoid = (path, init) => fetchVoid(fetchImpl, urlFor(path), init, auth);
  return {
    getAccount: () => request(endpoints.accountPath, {
      method: "GET"
    }),
    updateAccount: (body) => request(endpoints.accountPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    deleteAccount: () => request(endpoints.accountPath, {
      method: "DELETE"
    }),
    signOut: () => requestVoid(endpoints.signOutPath, { method: "POST" }),
    exchangeProviderCredential: (credential, options) => request(
      options.hasAccount ? endpoints.existingSessionProviderExchangePath : endpoints.newSessionProviderExchangePath,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential)
      }
    ),
    getWalletLinkNonce: (input2) => {
      const params = new URLSearchParams({
        address: input2.address,
        chainId: String(input2.chainId)
      });
      return request(
        `${endpoints.walletLinkPath}?${params.toString()}`,
        { method: "GET" }
      );
    },
    linkWallet: (body) => request(endpoints.walletLinkPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    updateWallet: (walletId, body) => requestVoid(endpoints.walletPath(walletId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    updateAuthIdentity: (identityId, body) => requestVoid(endpoints.identityPath(identityId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    unlinkWallet: (walletId) => requestVoid(endpoints.walletPath(walletId), { method: "DELETE" }),
    unlinkAuthIdentity: (identityId) => requestVoid(endpoints.identityPath(identityId), { method: "DELETE" }),
    createSiweNonce: (body) => request(endpoints.siweNoncePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    verifySiwe: (body) => requestVoid(endpoints.siweVerifyPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    createSiwsNonce: (body) => request(endpoints.siwsNoncePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    verifySiws: (body) => requestVoid(endpoints.siwsVerifyPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  };
}
async function sendAccountRequest(fetchImpl, url, init, auth) {
  const execute = async (forceRefresh) => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (auth.credentials === "omit") {
      const authorization = await auth.getAuthorization({ forceRefresh });
      if (!authorization)
        throw new Error("Widget authorization is unavailable");
      headers.set("Authorization", `Bearer ${authorization}`);
    }
    return fetchImpl(url, {
      ...init,
      credentials: auth.credentials ?? "include",
      headers
    });
  };
  let response = await execute(false);
  if (response.status === 401 && auth.credentials === "omit") {
    response = await execute(true);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const code = extractErrorCode(error);
    throw new AomiAccountRequestError(
      response.status,
      code,
      extractConflictSignal(error)
    );
  }
  return response;
}
async function fetchJson(fetchImpl, url, init, auth) {
  const response = await sendAccountRequest(fetchImpl, url, init, auth);
  if (response.status === 204 || response.status === 205) {
    throw new Error("Account request returned no content");
  }
  const body = await response.text();
  if (!body.trim()) {
    throw new Error("Account request returned an empty body");
  }
  return JSON.parse(body);
}
async function fetchVoid(fetchImpl, url, init, auth) {
  await sendAccountRequest(fetchImpl, url, init, auth);
}
function extractErrorCode(error) {
  if (!error || typeof error !== "object") return null;
  if ("error" in error && error.error) return String(error.error);
  if ("message" in error && error.message) return String(error.message);
  return null;
}
function extractConflictSignal(error) {
  if (!error || typeof error !== "object" || !("signalType" in error)) {
    return null;
  }
  const value = error.signalType;
  return value === "wallet" || value === "identity" || value === "email" ? value : null;
}
var CONFLICT_MESSAGES = {
  wallet: "This wallet address is already linked to another Aomi account. Sign in to that account, unlink the wallet there, then return here and link it.",
  identity: "This sign-in method is already linked to another Aomi account. Sign in to that account, unlink it there, then return here and link it.",
  email: "This email is already linked to another Aomi account. Sign in to that account, unlink it there, then return here and link it."
};
function formatAccountRequestError(status, code, signalType) {
  if (status === 409 && code === "already_linked_to_another_account") {
    return (signalType ? CONFLICT_MESSAGES[signalType] : void 0) ?? "This wallet or sign-in method is already linked to another Aomi account. Sign in to that account, unlink it there, then return here and link it.";
  }
  return code ?? `Request failed: ${status}`;
}
function normalizeBaseUrl(baseUrl) {
  return baseUrl?.replace(/\/+$/, "") ?? "";
}

// src/lib/wallet-kit/account/use-widget-session-provider.ts
import { useEffect as useEffect4, useMemo as useMemo3, useRef as useRef2 } from "react";
import {
  createProviderCredentialAdapter,
  createSiweWidgetAuthAdapter,
  createSiwsWidgetAuthAdapter,
  createWidgetSessionProvider
} from "@aomi-labs/client";

// src/lib/wallet-kit/account/encoding.ts
function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function hexToBase64(hex) {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  let binary = "";
  for (let index = 0; index < normalized.length; index += 2) {
    binary += String.fromCharCode(
      parseInt(normalized.slice(index, index + 2), 16)
    );
  }
  return btoa(binary);
}

// src/lib/wallet-kit/account/use-widget-session-provider.ts
function widgetCredentialsReady(input) {
  if (input.widgetAuth.mode === "provider") {
    return input.authStatus === "authenticated" && input.hasAuthCredential;
  }
  const connection = input.evm.activeEvmConnection;
  if (connection?.address && connection.chainId && input.evm.signMessageAsync) {
    return true;
  }
  const identity = input.svm?.identity(Date.now());
  return Boolean(identity?.address && input.svm?.execution.signSolanaMessage);
}
function useWidgetSessionProvider(input) {
  const { baseUrl, widgetAuth, auth, evm, svm } = input;
  const authStatus = auth.status;
  const authSubject = auth.subject;
  const hasAuthCredential = Boolean(auth.getCredential);
  const mode = widgetAuth?.mode;
  const provider = widgetAuth?.mode === "provider" ? widgetAuth.provider : void 0;
  const environment = widgetAuth?.mode === "provider" ? widgetAuth.environment : void 0;
  const credentialsReady = widgetAuth ? widgetCredentialsReady({
    widgetAuth,
    authStatus,
    hasAuthCredential,
    evm,
    svm
  }) : false;
  const authRef = useRef2(auth);
  const evmRef = useRef2(evm);
  const svmRef = useRef2(svm);
  authRef.current = auth;
  evmRef.current = evm;
  svmRef.current = svm;
  const widgetSessionProvider = useMemo3(() => {
    if (!widgetAuth || !baseUrl) return void 0;
    if (!credentialsReady) return void 0;
    let adapter;
    if (widgetAuth.mode === "provider") {
      const config = widgetAuth;
      adapter = createProviderCredentialAdapter({
        provider: config.provider,
        environment: config.environment,
        getCredential: async () => authRef.current.getCredential?.() ?? null,
        getSubject: () => authRef.current.subject ?? null,
        signOut: async () => authRef.current.logout?.()
      });
    } else {
      const currentWalletAdapter = () => {
        const evmRuntime = evmRef.current;
        const connection = evmRuntime.activeEvmConnection;
        const evmAddress = connection?.address;
        const evmChainId = connection?.chainId;
        const evmSignMessage = evmRuntime.signMessageAsync;
        if (evmAddress && evmChainId && evmSignMessage) {
          return createSiweWidgetAuthAdapter({
            getSigner: async () => ({
              address: evmAddress,
              chainId: evmChainId,
              signMessage: async (message) => evmSignMessage({ message })
            })
          });
        }
        const svmRuntime = svmRef.current;
        const identity = svmRuntime?.identity(Date.now());
        const svmAddress = identity?.address;
        const signMessage = svmRuntime?.execution.signSolanaMessage;
        if (svmAddress && signMessage) {
          return createSiwsWidgetAuthAdapter({
            getSigner: async () => ({
              address: svmAddress,
              chainId: svmRuntime?.selectedNetwork?.cluster ?? identity?.cluster ?? "solana:mainnet",
              signMessage: async (message) => (await signMessage({
                message: utf8ToBase64(message),
                cluster: svmRuntime?.selectedNetwork?.cluster ?? identity?.cluster
              })).signature
            })
          });
        }
        throw new Error(
          "Connect an external wallet to authenticate the widget"
        );
      };
      adapter = {
        getFingerprint: () => currentWalletAdapter().getFingerprint(),
        exchange: (options) => currentWalletAdapter().exchange(options)
      };
    }
    return createWidgetSessionProvider({ baseUrl, adapter });
  }, [
    baseUrl,
    authStatus,
    authSubject,
    hasAuthCredential,
    mode,
    environment,
    provider,
    credentialsReady
  ]);
  useEffect4(
    () => () => widgetSessionProvider?.dispose(),
    [widgetSessionProvider]
  );
  return widgetSessionProvider;
}

// src/lib/wallet-kit/account/aomi-backend-runtime.ts
var CREDENTIAL_EXCHANGE_FAILURE_COOLDOWN_MS = 3e4;
function useAomiBackendAccountRuntime(input) {
  const widgetSessionProvider = useWidgetSessionProvider({
    baseUrl: input.baseUrl,
    widgetAuth: input.widgetAuth,
    auth: input.auth,
    evm: input.evm,
    svm: input.svm
  });
  const accountClient = useMemo4(
    () => createAomiBackendAccountClient({
      baseUrl: input.baseUrl,
      auth: widgetSessionProvider ? { credentials: "omit", getAuthorization: widgetSessionProvider } : { credentials: "include" }
    }),
    [input.baseUrl, widgetSessionProvider]
  );
  const authMessageConfig = useMemo4(
    () => resolveAuthMessageConfig({
      baseUrl: input.baseUrl,
      authDomain: input.authDomain,
      authUri: input.authUri
    }),
    [input.authDomain, input.authUri, input.baseUrl]
  );
  const widgetSignedOut = Boolean(input.widgetAuth) && !widgetCredentialsReady({
    widgetAuth: input.widgetAuth,
    authStatus: input.auth.status,
    hasAuthCredential: Boolean(input.auth.getCredential),
    evm: input.evm,
    svm: input.svm
  });
  const [account, setAccount] = useState3(
    null
  );
  const [status, setStatus] = useState3(
    input.enabled ? widgetSignedOut ? "ready" : "loading" : "disabled"
  );
  const [errorVersion, setErrorVersion] = useState3(0);
  const [accountError, setAccountError] = useState3();
  const refreshContextKey = JSON.stringify([
    input.enabled,
    input.widgetAuth?.mode ?? "native",
    input.widgetAuth?.mode === "provider" ? input.widgetAuth.provider : "",
    input.widgetAuth?.mode === "provider" ? input.widgetAuth.environment : "",
    input.auth.status,
    input.auth.provider,
    input.auth.subject ?? "",
    input.evm.activeEvmConnection?.address ?? "",
    input.evm.activeEvmConnection?.chainId ?? "",
    input.svm?.identity(Date.now())?.address ?? "",
    input.svm?.selectedNetwork?.cluster ?? ""
  ]);
  const latestRefreshContext = useRef3({ accountClient, refreshContextKey });
  latestRefreshContext.current = { accountClient, refreshContextKey };
  const refreshInFlight = useRef3(null);
  const siweInFlight = useRef3(null);
  const siwsInFlight = useRef3(null);
  const walletLabelSyncInFlight = useRef3(null);
  const accountCreateInFlight = useRef3(null);
  const signedOutEvmKey = useRef3(null);
  const signedOutSvmKey = useRef3(null);
  const signedOutCredentialKey = useRef3(null);
  const credentialInFlight = useRef3(null);
  const credentialExchanged = useRef3(null);
  const providerSessionAttempted = useRef3(null);
  const credentialFailed = useRef3(null);
  const refresh = useCallback(async () => {
    if (!input.enabled) return;
    if (widgetSignedOut) {
      refreshInFlight.current = null;
      setAccount(null);
      setStatus("ready");
      return;
    }
    const existing = refreshInFlight.current;
    if (existing?.accountClient === accountClient && existing.contextKey === refreshContextKey) {
      return existing.promise;
    }
    const entry = {
      accountClient,
      contextKey: refreshContextKey,
      promise: Promise.resolve()
    };
    const run = (async () => {
      setStatus((current) => current === "ready" ? current : "loading");
      await Promise.resolve();
      try {
        const next = await accountClient.getAccount();
        const latest = latestRefreshContext.current;
        if (latest.accountClient !== accountClient || latest.refreshContextKey !== refreshContextKey) {
          return;
        }
        setAccount(next);
        setStatus("ready");
      } catch {
        const latest = latestRefreshContext.current;
        if (latest.accountClient !== accountClient || latest.refreshContextKey !== refreshContextKey) {
          return;
        }
        setStatus("error");
        setErrorVersion((version) => version + 1);
      } finally {
        if (refreshInFlight.current === entry) {
          refreshInFlight.current = null;
        }
      }
    })();
    entry.promise = run;
    refreshInFlight.current = entry;
    return run;
  }, [accountClient, input.enabled, refreshContextKey, widgetSignedOut]);
  useEffect5(() => {
    void refresh();
  }, [refresh]);
  useEffect5(() => {
    if (input.auth.status !== "authenticated") {
      signedOutCredentialKey.current = null;
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      providerSessionAttempted.current = null;
      credentialFailed.current = null;
      setAccountError(void 0);
    }
  }, [input.auth.status, input.auth.subject]);
  const activeEvmAddress = input.evm.activeEvmConnection?.address ?? input.evm.activeAccount?.address;
  const activeEvmChainId = input.evm.activeEvmConnection?.chainId ?? input.evm.activeAccount?.chainId;
  const activeEvmWalletName = activeEvmAddress ? resolveLinkedWalletName({
    accounts: input.evm.accounts(Date.now()),
    accountId: input.evm.activeAccount?.id,
    address: activeEvmAddress,
    fallbackWalletName: input.evm.activeAccount?.walletName ?? input.evm.activeEvmConnection?.walletName
  }) : void 0;
  const activeSvmIdentity = input.svm?.identity(Date.now());
  const activeSvmAccount = input.svm?.activeAccount;
  const activeSvmAddress = activeSvmAccount?.address ?? activeSvmIdentity?.address;
  const activeSvmCluster = input.svm?.selectedNetwork?.cluster ?? activeSvmIdentity?.cluster ?? "solana:mainnet";
  const activeSvmWalletName = activeSvmAccount?.walletName ?? activeSvmIdentity?.walletName;
  const activeSvmIsExternal = Boolean(
    activeSvmAddress && activeSvmAccount?.walletKind !== "embedded" && activeSvmAccount?.walletKind !== "smart_account" && activeSvmIdentity?.transport !== "embedded" && activeSvmIdentity?.walletSource !== "embedded"
  );
  const signSolanaMessage = input.svm?.execution.signSolanaMessage;
  useEffect5(() => {
    if (input.widgetAuth) void refresh();
  }, [
    activeEvmAddress,
    activeSvmAddress,
    input.auth.status,
    input.auth.subject,
    input.widgetAuth?.mode,
    refresh
  ]);
  useEffect5(() => {
    if (!account?.user || !activeEvmAddress) return;
    const brand = brandDisplayName(activeEvmWalletName);
    if (brand === "Wallet") return;
    const wallet = account.wallets.find(
      (candidate) => candidate.family === "evm" && candidate.address.toLowerCase() === activeEvmAddress.toLowerCase() && !candidate.label?.trim()
    );
    if (!wallet) return;
    const label = buildDefaultWalletLabel({
      walletName: brand,
      existingWallets: account.wallets,
      family: "evm"
    });
    const key = `${wallet.id}:${label}`;
    if (walletLabelSyncInFlight.current === key) return;
    walletLabelSyncInFlight.current = key;
    accountClient.updateWallet(wallet.id, { label }).then(refresh).catch(() => setErrorVersion((version) => version + 1)).finally(() => {
      if (walletLabelSyncInFlight.current === key) {
        walletLabelSyncInFlight.current = null;
      }
    });
  }, [account, accountClient, activeEvmAddress, activeEvmWalletName, refresh]);
  useEffect5(() => {
    if (!input.enabled || Boolean(input.widgetAuth) || status === "error" || account === null || account.user || !hasAuthMessageConfig(authMessageConfig)) {
      return;
    }
    if (!activeEvmAddress || !activeEvmChainId || !input.evm.signMessageAsync) {
      signedOutEvmKey.current = null;
      return;
    }
    const key = `${activeEvmAddress}:${activeEvmChainId}`;
    const authKey = authSessionKey(input.auth);
    if (input.auth.status === "authenticated" && input.auth.getCredential && providerSessionAttempted.current !== authKey) {
      return;
    }
    if (signedOutEvmKey.current === key) return;
    if (siweInFlight.current === key) return;
    if (accountCreateInFlight.current) return;
    siweInFlight.current = key;
    accountCreateInFlight.current = `siwe:${key}`;
    signInWithActiveEvmWallet({
      address: activeEvmAddress,
      accountClient,
      chainId: activeEvmChainId,
      signMessageAsync: input.evm.signMessageAsync,
      messageConfig: authMessageConfig
    }).then(refresh).catch(() => {
      signedOutEvmKey.current = key;
      setStatus("ready");
      setErrorVersion((version) => version + 1);
    }).finally(() => {
      siweInFlight.current = null;
      if (accountCreateInFlight.current === `siwe:${key}`) {
        accountCreateInFlight.current = null;
      }
    });
  }, [
    account,
    activeEvmAddress,
    activeEvmChainId,
    accountClient,
    authMessageConfig,
    input.enabled,
    input.evm.signMessageAsync,
    refresh,
    status
  ]);
  useEffect5(() => {
    if (!input.enabled || Boolean(input.widgetAuth) || status === "error" || account === null || account.user || !hasAuthMessageConfig(authMessageConfig)) {
      return;
    }
    if (!activeSvmAddress || !activeSvmIsExternal || !signSolanaMessage) {
      signedOutSvmKey.current = null;
      return;
    }
    const key = `${activeSvmAddress}:${activeSvmCluster}`;
    const authKey = authSessionKey(input.auth);
    if (input.auth.status === "authenticated" && input.auth.getCredential && providerSessionAttempted.current !== authKey) {
      return;
    }
    if (signedOutSvmKey.current === key) return;
    if (siwsInFlight.current === key) return;
    if (accountCreateInFlight.current) return;
    siwsInFlight.current = key;
    accountCreateInFlight.current = `siws:${key}`;
    authenticateSvmWallet({
      accountClient,
      address: activeSvmAddress,
      chainId: activeSvmCluster,
      intent: "sign-in",
      label: buildDefaultWalletLabel({
        walletName: activeSvmWalletName,
        existingWallets: [],
        family: "svm"
      }),
      messageConfig: authMessageConfig,
      signMessage: (message) => signMessageWithActiveSvm(signSolanaMessage, message, activeSvmCluster)
    }).then(refresh).catch(() => {
      signedOutSvmKey.current = key;
      setStatus("ready");
      setErrorVersion((version) => version + 1);
    }).finally(() => {
      siwsInFlight.current = null;
      if (accountCreateInFlight.current === `siws:${key}`) {
        accountCreateInFlight.current = null;
      }
    });
  }, [
    account,
    accountClient,
    activeSvmAddress,
    activeSvmCluster,
    activeSvmIsExternal,
    activeSvmWalletName,
    authMessageConfig,
    input.auth,
    input.enabled,
    refresh,
    signSolanaMessage,
    status
  ]);
  useEffect5(() => {
    if (!input.enabled || Boolean(input.widgetAuth) || status === "error" || input.auth.status !== "authenticated") {
      return;
    }
    if (!input.auth.getCredential) return;
    let cancelled = false;
    async function exchange() {
      const authKey = authSessionKey(input.auth);
      const credential = await input.auth.getCredential?.().catch(() => null);
      if (!credential || cancelled) {
        if (!cancelled) providerSessionAttempted.current = authKey;
        return;
      }
      const key = credentialKey(credential);
      const signedOutKey = authCredentialKey(input.auth, key);
      if (!account?.user && signedOutCredentialKey.current === signedOutKey) {
        providerSessionAttempted.current = authKey;
        return;
      }
      const hasAccount = Boolean(account?.user);
      const attemptKey = `${hasAccount ? "link" : "session"}:${account?.user?.id ?? "new"}:${key}`;
      if (!hasAccount && accountCreateInFlight.current) return;
      const failedAttempt = credentialFailed.current;
      if (credentialInFlight.current === attemptKey || credentialExchanged.current === attemptKey || failedAttempt?.attemptKey === attemptKey && Date.now() - failedAttempt.failedAt < CREDENTIAL_EXCHANGE_FAILURE_COOLDOWN_MS) {
        return;
      }
      credentialInFlight.current = attemptKey;
      if (!hasAccount) accountCreateInFlight.current = attemptKey;
      try {
        setAccountError(void 0);
        const result = await accountClient.exchangeProviderCredential(
          credential,
          { hasAccount }
        );
        credentialExchanged.current = attemptKey;
        if (result.account) setAccount(result.account);
        await refresh();
      } catch (error) {
        credentialFailed.current = { attemptKey, failedAt: Date.now() };
        if (error instanceof AomiAccountRequestError && error.status === 409 && error.code === "already_linked_to_another_account") {
          setAccountError(error.message);
        }
        setStatus("ready");
        setErrorVersion((version) => version + 1);
      } finally {
        providerSessionAttempted.current = authKey;
        if (credentialInFlight.current === attemptKey) {
          credentialInFlight.current = null;
        }
        if (accountCreateInFlight.current === attemptKey) {
          accountCreateInFlight.current = null;
        }
      }
    }
    void exchange();
    return () => {
      cancelled = true;
    };
  }, [
    account?.user,
    accountClient,
    input.auth,
    input.enabled,
    refresh,
    status
  ]);
  const liveAccounts = useMemo4(
    () => [
      ...input.evm.accounts(Date.now()),
      ...input.svm?.accounts(Date.now()) ?? []
    ],
    // `errorVersion` intentionally re-samples live wallet adapters after a
    // failed auth/account side effect, because the adapter object identities
    // can stay stable while their internal account snapshots changed.
    [errorVersion, input.evm, input.svm]
  );
  const liveWalletKeys = useMemo4(() => {
    const keys = /* @__PURE__ */ new Set();
    for (const acct of liveAccounts) {
      keys.add(walletAccountKey(acct.family, acct.address));
    }
    return keys;
  }, [liveAccounts]);
  const wallets = useMemo4(
    () => (account?.wallets ?? []).map((wallet) => {
      const key = walletAccountKey(wallet.family, wallet.address);
      return {
        ...normalizeAccountWalletProvider(wallet, liveAccounts),
        capability: liveWalletKeys.has(key) ? "write" : "read"
      };
    }),
    [account?.wallets, liveAccounts, liveWalletKeys]
  );
  return {
    status: input.enabled ? status : "disabled",
    error: accountError,
    user: account?.user ?? void 0,
    linkedAccounts: account?.linkedAccounts ?? [],
    wallets,
    getAccountBearer: widgetSessionProvider,
    refresh,
    signOut: async () => {
      if (activeEvmAddress && activeEvmChainId) {
        signedOutEvmKey.current = `${activeEvmAddress}:${activeEvmChainId}`;
      }
      if (activeSvmAddress && activeSvmIsExternal) {
        signedOutSvmKey.current = `${activeSvmAddress}:${activeSvmCluster}`;
      }
      if (!input.widgetAuth && input.auth.status === "authenticated" && input.auth.getCredential) {
        const credential = await input.auth.getCredential().catch(() => null);
        if (credential) {
          signedOutCredentialKey.current = authCredentialKey(
            input.auth,
            credentialKey(credential)
          );
        }
      }
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      providerSessionAttempted.current = null;
      credentialFailed.current = null;
      setAccountError(void 0);
      try {
        await accountClient.signOut();
      } finally {
        await widgetSessionProvider?.signOut();
      }
      setAccount({
        user: null,
        linkedAccounts: [],
        wallets: [],
        session: null
      });
      setStatus("ready");
    },
    deleteAccount: async () => {
      if (activeEvmAddress && activeEvmChainId) {
        signedOutEvmKey.current = `${activeEvmAddress}:${activeEvmChainId}`;
      }
      if (activeSvmAddress && activeSvmIsExternal) {
        signedOutSvmKey.current = `${activeSvmAddress}:${activeSvmCluster}`;
      }
      if (!input.widgetAuth && input.auth.status === "authenticated" && input.auth.getCredential) {
        const credential = await input.auth.getCredential().catch(() => null);
        if (credential) {
          signedOutCredentialKey.current = authCredentialKey(
            input.auth,
            credentialKey(credential)
          );
        }
      }
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      providerSessionAttempted.current = null;
      credentialFailed.current = null;
      setAccountError(void 0);
      try {
        await accountClient.deleteAccount();
      } finally {
        await widgetSessionProvider?.signOut();
      }
      setAccount({
        user: null,
        linkedAccounts: [],
        wallets: [],
        session: null
      });
      setStatus("ready");
    },
    updateAccount: async ({ displayName, avatarUrl }) => {
      await accountClient.updateAccount({ displayName, avatarUrl });
      await refresh();
    },
    linkWallet: async (wallet) => {
      if (wallet.family === "svm") {
        if (!activeSvmAddress || wallet.address !== activeSvmAddress || !activeSvmIsExternal || !signSolanaMessage) {
          throw new Error(
            "Wallet linking requires the active external Solana signer"
          );
        }
        const label = buildDefaultWalletLabel({
          walletName: activeSvmWalletName,
          existingWallets: account?.wallets ?? [],
          family: "svm"
        });
        await authenticateSvmWallet({
          accountClient,
          address: wallet.address,
          chainId: activeSvmCluster,
          intent: account?.user ? "link" : "sign-in",
          label,
          messageConfig: authMessageConfig,
          signMessage: (message2) => signMessageWithActiveSvm(
            signSolanaMessage,
            message2,
            activeSvmCluster
          )
        });
        await refresh();
        return;
      }
      if (!input.evm.signMessageForAccount && !input.evm.signMessageAsync) {
        throw new Error("Wallet linking requires an active EVM signer");
      }
      const chainId = wallet.chainId ?? activeEvmChainId;
      if (!chainId) throw new Error("Wallet linking requires an EVM chain id");
      if (!account?.user) {
        const accountId = wallet.accountId;
        const signMessageForAccount = input.evm.signMessageForAccount;
        await signInWithEvmWallet({
          accountClient,
          address: wallet.address,
          chainId,
          signMessage: accountId && signMessageForAccount ? (message2) => signMessageForAccount({
            accountId,
            chainId,
            message: message2
          }) : (message2) => signMessageWithActiveEvm(input.evm.signMessageAsync, message2),
          messageConfig: authMessageConfig
        });
        await refresh();
        return;
      }
      const nonceResult = await accountClient.getWalletLinkNonce({
        address: wallet.address,
        chainId
      });
      const message = buildWalletLinkMessage({
        address: wallet.address,
        chainId,
        nonce: nonceResult.nonce,
        ...messageConfigFromNonce(nonceResult, authMessageConfig)
      });
      const signature = wallet.accountId && input.evm.signMessageForAccount ? await input.evm.signMessageForAccount({
        accountId: wallet.accountId,
        chainId,
        message
      }) : await signMessageWithActiveEvm(input.evm.signMessageAsync, message);
      const defaultLabel = buildDefaultWalletLabel({
        walletName: resolveLinkedWalletName({
          accounts: input.evm.accounts(Date.now()),
          accountId: wallet.accountId,
          address: wallet.address,
          fallbackWalletName: input.evm.activeEvmConnection?.walletName
        }),
        existingWallets: account?.wallets ?? [],
        family: wallet.family
      });
      const body = {
        ...wallet,
        chainId,
        label: defaultLabel,
        message,
        signature,
        nonce: nonceResult.nonce
      };
      const result = await accountClient.linkWallet(body);
      if (result.account) setAccount(result.account);
      await refresh();
    },
    updateWallet: async ({ walletId, label }) => {
      await accountClient.updateWallet(walletId, { label });
      await refresh();
    },
    updateAuthIdentity: async ({ identityId, displayLabel }) => {
      await accountClient.updateAuthIdentity(identityId, { displayLabel });
      await refresh();
    },
    unlinkWallet: async (walletId) => {
      await accountClient.unlinkWallet(walletId);
      await refresh();
    },
    unlinkAuthIdentity: async (identityId) => {
      await accountClient.unlinkAuthIdentity(identityId);
      await refresh();
    }
  };
}
function walletAccountKey(family, address) {
  return family === "evm" ? `${family}:${address.toLowerCase()}` : `${family}:${address}`;
}
function normalizeAccountWalletProvider(wallet, liveAccounts) {
  const liveAccount = liveAccounts.find(
    (account) => account.family === wallet.family && walletAccountKey(account.family, account.address) === walletAccountKey(wallet.family, wallet.address)
  );
  const provider = liveAccount?.provider;
  const walletKind = liveAccount?.walletKind;
  if (provider && walletKind && walletKind !== "embedded" && walletKind !== "smart_account") {
    return wallet;
  }
  const inferredProvider = provider ?? providerLinkedWalletVia(wallet.linkedVia);
  if (!inferredProvider) return wallet;
  return {
    ...wallet,
    provider: wallet.provider ?? inferredProvider,
    kind: walletKind === "embedded" || walletKind === "smart_account" ? walletKind : wallet.kind ?? "embedded"
  };
}
function providerLinkedWalletVia(linkedVia) {
  if (linkedVia === "siwe" || linkedVia === "siws" || linkedVia === "challenge" || linkedVia === "import" || linkedVia === "observed" || linkedVia === "migration") {
    return null;
  }
  return linkedVia;
}
function credentialKey(credential) {
  return (JSON.stringify(credential) ?? "").slice(0, 96);
}
function authCredentialKey(auth, key) {
  return `${auth.provider}:${auth.subject ?? "unknown"}:${key}`;
}
function authSessionKey(auth) {
  return `${auth.provider}:${auth.subject ?? "unknown"}`;
}
function resolveLinkedWalletName(input) {
  const target = input.address.toLowerCase();
  const match = input.accounts.find(
    (candidate) => input.accountId !== void 0 && candidate.id === input.accountId || candidate.address?.toLowerCase() === target
  );
  return match?.walletName ?? input.fallbackWalletName;
}
function buildDefaultWalletLabel(input) {
  const brand = brandDisplayName(input.walletName);
  const sameBrand = input.existingWallets.filter(
    (wallet) => wallet.family === input.family && wallet.label?.toLowerCase().startsWith(brand.toLowerCase())
  ).length;
  return `${brand} ${sameBrand + 1}`;
}
async function signMessageWithActiveEvm(signMessageAsync, message) {
  if (!signMessageAsync) {
    throw new Error("Wallet linking requires an active EVM signer");
  }
  return await signMessageAsync({ message });
}
async function signInWithActiveEvmWallet(input) {
  await signInWithEvmWallet({
    accountClient: input.accountClient,
    address: input.address,
    chainId: input.chainId,
    signMessage: (message) => input.signMessageAsync({ message }),
    messageConfig: input.messageConfig
  });
}
async function signInWithEvmWallet(input) {
  const nonceResult = await input.accountClient.createSiweNonce({
    walletAddress: input.address,
    chainId: input.chainId
  });
  const message = buildSiweMessage({
    address: input.address,
    chainId: input.chainId,
    nonce: nonceResult.nonce,
    ...messageConfigFromNonce(nonceResult, input.messageConfig)
  });
  const signature = await input.signMessage(message);
  await input.accountClient.verifySiwe({
    message,
    signature,
    walletAddress: input.address,
    chainId: input.chainId
  });
}
async function signMessageWithActiveSvm(signMessage, message, chainId) {
  const result = await signMessage({
    message: utf8ToBase64(message),
    cluster: chainId,
    description: "Authorize this Solana wallet for your Aomi account."
  });
  return result.signature;
}
async function authenticateSvmWallet(input) {
  const nonceResult = await input.accountClient.createSiwsNonce({
    walletAddress: input.address,
    chainId: input.chainId,
    intent: input.intent
  });
  const message = buildSiwsMessage({
    address: input.address,
    chainId: input.chainId,
    nonce: nonceResult.nonce,
    intent: input.intent,
    ...messageConfigFromNonce(nonceResult, input.messageConfig)
  });
  const signature = await input.signMessage(message);
  await input.accountClient.verifySiws({
    message,
    signature,
    walletAddress: input.address,
    chainId: input.chainId,
    intent: input.intent,
    label: input.label
  });
}
function resolveAuthMessageConfig(input) {
  const base = absoluteUrl(input.baseUrl);
  const fallbackOrigin = base?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const fallbackDomain = base?.host ?? (typeof window !== "undefined" ? window.location.host : "");
  return {
    domain: normalizeDomain(input.authDomain) ?? fallbackDomain,
    uri: normalizeUri(input.authUri) ?? fallbackOrigin
  };
}
function buildSiweMessage(input) {
  const { domain, uri } = requireAuthMessageConfig(input);
  return `${domain} wants you to sign in with your Ethereum account:
${input.address}

Sign in to Aomi.

URI: ${uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${(/* @__PURE__ */ new Date()).toISOString()}`;
}
function buildWalletLinkMessage(input) {
  const { domain, uri } = requireAuthMessageConfig(input);
  return `${domain} wants to link this wallet to your Aomi account:
${input.address}

Only sign this message if you want this wallet attached to the current Aomi account.

URI: ${uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${(/* @__PURE__ */ new Date()).toISOString()}`;
}
function messageConfigFromNonce(nonce, fallback) {
  return completeAuthMessageConfig({
    domain: normalizeDomain(nonce.domain) ?? normalizeDomain(fallback.domain),
    uri: normalizeUri(nonce.uri) ?? normalizeUri(fallback.uri)
  });
}
function browserAuthMessageConfig() {
  if (typeof window === "undefined") {
    return { domain: "", uri: "" };
  }
  return {
    domain: window.location.host,
    uri: window.location.origin
  };
}
function requireAuthMessageConfig(input) {
  return completeAuthMessageConfig(input);
}
function completeAuthMessageConfig(input) {
  const browserFallback = browserAuthMessageConfig();
  const uri = normalizeUri(input.uri) ?? normalizeUri(browserFallback.uri) ?? deriveUriFromDomain(input.domain) ?? "http://localhost";
  const domain = normalizeDomain(input.domain) ?? normalizeDomain(uri) ?? normalizeDomain(browserFallback.domain) ?? "localhost";
  return { domain, uri };
}
function hasAuthMessageConfig(input) {
  const browserFallback = browserAuthMessageConfig();
  const domain = normalizeDomain(input.domain) ?? normalizeDomain(browserFallback.domain);
  const uri = normalizeUri(input.uri) ?? normalizeUri(browserFallback.uri) ?? deriveUriFromDomain(domain);
  return Boolean(domain && uri);
}
function absoluteUrl(value) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
function normalizeDomain(value) {
  const trimmed = value?.trim();
  if (!trimmed) return void 0;
  try {
    const host = new URL(trimmed).host.trim();
    if (host) return host;
  } catch {
  }
  return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "").trim() || void 0;
}
function normalizeUri(value) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return void 0;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return void 0;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return void 0;
  }
}
function deriveUriFromDomain(value) {
  const domain = normalizeDomain(value);
  if (!domain) return void 0;
  return domain.includes("localhost") || domain.startsWith("127.") ? `http://${domain}` : `https://${domain}`;
}

// src/lib/wallet-kit/account/use-resolved-account-runtime.ts
function useResolvedAccountRuntime(input) {
  const accountConfig = input.account !== false && input.account?.mode === "aomi-backend" ? input.account : null;
  const runtime = useAomiBackendAccountRuntime({
    enabled: Boolean(accountConfig),
    baseUrl: accountConfig?.baseUrl,
    authDomain: accountConfig?.authDomain,
    authUri: accountConfig?.authUri,
    widgetAuth: accountConfig?.widgetAuth,
    auth: input.auth,
    evm: input.evm,
    svm: input.svm
  });
  return accountConfig ? runtime : DISABLED_ACCOUNT_RUNTIME;
}

// src/lib/wallet-kit/execution/execution-runtime.ts
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs
} from "@aomi-labs/react";
import { serializeSignature } from "viem";

// src/lib/wallet-kit/execution/wallet-execution.ts
import { createPublicClient, http } from "viem";
import {
  aaModeFromExecutionKind,
  executeWalletCalls,
  toAAWalletCalls
} from "@aomi-labs/react";
function getPreferredRpcUrl(chain) {
  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http[0] ?? "";
}
function resolveRequestedAAMode(payload, isBatch) {
  if (payload.aaPreference === "none") return "none";
  if (!isBatch && !payload.aaStrict) return "none";
  if (payload.aaPreference === "eip4337") return "4337";
  return "7702";
}
function normalizeAtomicCapabilities(raw) {
  if (!raw) return void 0;
  const normalized = {};
  for (const [key, capability] of Object.entries(raw)) {
    normalized[key] = capability.atomic?.status === "ready" ? {
      ...capability,
      atomic: {
        ...capability.atomic,
        status: "supported"
      }
    } : capability;
  }
  return normalized;
}
async function waitForReceipt(state, chainId, hash) {
  if (state.waitForTransactionReceipt) {
    return state.waitForTransactionReceipt({ chainId, hash });
  }
  const chain = state.chainsById[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ${chainId}`);
  }
  const rpcUrl = (state.getPreferredRpcUrl ?? getPreferredRpcUrl)(chain);
  if (!rpcUrl) {
    throw new Error(`No RPC for chain ${chainId}`);
  }
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  }).waitForTransactionReceipt({ hash });
}
function transactionCallIds(payload) {
  if (payload.calls?.length) {
    return payload.calls.map((call) => call.txId);
  }
  return [payload.txId ?? payload.txIds?.[0] ?? 0];
}
function resolveNativeWalletExecutionPolicy({
  policy,
  chainId,
  requiresAtomicForBatch
}) {
  if (!policy && !requiresAtomicForBatch) {
    return void 0;
  }
  const sponsorship = policy?.sponsorship?.mode === "optional" || policy?.sponsorship?.mode === "required" ? {
    mode: policy.sponsorship.mode,
    paymasterServiceContext: policy.sponsorship.getPaymasterServiceContext?.(chainId),
    paymasterServiceUrl: policy.sponsorship.getPaymasterServiceUrl?.(chainId)
  } : policy?.sponsorship;
  return {
    executionKind: policy?.executionKind,
    requiresAtomicForBatch: requiresAtomicForBatch || policy?.requiresAtomicForBatch,
    sendCallsTimeoutMs: policy?.sendCallsTimeoutMs,
    sendCallsVersion: policy?.sendCallsVersion,
    sponsorship
  };
}
async function executeWalletKitTransaction({
  payload,
  state
}) {
  if (!payload.to && (!payload.calls || payload.calls.length === 0)) {
    throw new Error("pending_transaction_missing_call_data");
  }
  if (!state.sendTransactionAsync) {
    throw new Error("wallet_send_transaction_not_supported");
  }
  const sendTransactionAsync = state.sendTransactionAsync;
  const sendCallsSyncAsync = state.sendCallsSyncAsync;
  const switchChainAsync = state.switchChainAsync;
  const callList = toAAWalletCalls(
    payload,
    payload.chainId ?? state.currentChainId ?? 1
  );
  const isBatch = callList.length > 1;
  const aaRequestedMode = resolveRequestedAAMode(payload, isBatch);
  const requiresAtomicForBatch = isBatch && payload.aaStrict === true;
  const nativeWalletExecution = resolveNativeWalletExecutionPolicy({
    policy: state.nativeWalletExecution,
    chainId: callList[0]?.chainId ?? state.currentChainId ?? 1,
    requiresAtomicForBatch
  });
  const broadcastLegs = [];
  let revertedLegIndex = null;
  const callTxIds = transactionCallIds(payload);
  const sendSequentialTransaction = async (args) => {
    const previousSend = broadcastLegs[broadcastLegs.length - 1];
    if (previousSend) {
      const receipt = await waitForReceipt(
        state,
        previousSend.chainId,
        previousSend.hash
      );
      if (receipt.status === "reverted") {
        revertedLegIndex = broadcastLegs.length - 1;
        throw new Error("wallet_sequential_transaction_reverted");
      }
    }
    const hash = await sendTransactionAsync(args);
    broadcastLegs.push({ chainId: args.chainId, hash });
    return hash;
  };
  let execution;
  try {
    execution = await executeWalletCalls({
      callList,
      currentChainId: state.currentChainId ?? callList[0]?.chainId ?? 1,
      capabilities: state.capabilities,
      localPrivateKey: null,
      nativeWalletExecution,
      sendCallsSyncAsync: sendCallsSyncAsync ? async (args) => sendCallsSyncAsync(args) : async () => {
        throw new Error("wallet_send_calls_not_supported");
      },
      sendTransactionAsync: sendSequentialTransaction,
      switchChainAsync: switchChainAsync ? async ({ chainId }) => switchChainAsync({ chainId }) : async () => {
        throw new Error("wallet_switch_chain_not_supported");
      },
      chainsById: state.chainsById,
      getPreferredRpcUrl: state.getPreferredRpcUrl ?? getPreferredRpcUrl
    });
  } catch (error) {
    const landedLegCount = revertedLegIndex ?? broadcastLegs.length;
    const executedTxIds = callTxIds.slice(0, landedLegCount).filter((txId) => txId > 0);
    const lastLandedHash = broadcastLegs[landedLegCount - 1]?.hash;
    if (executedTxIds.length > 0 && lastLandedHash) {
      const failedTxId = callTxIds[landedLegCount];
      const remainingTxIds = callTxIds.slice(landedLegCount + 1).filter((txId) => txId > 0);
      const enrichedError = error instanceof Error ? error : new Error(String(error));
      Object.assign(enrichedError, {
        partial: {
          executedTxIds,
          lastTxHash: lastLandedHash,
          failedTxId: typeof failedTxId === "number" && failedTxId > 0 ? failedTxId : null,
          remainingTxIds
        }
      });
      throw enrichedError;
    }
    throw error;
  }
  if (!execution.txHash) {
    throw new Error("wallet_execution_missing_transaction_hash");
  }
  const aaResolvedMode = aaModeFromExecutionKind(execution.executionKind) ?? "none";
  return {
    txHash: execution.txHash,
    amount: payload.value,
    aaRequestedMode,
    aaResolvedMode,
    aaFallbackReason: aaRequestedMode !== "none" && aaResolvedMode === "none" ? "aa_unavailable_fallback_eoa" : void 0,
    executionKind: execution.executionKind,
    batched: execution.batched,
    callCount: callList.length,
    sponsored: execution.sponsored
  };
}

// src/lib/wallet-kit/execution/execution-runtime.ts
function buildEvmExecutionRuntime(evm, overrides) {
  const runtime = {
    activeConnector: evm.activeConnector,
    capabilities: evm.capabilities,
    chainsById: evm.chainsById,
    currentChainId: evm.activeEvmConnection?.chainId,
    getWalletClientFor: evm.getWalletClientFor,
    sendCallsSyncAsync: evm.sendCallsSyncAsync,
    sendTransactionAsync: evm.sendTransactionAsync,
    shouldUseExternalSigner: evm.shouldUseExternalSigner,
    signMessageAsync: evm.signMessageAsync,
    signTypedDataAsync: evm.signTypedDataAsync,
    switchChainAsync: evm.switchChainAsync,
    walletClient: evm.walletClient,
    ...overrides
  };
  const sendCallsSyncAsync = runtime.sendCallsSyncAsync;
  const sendTransactionAsync = runtime.sendTransactionAsync;
  const signTypedDataAsync = runtime.signTypedDataAsync;
  const switchChainAsync = runtime.switchChainAsync;
  const signAaRequests = async (payload) => {
    const active = evm.activeAccount;
    if (!active || active.address.toLowerCase() !== payload.signer.toLowerCase()) {
      throw new Error("The active wallet is not the prepared AA owner");
    }
    const walletClient = await runtime.getWalletClientFor({
      connector: runtime.activeConnector,
      chainId: payload.chain_id
    });
    const signatures = [];
    for (const request of payload.signature_requests) {
      if (request.kind === "personal_sign") {
        if (walletClient?.signMessage) {
          signatures.push(
            await walletClient.signMessage({
              account: payload.signer,
              // Alchemy's `signatureRequest.data.raw` is bytes, not the
              // textual characters "0x…". Viem must receive the raw form or
              // the recovered signer will not match `rawPayload`.
              message: { raw: request.message }
            })
          );
        } else {
          throw new Error("The active wallet cannot sign the AA UserOperation");
        }
      } else {
        if (!walletClient?.signAuthorization) {
          throw new Error(
            "The active wallet does not support EIP-7702 authorization"
          );
        }
        const authorization = await walletClient.signAuthorization({
          account: payload.signer,
          contractAddress: request.contract_address,
          chainId: request.chain_id,
          nonce: request.nonce
        });
        signatures.push(serializeSignature(authorization));
      }
    }
    return { signatures };
  };
  return {
    ...runtime,
    signAaRequests: runtime.signAaRequests ?? signAaRequests,
    sendTransaction: runtime.sendTransaction ?? (sendTransactionAsync ? async (payload) => executeWalletKitTransaction({
      payload,
      state: {
        currentChainId: runtime.currentChainId,
        capabilities: runtime.capabilities,
        nativeWalletExecution: runtime.nativeWalletExecution,
        sendCallsSyncAsync: sendCallsSyncAsync ? async (args) => sendCallsSyncAsync({
          ...args,
          connector: runtime.activeConnector
        }) : void 0,
        sendTransactionAsync: async (args) => sendTransactionAsync({
          ...args,
          connector: runtime.activeConnector
        }),
        switchChainAsync: switchChainAsync ? async ({ chainId }) => switchChainAsync({
          chainId,
          connector: runtime.activeConnector
        }) : void 0,
        chainsById: runtime.chainsById,
        getPreferredRpcUrl
      }
    }) : void 0),
    signTypedData: runtime.signTypedData ?? (signTypedDataAsync ? async (payload) => {
      const signArgs = toViemSignTypedDataArgs(payload);
      if (!signArgs) {
        throw new Error("Missing typed_data payload");
      }
      const signature = await signTypedDataAsync({
        ...signArgs,
        connector: runtime.activeConnector
      });
      return { signature };
    } : void 0),
    signMessage: runtime.signMessage ?? (evm.signMessageForAccount || runtime.signMessageAsync ? async (payload) => {
      const messageArgs = toViemSignMessageArgs(payload);
      if (!messageArgs) {
        throw new Error("Missing non_typed_data payload");
      }
      const activeAccountId = evm.activeAccount?.id;
      if (activeAccountId && evm.signMessageForAccount && typeof messageArgs.message === "string") {
        return {
          signature: await evm.signMessageForAccount({
            accountId: activeAccountId,
            message: messageArgs.message,
            chainId: runtime.currentChainId
          })
        };
      }
      if (!runtime.signMessageAsync) {
        throw new Error("No EVM signer available to sign message");
      }
      const signature = await runtime.signMessageAsync({
        ...messageArgs,
        connector: runtime.activeConnector
      });
      return { signature };
    } : void 0)
  };
}

// src/lib/wallet-kit/catalog/svm-networks.ts
var DEFAULT_SVM_CLUSTER = "solana:mainnet";
var DEFAULT_SVM_RPC_HTTP_URLS = {
  "solana:mainnet": "https://api.mainnet-beta.solana.com",
  "solana:devnet": "https://api.devnet.solana.com",
  "solana:testnet": "https://api.testnet.solana.com"
};
function getDefaultSvmNetworkLabel(cluster) {
  switch (cluster) {
    case "solana:mainnet":
      return "Solana";
    case "solana:testnet":
      return "Solana Testnet";
    case "solana:devnet":
    default:
      return "Solana Devnet";
  }
}
function buildLegacySvmNetwork(config) {
  const cluster = config?.cluster ?? DEFAULT_SVM_CLUSTER;
  return {
    id: cluster,
    label: getDefaultSvmNetworkLabel(cluster),
    cluster,
    rpcHttpUrl: config?.rpcHttpUrl ?? DEFAULT_SVM_RPC_HTTP_URLS[cluster],
    rpcWsUrl: config?.rpcWsUrl,
    isDefault: true
  };
}
function normalizeSvmNetworkOptions(config) {
  const rawNetworks = config?.networks;
  if (!rawNetworks || rawNetworks.length === 0) {
    return [buildLegacySvmNetwork(config)];
  }
  return rawNetworks.map((network, index) => ({
    id: network.id,
    label: network.label || getDefaultSvmNetworkLabel(network.cluster),
    cluster: network.cluster,
    rpcHttpUrl: network.rpcHttpUrl ?? DEFAULT_SVM_RPC_HTTP_URLS[network.cluster],
    rpcWsUrl: network.rpcWsUrl,
    isDefault: network.isDefault ?? (index === 0 && !rawNetworks.some((item) => item.isDefault))
  }));
}
function resolveSelectedSvmNetwork(networks, selectedNetworkId) {
  return networks.find((network) => network.id === selectedNetworkId) ?? networks.find((network) => network.isDefault) ?? networks[0];
}

// src/lib/wallet-kit/network-preferences.tsx
import {
  createContext as createContext2,
  useContext as useContext2,
  useEffect as useEffect6,
  useMemo as useMemo5,
  useState as useState4
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var STORAGE_PREFIX = "aomi.wallet-preferences";
function storageKey(key) {
  return `${STORAGE_PREFIX}.${key}`;
}
function loadWalletNetworkPreferences(key) {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(key));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const stored = parsed;
    return {
      selectedEvmChainId: typeof stored.selectedEvmChainId === "number" ? stored.selectedEvmChainId : void 0,
      selectedSolanaNetworkId: typeof stored.selectedSolanaNetworkId === "string" ? stored.selectedSolanaNetworkId : void 0
    };
  } catch {
    return {};
  }
}
function saveWalletNetworkPreferences(key, prefs) {
  try {
    globalThis.localStorage?.setItem(storageKey(key), JSON.stringify(prefs));
  } catch {
  }
}
var NetworkPreferencesContext = createContext2(null);
function AomiWalletNetworkPreferencesProvider({
  children,
  evmChains,
  solanaNetworks,
  storageKey: storageKey2 = "default"
}) {
  const [persisted] = useState4(() => loadWalletNetworkPreferences(storageKey2));
  const [selectedEvmChainId, setSelectedEvmChainId] = useState4(
    () => persisted.selectedEvmChainId !== void 0 && evmChains.some((chain) => chain.id === persisted.selectedEvmChainId) ? persisted.selectedEvmChainId : evmChains[0]?.id
  );
  const [selectedSolanaNetworkId, setSelectedSolanaNetworkId] = useState4(
    () => persisted.selectedSolanaNetworkId && solanaNetworks.some((n) => n.id === persisted.selectedSolanaNetworkId) ? persisted.selectedSolanaNetworkId : resolveSelectedSvmNetwork(solanaNetworks)?.id
  );
  useEffect6(() => {
    if (!evmChains.length) {
      setSelectedEvmChainId(void 0);
      return;
    }
    setSelectedEvmChainId(
      (current) => evmChains.some((chain) => chain.id === current) ? current : evmChains[0]?.id
    );
  }, [evmChains]);
  useEffect6(() => {
    if (!solanaNetworks.length) {
      setSelectedSolanaNetworkId(void 0);
      return;
    }
    setSelectedSolanaNetworkId(
      (current) => solanaNetworks.some((network) => network.id === current) ? current : resolveSelectedSvmNetwork(solanaNetworks)?.id
    );
  }, [evmChains.length, solanaNetworks]);
  useEffect6(() => {
    saveWalletNetworkPreferences(storageKey2, {
      selectedEvmChainId,
      selectedSolanaNetworkId
    });
  }, [storageKey2, selectedEvmChainId, selectedSolanaNetworkId]);
  const selectedSolanaNetwork = useMemo5(
    () => solanaNetworks.length ? resolveSelectedSvmNetwork(solanaNetworks, selectedSolanaNetworkId) : void 0,
    [selectedSolanaNetworkId, solanaNetworks]
  );
  const value = useMemo5(
    () => ({
      selectedEvmChainId,
      selectedSolanaNetworkId,
      supportedEvmChains: evmChains,
      supportedSolanaNetworks: solanaNetworks,
      selectedSolanaNetwork,
      setSelectedEvmChainId,
      setSelectedSolanaNetworkId,
      selectTarget: (target) => {
        if (target.family === "evm") {
          setSelectedEvmChainId(target.chainId);
          return;
        }
        setSelectedSolanaNetworkId(target.networkId);
      }
    }),
    [
      evmChains,
      selectedEvmChainId,
      selectedSolanaNetwork,
      selectedSolanaNetworkId,
      solanaNetworks
    ]
  );
  return /* @__PURE__ */ jsx3(NetworkPreferencesContext.Provider, { value, children });
}
function useAomiWalletNetworkPreferences() {
  const context = useContext2(NetworkPreferencesContext);
  if (!context) {
    throw new Error(
      "useAomiWalletNetworkPreferences must be used within AomiWalletNetworkPreferencesProvider"
    );
  }
  return context;
}
function useOptionalAomiWalletNetworkPreferences() {
  return useContext2(NetworkPreferencesContext);
}

// src/lib/wallet-kit/env.ts
function safeEnv(read) {
  try {
    return read();
  } catch {
    return void 0;
  }
}

// src/lib/wallet-kit/runtime/evm/wallet-runtime.ts
import { useCallback as useCallback2, useEffect as useEffect9, useMemo as useMemo9, useRef as useRef6 } from "react";

// src/lib/wallet-kit/registry/identity-grace.ts
function resolveGracefulEvmIdentity({
  current,
  previous,
  selectedChainId,
  disconnectedAt,
  now,
  graceMs,
  explicitDisconnect
}) {
  if (current.address) {
    return {
      identity: current,
      disconnectedAt: null,
      usingCachedIdentity: false
    };
  }
  if (!previous?.address || explicitDisconnect) {
    return {
      identity: current,
      disconnectedAt: null,
      usingCachedIdentity: false
    };
  }
  const startedAt = disconnectedAt ?? now;
  if (now - startedAt > graceMs) {
    return {
      identity: current,
      disconnectedAt: startedAt,
      usingCachedIdentity: false
    };
  }
  return {
    identity: {
      ...previous,
      chainId: selectedChainId ?? current.chainId ?? previous.chainId
    },
    disconnectedAt: startedAt,
    usingCachedIdentity: true
  };
}

// src/lib/wallet-kit/registry/selectors.ts
function selectSvm(state) {
  const active = state.activeByFamily.svm;
  if (active) {
    return state.connections.find(
      (connection) => connection.family === "svm" && connection.address === active.address && (!active.uid || connection.uid === active.uid)
    );
  }
  return state.connections.find((connection) => connection.family === "svm");
}
function findActiveConnection(state, family) {
  const active = state.activeByFamily[family];
  if (!active) return void 0;
  return state.connections.find((connection) => {
    if (connection.family !== family) return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    const left = family === "evm" ? connection.address.toLowerCase() : connection.address;
    const right = family === "evm" ? active.address.toLowerCase() : active.address;
    return left === right;
  });
}
function selectEvmIdentity(state, now, selectedChainId) {
  const activeConnection = findActiveConnection(state, "evm");
  const walletSource = activeConnection?.kind === "embedded-session" ? "embedded" : activeConnection?.kind === "walletconnect" ? "walletconnect" : void 0;
  const current = activeConnection ? {
    address: activeConnection.address,
    chainId: activeConnection.chainId ?? selectedChainId,
    connectorId: activeConnection.uid,
    walletName: activeConnection.walletName,
    walletSource
  } : {};
  const explicitDisconnect = Boolean(
    state.evmGrace.last?.address && state.intents.droppedAddresses.includes(
      state.evmGrace.last.address.toLowerCase()
    )
  );
  return resolveGracefulEvmIdentity({
    current,
    previous: state.evmGrace.last,
    selectedChainId,
    disconnectedAt: state.evmGrace.disconnectedAt,
    now,
    graceMs: EVM_IDENTITY_GRACE_MS,
    explicitDisconnect
  }).identity;
}
function selectSvmIdentity(state, _now) {
  const activeConnection = findActiveConnection(state, "svm") ?? selectSvm(state);
  return activeConnection ? {
    address: activeConnection.address,
    walletName: activeConnection.walletName
  } : {};
}
function selectAccounts(state, family, now, selectedChainId) {
  const activeEvm = family === "evm" ? state.activeByFamily.evm : void 0;
  const evmIdentity = family === "evm" ? selectEvmIdentity(state, now, selectedChainId) : {};
  const evmConnections = family === "evm" ? state.connections.filter((connection) => connection.family === "evm").map((connection) => ({
    id: connection.uid,
    walletName: connection.walletName ?? connection.stableId,
    address: connection.address,
    chainId: connection.chainId ?? selectedChainId,
    provider: connection.providerId,
    walletKind: connection.kind === "embedded-session" ? "embedded" : void 0
  })) : [];
  if (evmIdentity.address && evmConnections.length === 0) {
    evmConnections.push({
      id: evmIdentity.connectorId ?? "cached-evm",
      walletName: evmIdentity.walletName ?? "Wallet",
      address: evmIdentity.address,
      chainId: evmIdentity.chainId,
      provider: void 0,
      walletKind: void 0
    });
  }
  const activeSvm = family === "svm" ? selectSvm(state) : void 0;
  const svmConnections = family === "svm" ? state.connections.filter((connection) => connection.family === "svm") : [];
  return buildAccounts({
    evmConnections,
    activeEvmAddress: evmIdentity.address,
    activeEvmConnectionId: activeEvm?.uid ?? evmIdentity.connectorId,
    svmConnections: svmConnections.map((connection) => ({
      id: connection.uid,
      publicKey: connection.address,
      walletName: connection.walletName,
      provider: connection.providerId,
      walletKind: connection.kind === "embedded-session" ? "embedded" : void 0
    })),
    activeSvmAddress: activeSvm?.address
  });
}

// src/lib/wallet-kit/registry/use-wallet-registry.ts
import { useEffect as useEffect7, useMemo as useMemo6, useRef as useRef4, useSyncExternalStore } from "react";

// src/lib/wallet-kit/registry/policy.ts
function normalizeAddress(family, address) {
  return family === "evm" ? address.toLowerCase() : address;
}
function connectionToActive(connection) {
  return {
    family: connection.family,
    address: connection.address,
    uid: connection.uid,
    stableId: connection.stableId
  };
}
function matchesActive(connection, active, requireStableId) {
  if (connection.family !== active.family) return false;
  if (normalizeAddress(connection.family, connection.address) !== normalizeAddress(active.family, active.address)) {
    return false;
  }
  if (requireStableId && active.stableId) {
    return connection.stableId === active.stableId;
  }
  return true;
}
function findActiveConnection2(connections, active) {
  if (active.uid) {
    const byUid = connections.find(
      (connection) => connection.family === active.family && connection.uid === active.uid
    );
    if (byUid) return byUid;
  }
  if (active.stableId) {
    const byStableId = connections.find(
      (connection) => matchesActive(connection, active, true)
    );
    if (byStableId) return byStableId;
  }
  return connections.find(
    (connection) => matchesActive(connection, active, false)
  );
}
function connectionIsDropped(state, connection) {
  return connection.family === "evm" && state.intents.droppedAddresses.includes(connection.address.toLowerCase());
}
function resolveActive(state, family) {
  const familyConnections = state.connections.filter(
    (connection) => connection.family === family && !connectionIsDropped(state, connection)
  );
  const current = state.activeByFamily[family];
  if (current) {
    const live = findActiveConnection2(familyConnections, current);
    if (live) return connectionToActive(live);
    if (state.phase !== "stable") return current;
  }
  if (family === "evm") {
    const firstExternal = familyConnections.find(
      (connection) => connection.kind === "external-evm"
    );
    if (state.phase === "stable" && firstExternal) {
      return connectionToActive(firstExternal);
    }
    if (state.phase === "stable") {
      const embeddedSession = familyConnections.find(
        (connection) => connection.kind === "embedded-session"
      );
      return embeddedSession ? connectionToActive(embeddedSession) : void 0;
    }
    return void 0;
  }
  return familyConnections[0] ? connectionToActive(familyConnections[0]) : void 0;
}
function isDropped(state, address) {
  return state.intents.droppedAddresses.includes(address.toLowerCase());
}
function expectedIsLive(state, expected) {
  return state.connections.some(
    (connection) => connection.family === "evm" && connection.stableId === expected.stableId && connection.address.toLowerCase() === expected.address.toLowerCase()
  );
}
function expectedConnectorIsLive(state, expected) {
  return state.connections.some(
    (connection) => connection.family === "evm" && connection.stableId === expected.stableId
  );
}
function expectedIsHealEligible(state, expected, now) {
  if (state.intents.explicitFamilyDisconnect.evm) return false;
  if (isDropped(state, expected.address)) return false;
  if (expected.stableId === state.embeddedSession.stableId || expected.stableId === "walletConnect") {
    return false;
  }
  if (state.heal.suppressedUntil === null || now >= state.heal.suppressedUntil) {
    return true;
  }
  return state.heal.suppressionReason === "provider-social-login" || state.heal.suppressionReason === "provider-auth-modal" || state.heal.suppressionReason === "provider-evm-connect-fallback" || state.heal.suppressionReason === "provider-account-modal";
}
function expectedIsSilentReconnectEligible(state, expected) {
  if (state.intents.explicitFamilyDisconnect.evm) return false;
  if (isDropped(state, expected.address)) return false;
  return expected.stableId !== state.embeddedSession.stableId && expected.stableId !== "walletConnect";
}
function planHeal(state, now) {
  const missing = state.heal.expected.filter(
    (expected) => !expectedIsLive(state, expected) && !expectedConnectorIsLive(state, expected)
  );
  if (missing.length === 0) return [];
  const silentReconnectEligible = missing.filter(
    (expected) => expectedIsSilentReconnectEligible(state, expected)
  );
  if (silentReconnectEligible.length === 0) return [];
  if (state.phase !== "stable") {
    return [
      {
        kind: "wagmi/reconnect",
        stableIds: [
          ...new Set(
            silentReconnectEligible.map((expected) => expected.stableId)
          )
        ]
      },
      {
        kind: "debug",
        event: "evm:heal",
        data: {
          action: "reconnect",
          phase: state.phase,
          missing: silentReconnectEligible.length,
          suppressed: Boolean(
            state.heal.suppressedUntil !== null && now < state.heal.suppressedUntil
          )
        }
      }
    ];
  }
  const commands = [];
  let budget = state.heal.reattachBudget;
  for (const expected of missing) {
    if (budget <= 0) break;
    if (!expectedIsHealEligible(state, expected, now)) continue;
    if (!commands.some(
      (command) => command.kind === "wagmi/connect" && command.stableId === expected.stableId
    )) {
      commands.push({ kind: "wagmi/connect", stableId: expected.stableId });
    }
    budget -= 1;
  }
  if (commands.length > 0) {
    commands.push({
      kind: "debug",
      event: "evm:heal",
      data: { action: "connect", count: commands.length }
    });
  }
  return commands;
}
function countPlannedHealConnects(state, now) {
  return planHeal(state, now).filter(
    (command) => command.kind === "wagmi/connect"
  ).length;
}
function planDisconnect(state, event) {
  if (event.type === "user/disconnect-family") {
    const families = event.family === "all" ? ["evm", "svm"] : [event.family];
    const commands2 = [];
    if (families.includes("evm")) {
      for (const connection of state.connections) {
        if (connection.family === "evm" && connection.uid !== state.embeddedSession.uid) {
          commands2.push({ kind: "wagmi/disconnect", uid: connection.uid });
        }
      }
    }
    if (families.includes("svm")) {
      commands2.push({ kind: "svm/disconnect" });
    }
    if (event.family === "all") commands2.push({ kind: "provider/logout" });
    return commands2;
  }
  const commands = event.uids.map((uid) => ({
    kind: "wagmi/disconnect",
    uid
  }));
  if (event.isProviderOwnedAccount && !event.othersRemain) {
    commands.push({ kind: "provider/logout" });
  }
  return commands;
}

// src/lib/wallet-kit/registry/persistence.ts
var LEGACY_ACTIVE_EVM_ADDRESS_KEY = "aomi.wallet.active-evm-address";
var LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY = "aomi.wallet.detached-para-evm-address";
function isPersistedRegistryV1(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.version === 1 && typeof candidate.active === "object" && candidate.active !== null && Array.isArray(candidate.droppedAddresses) && (typeof candidate.providerSessionDetached === "boolean" || typeof candidate.paraDetached === "boolean");
}
function normalizePersisted(value) {
  const legacy = value;
  return {
    ...value,
    order: Array.isArray(value.order) ? value.order.filter((item) => {
      const family = item?.family;
      return item && (family === "evm" || family === "svm" || family === "solana") && typeof item.stableId === "string" && typeof item.address === "string";
    }).map((item) => {
      const family = item.family;
      const registryFamily = toRegistryFamily(family);
      return {
        family: registryFamily,
        stableId: item.stableId,
        address: registryFamily === "evm" ? item.address.toLowerCase() : item.address
      };
    }) : [],
    providerSessionDetached: value.providerSessionDetached ?? legacy.paraDetached ?? false
  };
}
function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
  }
}
function removeStorage(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
  }
}
function migrateLegacyKeys(storageKey2, options) {
  const legacyActiveEvm = readStorage(LEGACY_ACTIVE_EVM_ADDRESS_KEY);
  const legacyDetachedPara = readStorage(LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY);
  if (!legacyActiveEvm && !legacyDetachedPara) return null;
  const migrated = {
    version: 1,
    active: legacyActiveEvm ? { evm: { address: legacyActiveEvm.toLowerCase() } } : {},
    droppedAddresses: legacyDetachedPara ? [legacyDetachedPara.toLowerCase()] : [],
    order: [],
    providerSessionDetached: !!legacyDetachedPara
  };
  writeStorage(storageKey2, JSON.stringify(migrated));
  if (options.migrateDestructively) {
    removeStorage(LEGACY_ACTIVE_EVM_ADDRESS_KEY);
    removeStorage(LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY);
  }
  return migrated;
}
function loadPersisted(storageKey2 = REGISTRY_STORAGE_KEY, options = {}) {
  try {
    const raw = readStorage(storageKey2);
    if (!raw) return migrateLegacyKeys(storageKey2, options);
    const parsed = JSON.parse(raw);
    return isPersistedRegistryV1(parsed) ? normalizePersisted(parsed) : null;
  } catch {
    return null;
  }
}
function toPersisted(state) {
  return {
    version: 1,
    active: {
      ...state.activeByFamily.evm ? {
        evm: {
          address: state.activeByFamily.evm.address.toLowerCase(),
          stableId: state.activeByFamily.evm.stableId
        }
      } : {},
      ...state.activeByFamily.svm ? {
        svm: {
          address: state.activeByFamily.svm.address,
          stableId: state.activeByFamily.svm.stableId
        }
      } : {}
    },
    order: state.connectionOrder.map((item) => ({
      family: item.family,
      stableId: item.stableId,
      address: item.family === "evm" ? item.address.toLowerCase() : item.address
    })),
    droppedAddresses: state.intents.droppedAddresses.map(
      (item) => item.toLowerCase()
    ),
    providerSessionDetached: state.intents.providerSessionDetached
  };
}
function savePersisted(state, storageKey2 = REGISTRY_STORAGE_KEY) {
  writeStorage(storageKey2, JSON.stringify(toPersisted(state)));
}

// src/lib/wallet-kit/registry/commands.ts
function stableJson(value) {
  return JSON.stringify(value);
}
function persistableChanged(prev, next) {
  const prevPersisted = toPersisted(prev);
  const nextPersisted = toPersisted(next);
  return stableJson(prevPersisted) !== stableJson(nextPersisted);
}
function planCommands(prev, next, event) {
  const commands = [
    {
      kind: "debug",
      event: "registry:event",
      data: { type: event.type, phase: next.phase }
    }
  ];
  if (event.type === "wagmi/settled") {
    commands.push(
      ...planHeal(
        {
          ...next,
          phase: prev.phase,
          heal: {
            ...next.heal,
            reattachBudget: prev.heal.reattachBudget
          }
        },
        event.now
      )
    );
  }
  if (event.type === "user/disconnect-account" || event.type === "user/disconnect-family") {
    commands.push(...planDisconnect(prev, event));
  }
  if (event.type === "svm/connect-requested") {
    commands.push({ kind: "svm/connect", walletName: event.walletName });
  }
  if (event.type === "user/select-active") {
    commands.push({
      kind: "debug",
      event: "active-evm:user-select",
      data: {
        family: event.family,
        address: event.address,
        stableId: event.stableId
      }
    });
  }
  if (event.type === "boot/init" && next.activeByFamily.evm) {
    commands.push({
      kind: "debug",
      event: "active-evm:persisted",
      data: {
        address: next.activeByFamily.evm.address,
        stableId: next.activeByFamily.evm.stableId
      }
    });
  }
  if (persistableChanged(prev, next)) {
    commands.push({ kind: "persist" });
  }
  return commands;
}

// src/lib/wallet-kit/registry/reducer.ts
function createInitialState() {
  return {
    phase: "booting",
    connections: [],
    connectionOrder: [],
    activeByFamily: {},
    intents: {
      droppedAddresses: [],
      providerSessionDetached: false,
      explicitFamilyDisconnect: {},
      pendingSvmWallet: null,
      preferEmbeddedOnConnect: false
    },
    heal: {
      expected: [],
      reattachBudget: POPUP_REATTACH_BUDGET,
      suppressedUntil: null,
      suppressionReason: null
    },
    evmGrace: {
      last: null,
      disconnectedAt: null
    },
    embeddedSession: {
      up: false,
      providerId: null,
      uid: null,
      stableId: null,
      walletName: null,
      embeddedEvmAddress: null,
      chainId: null
    }
  };
}
function normalizeAddress2(family, address) {
  return family === "evm" ? address.toLowerCase() : address;
}
function connectionOrderItem(connection) {
  return {
    family: connection.family,
    stableId: connection.stableId,
    address: normalizeAddress2(connection.family, connection.address)
  };
}
function connectionOrderKey(item) {
  return `${item.family}:${item.stableId}:${normalizeAddress2(
    item.family,
    item.address
  )}`;
}
function reconcileConnectionOrder(previous, connections) {
  const liveKeys = new Set(connections.map(
    (connection) => connectionOrderKey(connectionOrderItem(connection))
  ));
  const next = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of previous) {
    const key = connectionOrderKey(item);
    if (!liveKeys.has(key) || seen.has(key)) continue;
    next.push({
      ...item,
      address: normalizeAddress2(item.family, item.address)
    });
    seen.add(key);
  }
  for (const connection of connections) {
    const item = connectionOrderItem(connection);
    const key = connectionOrderKey(item);
    if (seen.has(key)) continue;
    next.push(item);
    seen.add(key);
  }
  return next;
}
function applyConnectionOrder(connections, order) {
  if (connections.length < 2) return [...connections];
  const byKey = /* @__PURE__ */ new Map();
  for (const connection of connections) {
    const key = connectionOrderKey(connectionOrderItem(connection));
    const bucket = byKey.get(key);
    if (bucket) bucket.push(connection);
    else byKey.set(key, [connection]);
  }
  const ordered = [];
  for (const item of order) {
    const key = connectionOrderKey(item);
    const bucket = byKey.get(key);
    if (!bucket?.length) continue;
    ordered.push(...bucket);
    byKey.delete(key);
  }
  for (const connection of connections) {
    const key = connectionOrderKey(connectionOrderItem(connection));
    const bucket = byKey.get(key);
    if (!bucket?.length) continue;
    ordered.push(...bucket);
    byKey.delete(key);
  }
  return ordered;
}
function withConnectionOrder(state) {
  const baseOrder = state.connectionOrder.length > 0 ? state.connectionOrder : state.connections.map(connectionOrderItem);
  const connectionOrder = reconcileConnectionOrder(baseOrder, state.connections);
  return {
    ...state,
    connectionOrder,
    connections: applyConnectionOrder(state.connections, connectionOrder)
  };
}
function activeFromPersisted(persisted) {
  if (!persisted) return {};
  const active = {};
  if (persisted.active.evm?.address) {
    active.evm = {
      family: "evm",
      address: persisted.active.evm.address.toLowerCase(),
      stableId: persisted.active.evm.stableId
    };
  }
  const persistedSvm = persisted.active.svm ?? persisted.active.solana;
  if (persistedSvm?.address) {
    active.svm = {
      family: "svm",
      address: persistedSvm.address,
      stableId: persistedSvm.stableId
    };
  }
  return active;
}
function classifyConnection(connection, embeddedSession) {
  const stableId = connection.stableId;
  const kind = connection.family === "svm" ? "svm" : stableId === embeddedSession.stableId ? "embedded-session" : stableId === "walletConnect" ? "walletconnect" : "external-evm";
  const address = connection.family === "evm" ? connection.address.toLowerCase() : connection.address;
  return {
    ...connection,
    key: `${connection.family}:${connection.uid}`,
    kind,
    address,
    addresses: connection.family === "evm" ? connection.addresses.map((item) => item.toLowerCase()) : connection.addresses
  };
}
function withResolvedActive(state, families = ["evm", "svm"]) {
  const activeByFamily = { ...state.activeByFamily };
  for (const family of families) {
    const active = resolveActive(state, family);
    if (active) activeByFamily[family] = active;
    else delete activeByFamily[family];
  }
  return { ...state, activeByFamily };
}
function currentActiveEvmConnection(state) {
  const active = state.activeByFamily.evm;
  if (!active) return void 0;
  return state.connections.find((connection) => {
    if (connection.family !== "evm") return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    return connection.address.toLowerCase() === active.address.toLowerCase();
  });
}
function isSyntheticEmbeddedSessionConnection(state, connection) {
  return connection.kind === "embedded-session" && Boolean(state.embeddedSession.uid) && connection.uid === state.embeddedSession.uid;
}
function withoutSyntheticEmbeddedSessionConnection(state, connections) {
  return connections.filter(
    (connection) => !isSyntheticEmbeddedSessionConnection(state, connection)
  );
}
function hasEmbeddedSessionIdentity(session) {
  return Boolean(
    session.up && session.uid && session.stableId && session.walletName && session.embeddedEvmAddress
  );
}
function withEmbeddedSessionConnection(state) {
  const connections = withoutSyntheticEmbeddedSessionConnection(
    state,
    state.connections
  );
  const session = state.embeddedSession;
  if (!hasEmbeddedSessionIdentity(session) || state.intents.providerSessionDetached) {
    return withConnectionOrder({ ...state, connections });
  }
  const address = session.embeddedEvmAddress.toLowerCase();
  const hasLiveEmbeddedConnection = connections.some(
    (connection) => connection.family === "evm" && connection.stableId === session.stableId && connection.address.toLowerCase() === address.toLowerCase()
  );
  if (hasLiveEmbeddedConnection) {
    return withConnectionOrder({ ...state, connections });
  }
  return withConnectionOrder({
    ...state,
    connections: [
      ...connections,
      {
        key: `evm:${session.uid}`,
        family: "evm",
        uid: session.uid,
        stableId: session.stableId,
        kind: "embedded-session",
        address,
        addresses: [address],
        chainId: session.chainId ?? void 0,
        walletName: session.walletName,
        providerId: session.providerId ?? void 0
      }
    ]
  });
}
function withPreferredEmbeddedSessionActive(state) {
  if (!state.intents.preferEmbeddedOnConnect) return state;
  const embedded = state.connections.find(
    (connection) => connection.family === "evm" && connection.kind === "embedded-session"
  );
  if (!embedded) return state;
  return {
    ...state,
    activeByFamily: {
      ...state.activeByFamily,
      evm: {
        family: "evm",
        address: embedded.address,
        uid: embedded.uid,
        stableId: embedded.stableId
      }
    },
    intents: {
      ...state.intents,
      preferEmbeddedOnConnect: false
    }
  };
}
function withEvmGrace(previous, next, now) {
  const current = currentActiveEvmConnection(next);
  if (current) {
    return {
      ...next,
      evmGrace: {
        last: {
          address: current.address,
          chainId: current.chainId,
          connectorId: current.uid,
          walletName: current.walletName,
          walletSource: current.kind === "embedded-session" ? "embedded" : current.kind === "walletconnect" ? "walletconnect" : void 0
        },
        disconnectedAt: null
      }
    };
  }
  if (!previous.evmGrace.last) return next;
  return {
    ...next,
    evmGrace: {
      last: previous.evmGrace.last,
      disconnectedAt: previous.evmGrace.disconnectedAt ?? now
    }
  };
}
function externalHealExpected(connections) {
  const seen = /* @__PURE__ */ new Set();
  const expected = [];
  for (const connection of connections) {
    if (connection.family !== "evm" || connection.kind !== "external-evm") {
      continue;
    }
    const key = `${connection.stableId}:${connection.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    expected.push({
      stableId: connection.stableId,
      address: connection.address.toLowerCase()
    });
  }
  return expected;
}
function expectedIsLive2(connections, expected) {
  return connections.some(
    (connection) => connection.family === "evm" && connection.stableId === expected.stableId && connection.address.toLowerCase() === expected.address.toLowerCase()
  );
}
function expectedConnectorIsLive2(connections, expected) {
  return connections.some(
    (connection) => connection.family === "evm" && connection.stableId === expected.stableId
  );
}
function nextHealExpectedOnSettled(state) {
  const missingExpected = state.heal.expected.filter(
    (expected) => !expectedIsLive2(state.connections, expected) && !expectedConnectorIsLive2(state.connections, expected)
  );
  return missingExpected.length > 0 ? state.heal.expected : externalHealExpected(state.connections);
}
function addDroppedAddress(droppedAddresses, address) {
  const normalized = address.toLowerCase();
  return droppedAddresses.includes(normalized) ? [...droppedAddresses] : [...droppedAddresses, normalized];
}
function dropAddressMatches(active, address) {
  return !!active && active.address.toLowerCase() === address.toLowerCase();
}
function connectionSignature(connections) {
  return JSON.stringify(
    connections.map((connection) => ({
      family: connection.family,
      uid: connection.uid,
      stableId: connection.stableId,
      kind: connection.kind,
      address: connection.family === "evm" ? connection.address.toLowerCase() : connection.address,
      addresses: connection.addresses.map(
        (address) => connection.family === "evm" ? address.toLowerCase() : address
      ),
      chainId: connection.chainId ?? null,
      walletName: connection.walletName ?? null
    })).sort(
      (left, right) => `${left.family}:${left.uid}:${left.address}`.localeCompare(
        `${right.family}:${right.uid}:${right.address}`
      )
    )
  );
}
function reduce(state, event) {
  switch (event.type) {
    case "boot/init": {
      return {
        ...createInitialState(),
        connectionOrder: event.persisted?.order ?? [],
        activeByFamily: activeFromPersisted(event.persisted),
        intents: {
          droppedAddresses: event.persisted?.droppedAddresses.map(
            (item) => item.toLowerCase()
          ) ?? [],
          providerSessionDetached: event.persisted?.providerSessionDetached ?? false,
          explicitFamilyDisconnect: {},
          pendingSvmWallet: null,
          preferEmbeddedOnConnect: false
        }
      };
    }
    case "wagmi/connections-changed": {
      const connections = event.connections.map(
        (connection) => classifyConnection(connection, state.embeddedSession)
      );
      const currentEvmConnections = state.connections.filter(
        (connection) => connection.family === "evm"
      );
      if (connectionSignature(connections) === connectionSignature(currentEvmConnections)) {
        return state;
      }
      const nextPhase = state.phase === "stable" ? "settling" : state.phase;
      let next = withConnectionOrder({
        ...state,
        phase: nextPhase,
        connections: [
          ...connections,
          ...withoutSyntheticEmbeddedSessionConnection(
            state,
            state.connections
          ).filter((connection) => connection.family === "svm")
        ]
      });
      next = withEmbeddedSessionConnection(next);
      next = withPreferredEmbeddedSessionActive(next);
      if (state.phase === "stable") {
        next = {
          ...next,
          heal: {
            ...next.heal,
            expected: externalHealExpected(state.connections)
          }
        };
      }
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }
    case "wagmi/config-rebuilt":
      return {
        ...state,
        phase: "rebuilding",
        heal: {
          ...state.heal,
          expected: state.phase === "stable" ? externalHealExpected(state.connections) : state.heal.expected
        }
      };
    case "wagmi/brands-changed": {
      let changed = false;
      const connections = state.connections.map((connection) => {
        const walletName = event.brands[connection.uid] ?? connection.walletName;
        if (walletName !== connection.walletName) changed = true;
        return { ...connection, walletName };
      });
      if (!changed) return state;
      return {
        ...state,
        ...withConnectionOrder({ ...state, connections })
      };
    }
    case "wagmi/settled": {
      const stateForHeal = { ...state, phase: state.phase };
      const spentBudget = state.phase === "stable" ? countPlannedHealConnects(stateForHeal, event.now) : 0;
      let next = {
        ...state,
        phase: "stable",
        heal: {
          ...state.heal,
          expected: nextHealExpectedOnSettled(state),
          reattachBudget: Math.max(0, state.heal.reattachBudget - spentBudget)
        }
      };
      next = withResolvedActive(next);
      return withEvmGrace(state, next, event.now);
    }
    case "provider/embedded-session-changed": {
      let next = {
        ...state,
        phase: state.phase === "booting" ? "settling" : state.phase,
        embeddedSession: {
          up: event.up,
          providerId: event.providerId,
          uid: event.uid,
          stableId: event.stableId,
          walletName: event.walletName,
          embeddedEvmAddress: event.embeddedEvmAddress?.toLowerCase() ?? null,
          chainId: event.chainId ?? null
        }
      };
      next = withEmbeddedSessionConnection(next);
      next = withPreferredEmbeddedSessionActive(next);
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }
    case "provider/auth-flow-started":
      return {
        ...state,
        heal: {
          ...state.heal,
          suppressedUntil: event.now + REATTACH_SUPPRESSION_MS,
          suppressionReason: event.reason
        }
      };
    case "svm/changed": {
      const uid = event.uid ?? event.walletName ?? event.publicKey;
      const stableId = event.stableId ?? uid;
      const connections = state.connections.filter(
        (connection) => connection.family !== "svm" || (event.stableId ? connection.stableId !== event.stableId : connection.kind !== "svm")
      );
      const pendingConnected = event.publicKey && state.intents.pendingSvmWallet && event.walletName === state.intents.pendingSvmWallet;
      if (event.publicKey && uid && stableId) {
        connections.push({
          key: `solana:${uid}`,
          family: "svm",
          uid,
          stableId,
          kind: event.kind ?? "svm",
          address: event.publicKey,
          addresses: [event.publicKey],
          walletName: event.walletName ?? void 0,
          providerId: event.providerId
        });
      }
      let next = withConnectionOrder({
        ...state,
        connections,
        intents: {
          ...state.intents,
          pendingSvmWallet: pendingConnected ? null : state.intents.pendingSvmWallet
        }
      });
      if (pendingConnected && event.publicKey) {
        next = {
          ...next,
          activeByFamily: {
            ...next.activeByFamily,
            svm: {
              family: "svm",
              address: event.publicKey,
              uid: uid ?? event.publicKey,
              stableId: stableId ?? event.publicKey
            }
          }
        };
      }
      return withResolvedActive(next, ["svm"]);
    }
    case "svm/connect-requested":
      return {
        ...state,
        intents: {
          ...state.intents,
          pendingSvmWallet: event.walletName
        }
      };
    case "svm/connect-settled":
      if (state.intents.pendingSvmWallet !== event.walletName) return state;
      return {
        ...state,
        intents: {
          ...state.intents,
          pendingSvmWallet: null
        }
      };
    case "user/select-active":
      return {
        ...state,
        activeByFamily: {
          ...state.activeByFamily,
          [event.family]: {
            family: event.family,
            address: event.family === "evm" ? event.address.toLowerCase() : event.address,
            uid: event.uid,
            stableId: event.stableId
          }
        },
        intents: {
          ...state.intents,
          preferEmbeddedOnConnect: false,
          explicitFamilyDisconnect: {
            ...state.intents.explicitFamilyDisconnect,
            [event.family]: false
          }
        }
      };
    case "user/connect-succeeded":
      return {
        ...state,
        activeByFamily: {
          ...state.activeByFamily,
          [event.family]: {
            family: event.family,
            address: event.family === "evm" ? event.address.toLowerCase() : event.address,
            uid: event.uid,
            stableId: event.stableId
          }
        },
        intents: {
          ...state.intents,
          droppedAddresses: event.family === "evm" ? state.intents.droppedAddresses.filter(
            (address) => address !== event.address.toLowerCase()
          ) : state.intents.droppedAddresses,
          providerSessionDetached: event.family === "evm" && event.stableId === state.embeddedSession.stableId ? false : state.intents.providerSessionDetached,
          explicitFamilyDisconnect: {
            ...state.intents.explicitFamilyDisconnect,
            [event.family]: false
          },
          preferEmbeddedOnConnect: false
        }
      };
    case "user/provider-reconnect-requested":
      return withPreferredEmbeddedSessionActive(
        withEmbeddedSessionConnection({
          ...state,
          intents: {
            ...state.intents,
            providerSessionDetached: false,
            preferEmbeddedOnConnect: true
          }
        })
      );
    case "user/disconnect-account": {
      const filtered = state.connections.filter(
        (connection) => !event.uids.includes(connection.uid)
      );
      const activeByFamily = { ...state.activeByFamily };
      if (dropAddressMatches(activeByFamily.evm, event.address)) {
        delete activeByFamily.evm;
      }
      let next = withConnectionOrder({
        ...state,
        connections: withoutSyntheticEmbeddedSessionConnection(state, filtered),
        activeByFamily,
        intents: {
          ...state.intents,
          droppedAddresses: event.markDroppedAddress ?? true ? addDroppedAddress(state.intents.droppedAddresses, event.address) : [...state.intents.droppedAddresses],
          providerSessionDetached: event.isProviderOwnedAccount && event.othersRemain ? true : state.intents.providerSessionDetached
        }
      });
      next = withEmbeddedSessionConnection(next);
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }
    case "user/disconnect-family": {
      const activeByFamily = { ...state.activeByFamily };
      const explicitFamilyDisconnect = {
        ...state.intents.explicitFamilyDisconnect
      };
      const disconnectsEvm = event.family === "all" || event.family === "evm";
      const disconnectsSvm = event.family === "all" || event.family === "svm";
      if (disconnectsEvm) {
        delete activeByFamily.evm;
        explicitFamilyDisconnect.evm = true;
      }
      if (disconnectsSvm) {
        delete activeByFamily.svm;
        explicitFamilyDisconnect.svm = true;
      }
      let connections = state.connections;
      if (disconnectsEvm) {
        connections = withoutSyntheticEmbeddedSessionConnection(
          state,
          connections
        );
      }
      if (disconnectsSvm) {
        connections = connections.filter(
          (connection) => connection.family !== "svm"
        );
      }
      let next = withConnectionOrder({
        ...state,
        activeByFamily,
        evmGrace: disconnectsEvm ? { last: null, disconnectedAt: null } : state.evmGrace,
        connections,
        intents: {
          ...state.intents,
          explicitFamilyDisconnect,
          providerSessionDetached: disconnectsEvm ? true : state.intents.providerSessionDetached
        }
      });
      next = withEmbeddedSessionConnection(next);
      return next;
    }
    default:
      return state;
  }
}

// src/lib/wallet-kit/registry/store.ts
var WalletRegistryStore = class {
  constructor(opts) {
    this.subscribers = /* @__PURE__ */ new Set();
    this.settleTimer = null;
    this.executors = opts.executors;
    this.storageKey = opts.storageKey;
    const prev = createInitialState();
    const event = {
      type: "boot/init",
      persisted: loadPersisted(opts.storageKey, { migrateDestructively: true }),
      now: opts.initialNow
    };
    this.state = reduce(prev, event);
    for (const command of planCommands(prev, this.state, event)) {
      this.executeCommand(command);
    }
  }
  getSnapshot() {
    return this.state;
  }
  subscribe(cb) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }
  updateExecutors(executors) {
    this.executors = { ...this.executors, ...executors };
  }
  dispatch(event) {
    const prev = this.state;
    const next = reduce(prev, event);
    if (next === prev) return;
    this.state = next;
    for (const subscriber of this.subscribers) subscriber();
    const commands = planCommands(prev, next, event);
    for (const command of commands) {
      this.executeCommand(command);
    }
    if (event.type.startsWith("wagmi/") && event.type !== "wagmi/settled") {
      this.scheduleSettledPass(SETTLE_QUIET_MS);
    }
  }
  dispose() {
    if (this.settleTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.settleTimer);
    }
    this.settleTimer = null;
  }
  executeCommand(command) {
    switch (command.kind) {
      case "persist":
        savePersisted(this.state, this.storageKey);
        break;
      case "debug":
        walletDebug(command.event, command.data);
        break;
      case "wagmi/reconnect":
        this.runAsync(command.kind, async () => {
          try {
            await this.executors.wagmiReconnect(command.stableIds);
          } finally {
            this.scheduleSettledPass(this.reconnectSettleDelayMs());
          }
        });
        break;
      case "wagmi/connect":
        this.runAsync(
          command.kind,
          () => this.executors.wagmiConnect(command.stableId)
        );
        break;
      case "wagmi/disconnect":
        this.runAsync(
          command.kind,
          () => this.executors.wagmiDisconnect(command.uid)
        );
        break;
      case "svm/connect":
        if (this.executors.svmConnect) {
          this.runAsync(
            command.kind,
            () => this.executors.svmConnect(command.walletName)
          );
        }
        break;
      case "svm/disconnect":
        if (this.executors.svmDisconnect) {
          this.runAsync(command.kind, () => this.executors.svmDisconnect());
        }
        break;
      case "provider/logout":
        this.runAsync(command.kind, () => this.executors.providerLogout());
        break;
      default:
        break;
    }
  }
  runAsync(kind, fn) {
    void fn().catch((error) => {
      walletDebug("registry:command-error", {
        kind,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }
  reconnectSettleDelayMs() {
    const authFlowSuppressed = this.state.heal.suppressedUntil !== null && Date.now() < this.state.heal.suppressedUntil && (this.state.heal.suppressionReason === "provider-social-login" || this.state.heal.suppressionReason === "provider-auth-modal" || this.state.heal.suppressionReason === "provider-evm-connect-fallback" || this.state.heal.suppressionReason === "provider-account-modal");
    return authFlowSuppressed ? AUTH_FLOW_RECONNECT_SETTLE_MS : SETTLE_QUIET_MS;
  }
  scheduleSettledPass(delayMs) {
    const run = () => {
      this.settleTimer = null;
      this.dispatch({ type: "wagmi/settled", now: Date.now() });
    };
    if (typeof window === "undefined") {
      queueMicrotask(run);
      return;
    }
    if (this.settleTimer !== null) {
      window.clearTimeout(this.settleTimer);
    }
    this.settleTimer = window.setTimeout(run, delayMs);
  }
};

// src/lib/wallet-kit/registry/use-wallet-registry.ts
function useWalletRegistry(opts) {
  const executorsRef = useRef4(opts.executors);
  useEffect7(() => {
    executorsRef.current = opts.executors;
  }, [opts.executors]);
  const store = useMemo6(
    () => new WalletRegistryStore({
      executors: {
        wagmiReconnect: (stableIds) => executorsRef.current.wagmiReconnect(stableIds),
        wagmiConnect: (stableId) => executorsRef.current.wagmiConnect(stableId),
        wagmiDisconnect: (uid) => executorsRef.current.wagmiDisconnect(uid),
        providerLogout: () => executorsRef.current.providerLogout()
      },
      storageKey: opts.storageKey,
      initialNow: Date.now()
    }),
    [opts.storageKey]
  );
  useEffect7(() => () => store.dispose(), [store]);
  const state = useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => store.getSnapshot(),
    () => store.getSnapshot()
  );
  return { store, state };
}

// src/lib/wallet-kit/runtime/evm/disconnect-plan.ts
function planEvmAccountDisconnect({
  target,
  connections
}) {
  const targetAddress = target.address.toLowerCase();
  const isProviderOwnedAccount = Boolean(target.manageable);
  const targetConnectorIds = new Set(
    isProviderOwnedAccount ? [target.id] : [target.id, ...target.connectorIds ?? []]
  );
  const connectorIds = /* @__PURE__ */ new Set();
  for (const connection of connections) {
    if (connection.address.toLowerCase() !== targetAddress) continue;
    if (!targetConnectorIds.has(connection.connectorId)) continue;
    connectorIds.add(connection.connectorId);
  }
  if (connectorIds.size === 0) {
    connectorIds.add(target.id);
  }
  const remainingConnections = connections.filter(
    (connection) => !connectorIds.has(connection.connectorId)
  );
  const sameAddressConnectionsRemain = remainingConnections.some(
    (connection) => connection.address.toLowerCase() === targetAddress
  );
  return {
    connectorIds,
    isProviderOwnedAccount,
    otherConnectionsRemain: remainingConnections.length > 0,
    sameAddressConnectionsRemain,
    shouldMarkDroppedAddress: !sameAddressConnectionsRemain,
    targetAddress
  };
}

// src/lib/wallet-kit/runtime/evm/registry-source.ts
import { useEffect as useEffect8, useMemo as useMemo8, useRef as useRef5 } from "react";

// src/lib/wallet-kit/runtime/evm/safe-hooks.ts
import { useMemo as useMemo7 } from "react";
import { getWalletClient } from "wagmi/actions";
import {
  useCapabilities,
  useConfig,
  useConnect,
  useConnections,
  useConnectors,
  useDisconnect,
  useReconnect,
  useSendCallsSync,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useSwitchAccount,
  useSwitchChain,
  useWalletClient
} from "wagmi";
var DISCONNECTED_WAGMI_CONFIG = {
  chains: [],
  connectors: []
};
function useSafeWalletClient() {
  try {
    const { data } = useWalletClient();
    return { walletClient: data };
  } catch {
    return { walletClient: void 0 };
  }
}
function useSafeGetWalletClientFor() {
  try {
    const config = useConfig();
    return async ({ connector, chainId }) => {
      if (!connector) return null;
      try {
        return await getWalletClient(config, { connector, chainId });
      } catch (error) {
        walletDebug("aa:wallet-client-failed", {
          connector: connector.id,
          chainId,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    };
  } catch {
    return async () => null;
  }
}
function useSafeWagmiConfig() {
  try {
    const config = useConfig();
    return {
      chains: config.chains ?? [],
      connectors: config.connectors ?? []
    };
  } catch {
    return DISCONNECTED_WAGMI_CONFIG;
  }
}
function useSafeSwitchChain() {
  try {
    const result = useSwitchChain();
    return {
      switchChainAsync: result.switchChainAsync,
      isPending: result.isPending
    };
  } catch {
    return {
      switchChainAsync: void 0,
      isPending: false
    };
  }
}
function useSafeSendTransaction() {
  try {
    return useSendTransaction();
  } catch {
    return { sendTransactionAsync: void 0 };
  }
}
function useSafeSignTypedData() {
  try {
    return useSignTypedData();
  } catch {
    return { signTypedDataAsync: void 0 };
  }
}
function useSafeSignMessage() {
  try {
    return useSignMessage();
  } catch {
    return { signMessageAsync: void 0 };
  }
}
function useSafeCapabilities(args) {
  try {
    const enabled = shouldProbeWalletCapabilities(args);
    const { data } = useCapabilities({
      account: args?.account,
      connector: args?.connector,
      query: {
        enabled,
        retry: false
      }
    });
    return {
      capabilities: normalizeAtomicCapabilities(
        data
      )
    };
  } catch {
    return { capabilities: void 0 };
  }
}
function shouldProbeWalletCapabilities(args) {
  if (!args?.account || !args.connector) return false;
  const key = canonicalWalletKey(
    [
      args.stableId,
      args.walletName,
      args.connector.id,
      args.connector.name,
      args.connector.type,
      args.connector.uid
    ].filter(Boolean).join(" ")
  );
  return key !== "rabby";
}
function useSafeSendCallsSync() {
  try {
    const { sendCallsSyncAsync } = useSendCallsSync();
    return {
      sendCallsSyncAsync: async ({
        calls,
        capabilities,
        chainId,
        connector,
        forceAtomic,
        pollingInterval,
        status,
        throwOnFailure,
        timeout,
        version
      }) => {
        return sendCallsSyncAsync({
          calls,
          capabilities,
          chainId,
          connector,
          forceAtomic,
          pollingInterval,
          status,
          throwOnFailure,
          timeout,
          version
        });
      }
    };
  } catch {
    return { sendCallsSyncAsync: void 0 };
  }
}
function useSafeConnect() {
  try {
    const { connectAsync, isPending } = useConnect();
    return { connectAsync, isPending };
  } catch {
    return { connectAsync: void 0, isPending: false };
  }
}
function useSafeDisconnect() {
  try {
    const { disconnectAsync, isPending } = useDisconnect();
    return { disconnectAsync, isPending };
  } catch {
    return { disconnectAsync: void 0, isPending: false };
  }
}
function useSafeReconnect() {
  try {
    const { reconnect, reconnectAsync } = useReconnect();
    return { reconnect, reconnectAsync };
  } catch {
    return { reconnect: void 0, reconnectAsync: void 0 };
  }
}
function useSafeConnectors() {
  try {
    return useConnectors();
  } catch {
    return [];
  }
}
function useSafeRawWagmiConnections() {
  try {
    const connections = useConnections();
    return useMemo7(
      () => connections.map((connection) => ({
        connectorId: connection.connector.id,
        connectorUid: connection.connector.uid,
        connectorName: connection.connector.name,
        accounts: connection.accounts.filter(
          (address) => address.startsWith("0x")
        ),
        chainId: connection.chainId
      })),
      [connections]
    );
  } catch {
    return [];
  }
}
function useSafeConnections() {
  try {
    const connections = useConnections();
    return useMemo7(
      () => connections.flatMap(
        (connection) => connection.accounts.filter(
          (address) => address.startsWith("0x")
        ).map((address) => ({
          connectorId: connection.connector.uid,
          connectorName: connection.connector.name,
          address,
          chainId: connection.chainId
        }))
      ),
      [connections]
    );
  } catch {
    return [];
  }
}
function useSafeSwitchAccount() {
  try {
    const { switchAccountAsync } = useSwitchAccount();
    return { switchAccountAsync };
  } catch {
    return { switchAccountAsync: void 0 };
  }
}

// src/lib/wallet-kit/runtime/evm/registry-source.ts
function useWagmiRegistrySource(store) {
  const connections = useSafeRawWagmiConnections();
  const connectors = useSafeConnectors();
  const wagmiConfig = useSafeWagmiConfig();
  const brandInputs = useMemo8(
    () => connections.flatMap(
      (connection) => connection.accounts.map((address) => ({
        connectorId: connection.connectorUid,
        address
      }))
    ),
    [connections]
  );
  const brands = useEvmProviderBrands(brandInputs, connectors);
  const connectorKey = useMemo8(
    () => connectors.map((connector) => `${connector.uid}:${connector.id}`).sort().join("|"),
    [connectors]
  );
  const chainKey = useMemo8(
    () => wagmiConfig.chains.map((chain) => chain.id).join("|"),
    [wagmiConfig.chains]
  );
  const previousConfigKeyRef = useRef5(null);
  const previousConnectionsKeyRef = useRef5(null);
  const previousBrandsKeyRef = useRef5(null);
  useEffect8(() => {
    const mapped = connections.flatMap(
      (connection) => connection.accounts.map((address) => ({
        family: "evm",
        uid: connection.connectorUid,
        stableId: connection.connectorId,
        address,
        addresses: [...connection.accounts],
        chainId: connection.chainId,
        walletName: brands[connection.connectorUid] ?? connection.connectorName
      }))
    );
    const key = JSON.stringify(
      mapped.map((connection) => ({
        uid: connection.uid,
        stableId: connection.stableId,
        address: connection.address.toLowerCase(),
        addresses: connection.addresses.map(
          (address) => address.toLowerCase()
        ),
        chainId: connection.chainId ?? null,
        walletName: connection.walletName ?? null
      })).sort(
        (left, right) => `${left.uid}:${left.address}`.localeCompare(
          `${right.uid}:${right.address}`
        )
      )
    );
    if (previousConnectionsKeyRef.current === key) return;
    previousConnectionsKeyRef.current = key;
    store.dispatch({
      type: "wagmi/connections-changed",
      connections: mapped,
      now: Date.now()
    });
  }, [brands, connections, store]);
  useEffect8(() => {
    const key = `${connectorKey}::${chainKey}`;
    if (previousConfigKeyRef.current === null) {
      previousConfigKeyRef.current = key;
      return;
    }
    if (previousConfigKeyRef.current === key) return;
    previousConfigKeyRef.current = key;
    store.dispatch({ type: "wagmi/config-rebuilt", now: Date.now() });
  }, [chainKey, connectorKey, store]);
  useEffect8(() => {
    const key = JSON.stringify(
      Object.entries(brands).sort(
        ([left], [right]) => left.localeCompare(right)
      )
    );
    if (previousBrandsKeyRef.current === key) return;
    previousBrandsKeyRef.current = key;
    store.dispatch({ type: "wagmi/brands-changed", brands });
  }, [brands, store]);
}

// src/lib/wallet-kit/runtime/evm/wallet-runtime.ts
async function findConnectorByProviderBrand(connectors, expectedKey, excludeUid) {
  for (const connector of connectors) {
    if (connector.uid === excludeUid || !connector.getProvider) continue;
    try {
      const provider = await connector.getProvider();
      const brand = detectEvmProviderBrand(provider);
      if (brand && canonicalWalletKey(brand) === expectedKey) {
        return connector;
      }
    } catch {
    }
  }
  return void 0;
}
function findActiveEvmConnection(state) {
  const active = state.activeByFamily.evm;
  if (!active) return void 0;
  return state.connections.find((connection) => {
    if (connection.family !== "evm") return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    return connection.address.toLowerCase() === active.address.toLowerCase();
  });
}
function useEvmWalletRuntime({
  configuredChains,
  selectedEvmChainId,
  setSelectedEvmChainId,
  storageKey: storageKey2,
  providerHooks = {}
}) {
  const { walletClient } = useSafeWalletClient();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { disconnectAsync: wagmiDisconnectAsync } = useSafeDisconnect();
  const { reconnectAsync: wagmiReconnectAsync } = useSafeReconnect();
  const installedWalletFlags = useInstalledWalletFlags();
  const evmConnections = useSafeConnections();
  const evmConnectors = useSafeConnectors();
  const { connectAsync: wagmiConnectAsync } = useSafeConnect();
  const { switchAccountAsync } = useSafeSwitchAccount();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { sendCallsSyncAsync } = useSafeSendCallsSync();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const { signMessageAsync } = useSafeSignMessage();
  const getWalletClientFor = useSafeGetWalletClientFor();
  const wagmiConfig = useSafeWagmiConfig();
  const registryExecutors = useMemo9(
    () => ({
      async wagmiReconnect(stableIds) {
        if (!wagmiReconnectAsync) return;
        const targets = stableIds.map(
          (stableId) => evmConnectors.find((candidate) => candidate.id === stableId)
        ).filter((connector) => Boolean(connector));
        if (targets.length === 0) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/reconnect",
            stableIds,
            reason: "connector-missing"
          });
          return;
        }
        const result = await wagmiReconnectAsync({
          connectors: targets
        });
        if (Array.isArray(result) && result.length === 0) {
          walletDebug("evm:heal", {
            action: "reconnect-empty",
            stableIds
          });
        }
      },
      async wagmiConnect(stableId) {
        if (!wagmiConnectAsync) return;
        const target = evmConnectors.find(
          (candidate) => candidate.id === stableId
        );
        if (!target) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/connect",
            stableId,
            reason: "connector-missing"
          });
          return;
        }
        await wagmiConnectAsync({ connector: target });
      },
      async wagmiDisconnect(uid) {
        if (!wagmiDisconnectAsync) return;
        const target = wagmiConfig.connectors.find(
          (candidate) => candidate.uid === uid
        );
        if (!target) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/disconnect",
            uid,
            reason: "connector-missing"
          });
          return;
        }
        await wagmiDisconnectAsync({ connector: target });
      },
      providerLogout: providerHooks.providerLogout ?? (async () => void 0)
    }),
    [
      evmConnectors,
      providerHooks.providerLogout,
      wagmiConfig.connectors,
      wagmiConnectAsync,
      wagmiDisconnectAsync,
      wagmiReconnectAsync
    ]
  );
  const { store: registryStore, state: registryState } = useWalletRegistry({
    executors: registryExecutors,
    storageKey: storageKey2
  });
  useWagmiRegistrySource(registryStore);
  const supportedChains = useMemo9(
    () => configuredChains ?? wagmiConfig.chains,
    [configuredChains, wagmiConfig.chains]
  );
  const chainsById = useMemo9(
    () => Object.fromEntries(supportedChains.map((chain) => [chain.id, chain])),
    [supportedChains]
  );
  const activeEvmConnection = useMemo9(() => {
    const connection = findActiveEvmConnection(registryState);
    if (!connection || connection.chainId || !selectedEvmChainId) {
      return connection;
    }
    return { ...connection, chainId: selectedEvmChainId };
  }, [registryState, selectedEvmChainId]);
  const activeConnector = useMemo9(() => {
    const active = registryState.activeByFamily.evm;
    if (!active?.uid) return void 0;
    return wagmiConfig.connectors.find(
      (candidate) => candidate.uid === active.uid
    );
  }, [registryState.activeByFamily.evm, wagmiConfig.connectors]);
  const { capabilities } = useSafeCapabilities({
    account: activeEvmConnection?.address,
    connector: activeConnector,
    stableId: activeEvmConnection?.stableId,
    walletName: activeEvmConnection?.walletName
  });
  const evmSwitchInFlightRef = useRef6(false);
  useEffect9(() => {
    const chainId = activeEvmConnection?.chainId;
    if (evmSwitchInFlightRef.current || !chainId || !chainsById[chainId] || chainId === selectedEvmChainId) {
      return;
    }
    walletDebug("evm:chain-external-sync", {
      chainId,
      previous: selectedEvmChainId ?? null
    });
    setSelectedEvmChainId(chainId);
  }, [
    activeEvmConnection?.chainId,
    chainsById,
    selectedEvmChainId,
    setSelectedEvmChainId
  ]);
  useEffect9(() => {
    walletDebug("evm:connections-changed", {
      connections: evmConnections.map((conn) => ({
        connector: conn.connectorName,
        uid: conn.connectorId,
        address: conn.address
      }))
    });
  }, [evmConnections]);
  const evmWalletOptions = useMemo9(
    () => dedupeWalletOptions(
      evmConnectors.map(
        (connector) => toEvmWalletOption(connector, installedWalletFlags)
      ).filter((option) => {
        const connector = evmConnectors.find(
          (candidate) => candidate.uid === option.id
        );
        if (connector && providerHooks.isProviderInternalConnector?.(connector)) {
          return false;
        }
        return walletOptionIsDetected(option);
      })
    ),
    [evmConnectors, installedWalletFlags, providerHooks]
  );
  const selectAccount = useCallback2(
    async (id) => {
      const connection = registryStore.getSnapshot().connections.find((conn) => conn.family === "evm" && conn.uid === id);
      if (!connection) return;
      registryStore.dispatch({
        type: "user/select-active",
        family: "evm",
        address: connection.address,
        uid: connection.uid,
        stableId: connection.stableId,
        now: Date.now()
      });
      if (!switchAccountAsync) return;
      const connector = wagmiConfig.connectors.find(
        (candidate) => candidate.uid === connection.uid
      );
      if (!connector) {
        walletDebug("active-evm:switch-skipped", {
          uid: connection.uid,
          stableId: connection.stableId,
          reason: "connector-missing"
        });
        return;
      }
      try {
        await switchAccountAsync({ connector });
      } catch (error) {
        walletDebug("active-evm:cosmetic-switch-failed", {
          uid: connection.uid,
          stableId: connection.stableId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    },
    [registryStore, switchAccountAsync, wagmiConfig.connectors]
  );
  const signMessageForAccount = useCallback2(
    async ({
      accountId,
      chainId,
      message
    }) => {
      const connection = registryStore.getSnapshot().connections.find(
        (conn) => conn.family === "evm" && conn.uid === accountId
      );
      if (!connection) {
        throw new Error(`Unknown EVM account: ${accountId}`);
      }
      const connector = wagmiConfig.connectors.find(
        (candidate) => candidate.uid === connection.uid
      );
      if (!connector || providerHooks.isProviderInternalConnector?.(connector)) {
        const providerSignature = await providerHooks.signMessageForProviderAccount?.({
          connection,
          message,
          chainId
        });
        if (providerSignature) {
          return providerSignature;
        }
      }
      if (!connector) {
        throw new Error("Wallet linking requires the target wallet connector");
      }
      const walletClient2 = await getWalletClientFor({
        connector
      });
      if (walletClient2?.signMessage) {
        return await walletClient2.signMessage({
          account: connection.address,
          message
        });
      }
      if (!signMessageAsync) {
        throw new Error("Wallet linking requires an active EVM signer");
      }
      await selectAccount(accountId);
      return await signMessageAsync({
        account: connection.address,
        connector,
        message
      });
    },
    [
      getWalletClientFor,
      providerHooks,
      registryStore,
      selectAccount,
      signMessageAsync,
      wagmiConfig.connectors
    ]
  );
  const connect = useCallback2(
    async (id) => {
      if (!id) {
        providerHooks.onConnectFallback?.(registryStore);
        return;
      }
      const connectorOptions = evmConnectors.map((candidate) => ({
        connector: candidate,
        option: toEvmWalletOption(candidate, installedWalletFlags)
      }));
      const normalizedId = canonicalWalletKey(id);
      let target = connectorOptions.find(
        ({ option, connector }) => option.id === id || connector.uid === id
      )?.connector ?? connectorOptions.find(({ connector }) => connector.id === id)?.connector ?? connectorOptions.find(({ option, connector }) => {
        if (canonicalWalletKey(option.label) !== normalizedId) return false;
        if (providerHooks.isProviderInternalConnector?.(connector)) {
          return false;
        }
        return true;
      })?.connector;
      if (target?.getProvider) {
        try {
          const provider = await target.getProvider();
          const actualKey = canonicalWalletKey(
            detectEvmProviderBrand(provider) ?? ""
          );
          if (actualKey && actualKey !== normalizedId) {
            const replacement = await findConnectorByProviderBrand(
              connectorOptions.map(({ connector }) => connector),
              normalizedId,
              target.uid
            );
            if (replacement) {
              walletDebug("evm:connect-brand-mismatch", {
                requested: id,
                selected: target.id,
                actual: actualKey,
                replacement: replacement.id
              });
              target = replacement;
            }
          }
        } catch (error) {
          walletDebug("evm:connect-brand-sniff-failed", {
            requested: id,
            connector: target.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      if (target && wagmiConnectAsync) {
        walletDebug("evm:connect-target", {
          requested: id,
          connector: target.name,
          uid: target.uid,
          stableId: target.id
        });
        if (providerHooks.isProviderInternalConnector?.(target)) {
          providerHooks.onProviderReconnectRequested?.(registryStore);
        }
        const result = await wagmiConnectAsync({ connector: target });
        const connectedAddress = result?.accounts?.find((account) => account.startsWith("0x"));
        if (connectedAddress) {
          registryStore.dispatch({
            type: "user/connect-succeeded",
            family: "evm",
            address: connectedAddress,
            uid: target.uid,
            stableId: target.id,
            now: Date.now()
          });
        }
        return;
      }
      providerHooks.onProviderReconnectRequested?.(registryStore);
      providerHooks.onConnectFallback?.(registryStore);
    },
    [
      evmConnectors,
      installedWalletFlags,
      providerHooks,
      registryStore,
      wagmiConnectAsync
    ]
  );
  const disconnectAccount = useCallback2(
    async (target) => {
      const disconnectPlan = planEvmAccountDisconnect({
        target,
        connections: evmConnections
      });
      walletDebug("evm:account-sign-out", {
        wallet: target.walletName ?? null,
        address: disconnectPlan.targetAddress,
        isProviderOwnedAccount: disconnectPlan.isProviderOwnedAccount,
        disconnecting: [...disconnectPlan.connectorIds],
        othersRemain: disconnectPlan.otherConnectionsRemain,
        sameAddressRemains: disconnectPlan.sameAddressConnectionsRemain
      });
      registryStore.dispatch({
        type: "user/disconnect-account",
        address: disconnectPlan.targetAddress,
        uids: [...disconnectPlan.connectorIds],
        isProviderOwnedAccount: disconnectPlan.isProviderOwnedAccount,
        othersRemain: disconnectPlan.otherConnectionsRemain,
        markDroppedAddress: disconnectPlan.shouldMarkDroppedAddress,
        now: Date.now()
      });
      providerHooks.onAccountDisconnectPlanned?.(disconnectPlan);
    },
    [evmConnections, providerHooks, registryStore]
  );
  const disconnect = useCallback2(
    async (accountId) => {
      if (accountId) {
        const target = selectAccounts(
          registryStore.getSnapshot(),
          "evm",
          Date.now(),
          selectedEvmChainId
        ).find((account) => account.id === accountId);
        if (target) await disconnectAccount(target);
        return;
      }
      registryStore.dispatch({
        type: "user/disconnect-family",
        family: "evm",
        now: Date.now()
      });
    },
    [disconnectAccount, registryStore, selectedEvmChainId]
  );
  const selectNetwork = useCallback2(
    async (networkId) => {
      const chainId = Number(networkId);
      if (!Number.isFinite(chainId)) return;
      setSelectedEvmChainId(chainId);
      if (switchChainAsync && activeConnector && activeEvmConnection?.chainId !== chainId) {
        evmSwitchInFlightRef.current = true;
        try {
          await switchChainAsync({
            chainId,
            connector: activeConnector
          });
        } finally {
          evmSwitchInFlightRef.current = false;
        }
      }
    },
    [
      activeConnector,
      activeEvmConnection?.chainId,
      setSelectedEvmChainId,
      switchChainAsync
    ]
  );
  const selectRuntimeAccounts = useCallback2(
    (now) => selectAccounts(registryState, "evm", now, selectedEvmChainId),
    [registryState, selectedEvmChainId]
  );
  const selectRuntimeEvmIdentity = useCallback2(
    (now) => selectEvmIdentity(registryState, now, selectedEvmChainId),
    [registryState, selectedEvmChainId]
  );
  const activeConnectorIsProviderInternal = activeConnector ? providerHooks.isProviderInternalConnector?.(activeConnector) : false;
  return {
    registryStore,
    registryState,
    status: "ready",
    activeEvmConnection,
    activeConnector,
    capabilities,
    chainsById,
    supportedChains,
    walletClient,
    getWalletClientFor,
    sendTransactionAsync,
    sendCallsSyncAsync,
    signTypedDataAsync,
    signMessageAsync,
    signMessageForAccount,
    switchChainAsync,
    isSwitchingChain: isPending,
    activeAccount: selectRuntimeAccounts(Date.now()).find(
      (account) => account.active
    ),
    options: evmWalletOptions,
    shouldUseExternalSigner: Boolean(
      activeConnector && !activeConnectorIsProviderInternal
    ),
    identity: selectRuntimeEvmIdentity,
    accounts: selectRuntimeAccounts,
    selectAccount,
    connect,
    disconnect,
    selectNetwork
  };
}

// src/lib/wallet-kit/catalog/wallet-ids.ts
var EVM_PRESETS = {
  popular: ["metamask", "rabby", "coinbase", "walletconnect"],
  "evm-only": ["metamask", "rabby", "walletconnect"],
  minimal: ["metamask", "walletconnect"]
};
var SVM_PRESETS = {
  popular: ["phantom", "solflare", "backpack", "glow"],
  minimal: ["phantom", "solflare"]
};

// src/lib/wallet-kit/catalog/svm-wallet-catalog.ts
var SVM_WALLET_ALLOWLIST = new Set(SVM_PRESETS.popular);
function resolveAomiSvmWalletIds(input = {}) {
  return input.wallets ?? SVM_PRESETS[input.preset ?? "popular"];
}
function resolveAomiSvmConfig(input, selectedNetworkId) {
  if (input === false) {
    return {
      enabled: false,
      networks: [],
      activeNetwork: void 0,
      cluster: void 0,
      rpcHttpUrl: void 0,
      rpcWsUrl: void 0,
      walletIds: [],
      preferDirectSend: true
    };
  }
  const networks = normalizeSvmNetworkOptions(input);
  const activeNetwork = resolveSelectedSvmNetwork(networks, selectedNetworkId);
  return {
    enabled: input?.enabled ?? true,
    networks,
    activeNetwork,
    cluster: activeNetwork.cluster,
    rpcHttpUrl: activeNetwork.rpcHttpUrl,
    rpcWsUrl: activeNetwork.rpcWsUrl,
    walletIds: resolveAomiSvmWalletIds(input),
    preferDirectSend: input?.preferDirectSend ?? true
  };
}

// src/lib/wallet-kit/runtime/svm/wallet-runtime.ts
import { useCallback as useCallback3, useEffect as useEffect11, useMemo as useMemo11, useRef as useRef8 } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

// src/lib/wallet-kit/runtime/svm/registry-source.ts
import { useEffect as useEffect10, useMemo as useMemo10, useRef as useRef7 } from "react";
function useSvmRegistrySource(store, opts) {
  const snapshotKey = useMemo10(
    () => `${opts.svmWallet.publicKey ?? ""}:${opts.svmWallet.walletName ?? ""}`,
    [opts.svmWallet.publicKey, opts.svmWallet.walletName]
  );
  const previousKeyRef = useRef7(null);
  useEffect10(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "svm/changed",
      publicKey: opts.svmWallet.publicKey ?? null,
      kind: opts.svmWallet.transport === "embedded" ? "embedded-session" : "svm",
      providerId: opts.svmWallet.providerId,
      walletName: opts.svmWallet.walletName ?? null,
      now: Date.now()
    });
  }, [opts.svmWallet.publicKey, opts.svmWallet.walletName, snapshotKey, store]);
}

// src/lib/wallet-kit/runtime/svm/transactions.ts
import {
  Connection as SolanaConnection,
  Transaction as SolanaTransaction,
  VersionedTransaction
} from "@solana/web3.js";
function decodeBase64(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function encodeBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function deserializeSolanaTransaction(bytes) {
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return SolanaTransaction.from(bytes);
  }
}
function buildSvmTransactionMethods(wallet, config) {
  const signTransaction = wallet.signTransaction;
  const signMessage = wallet.signMessage;
  const sendTransaction = wallet.sendTransaction;
  return {
    signSolanaTransaction: signTransaction ? async (payload) => {
      if (!payload.unsignedTx) {
        throw new Error("Missing unsigned_tx payload");
      }
      const tx = deserializeSolanaTransaction(
        decodeBase64(payload.unsignedTx)
      );
      const signed = await signTransaction(tx);
      return { signedTx: encodeBase64(signed.serialize()) };
    } : void 0,
    signSolanaMessage: signMessage ? async (payload) => {
      if (!payload.message) {
        throw new Error("Missing message payload");
      }
      const signature = await signMessage(decodeBase64(payload.message));
      return { signature: encodeBase64(signature) };
    } : void 0,
    sendSolanaTransaction: sendTransaction ? async (payload) => {
      if (!payload.unsignedTx) {
        throw new Error("Missing unsigned_tx payload");
      }
      const connection = new SolanaConnection(
        config.rpcHttpUrl,
        "confirmed"
      );
      const tx = deserializeSolanaTransaction(
        decodeBase64(payload.unsignedTx)
      );
      const signature = await sendTransaction(tx, connection);
      return { signature };
    } : void 0,
    signAndSendSolanaTransaction: sendTransaction && config.preferDirectSend ? async (payload) => {
      if (!payload.unsignedTx) {
        throw new Error("Missing unsigned_tx payload");
      }
      const connection = new SolanaConnection(
        config.rpcHttpUrl,
        "confirmed"
      );
      const tx = deserializeSolanaTransaction(
        decodeBase64(payload.unsignedTx)
      );
      const signature = await sendTransaction(tx, connection);
      return { signature };
    } : void 0,
    solanaRpcHttpUrl: config.rpcHttpUrl,
    solanaRpcWsUrl: config.rpcWsUrl
  };
}

// src/lib/wallet-kit/runtime/svm/wallet-runtime.ts
var DISCONNECTED_SVM_WALLET = {
  publicKey: void 0,
  connected: false,
  connecting: false,
  disconnecting: false,
  walletName: void 0,
  wallets: [],
  select: void 0,
  connect: void 0,
  disconnect: void 0,
  signTransaction: void 0,
  signAllTransactions: void 0,
  signMessage: void 0,
  sendTransaction: void 0
};
var DEFAULT_SVM_ENDPOINT = DEFAULT_SVM_RPC_HTTP_URLS[DEFAULT_SVM_CLUSTER];
var SVM_AUTOCONNECT_GRACE_MS = 400;
function useSafeSvmWallet() {
  try {
    const wallet = useSolanaWallet();
    return {
      publicKey: wallet.publicKey?.toBase58(),
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      walletName: wallet.wallet?.adapter?.name,
      wallets: wallet.wallets,
      select: wallet.select,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      signMessage: wallet.signMessage,
      sendTransaction: wallet.sendTransaction
    };
  } catch {
    return DISCONNECTED_SVM_WALLET;
  }
}
function detectSvmTransport(walletName) {
  const normalized = walletName?.toLowerCase() ?? "";
  if (normalized.includes("mobile wallet adapter") || normalized.includes("solana mobile") || normalized.includes("mwa")) {
    return "mwa";
  }
  return "extension";
}
function isUsableWalletReadyState(readyState) {
  return readyState === "Installed" || readyState === "Loadable";
}
function walletPriority(name) {
  const normalized = name.toLowerCase();
  if (normalized.includes("phantom")) return 0;
  if (normalized.includes("solflare")) return 1;
  if (normalized.includes("backpack")) return 2;
  if (normalized.includes("glow")) return 3;
  return 10;
}
function pickPreferredSvmWallet(wallet) {
  return [...wallet.wallets].filter((candidate) => isUsableWalletReadyState(candidate.readyState)).sort((left, right) => {
    const installedDelta = Number(left.readyState === "Installed") - Number(right.readyState === "Installed");
    if (installedDelta !== 0) {
      return -installedDelta;
    }
    return walletPriority(left.adapter.name) - walletPriority(right.adapter.name);
  })[0];
}
function getSvmCapabilitySnapshot(wallet) {
  if (!wallet?.publicKey) {
    return void 0;
  }
  return {
    canSignMessage: Boolean(wallet.signMessage),
    canSignTransaction: Boolean(wallet.signTransaction),
    canSignAllTransactions: Boolean(wallet.signAllTransactions),
    canSendTransaction: Boolean(wallet.sendTransaction),
    canSignAndSendTransaction: Boolean(wallet.sendTransaction)
  };
}
function buildSvmWalletDescriptors(wallet) {
  return wallet.wallets.filter(
    (entry) => SVM_WALLET_ALLOWLIST.has(canonicalWalletKey(entry.adapter.name))
  ).map((entry) => ({
    name: entry.adapter.name,
    installed: entry.readyState === "Installed",
    ready: entry.readyState === "Installed" || entry.readyState === "Loadable"
  }));
}
function toSvmWalletOption(descriptor) {
  return {
    id: descriptor.name,
    label: descriptor.name,
    family: "svm",
    kind: "solana",
    status: descriptor.ready ? descriptor.installed ? "installed" : "available" : "unavailable",
    installed: descriptor.installed,
    ready: descriptor.ready
  };
}
function useLatestRef(value) {
  const ref = useRef8(value);
  useEffect11(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
function useSvmWalletRuntime({
  preferDirectSend = true,
  registryStore,
  selectedNetwork,
  supportedNetworks,
  setSelectedNetworkId,
  wallet: walletOverride
}) {
  const wallet = walletOverride ?? DISCONNECTED_SVM_WALLET;
  const walletRef = useLatestRef(wallet);
  useSvmRegistrySource(registryStore, { svmWallet: wallet });
  const settleConnect = useCallback3(
    (walletName) => {
      registryStore.dispatch({
        type: "svm/connect-settled",
        walletName,
        now: Date.now()
      });
    },
    [registryStore]
  );
  const executeConnect = useCallback3(
    async (walletName) => {
      const current = walletRef.current;
      try {
        if (current.publicKey && current.walletName === walletName) {
          return;
        }
        if (current.walletName !== walletName) {
          current.select?.(walletName);
        }
        if (!current.connect) return;
        await new Promise(
          (resolve) => setTimeout(resolve, SVM_AUTOCONNECT_GRACE_MS)
        );
        await walletRef.current.connect?.();
      } finally {
        settleConnect(walletName);
      }
    },
    [settleConnect, walletRef]
  );
  const executeDisconnect = useCallback3(async () => {
    const current = walletRef.current;
    if (!current.publicKey || !current.disconnect) return;
    await current.disconnect();
  }, [walletRef]);
  useEffect11(() => {
    registryStore.updateExecutors({
      svmConnect: executeConnect,
      svmDisconnect: executeDisconnect
    });
  }, [executeConnect, executeDisconnect, registryStore]);
  const connect = useCallback3(
    async (optionId) => {
      if (wallet.publicKey || wallet.connected) return;
      const walletName = optionId ?? pickPreferredSvmWallet(wallet)?.adapter.name;
      if (!walletName) return;
      registryStore.dispatch({
        type: "svm/connect-requested",
        walletName,
        now: Date.now()
      });
    },
    [registryStore, wallet]
  );
  const disconnect = useCallback3(async () => {
    registryStore.dispatch({
      type: "user/disconnect-family",
      family: "svm",
      now: Date.now()
    });
  }, [registryStore]);
  const selectAccount = useCallback3(
    async (accountId) => {
      const account = selectAccounts(
        registryStore.getSnapshot(),
        "svm",
        Date.now()
      ).find((candidate) => candidate.id === accountId);
      if (!account) return;
      registryStore.dispatch({
        type: "user/select-active",
        family: "svm",
        address: account.address,
        uid: account.id,
        stableId: account.id,
        now: Date.now()
      });
    },
    [registryStore]
  );
  const selectNetwork = useCallback3(
    async (networkId) => {
      const id = String(networkId);
      if (selectedNetwork?.id === id) return;
      if (wallet.publicKey && wallet.disconnect) {
        await wallet.disconnect();
      }
      setSelectedNetworkId(id);
    },
    [selectedNetwork?.id, setSelectedNetworkId, wallet]
  );
  const config = useMemo11(
    () => ({
      rpcHttpUrl: selectedNetwork?.rpcHttpUrl ?? DEFAULT_SVM_RPC_HTTP_URLS[selectedNetwork?.cluster ?? DEFAULT_SVM_CLUSTER],
      rpcWsUrl: selectedNetwork?.rpcWsUrl,
      preferDirectSend
    }),
    [preferDirectSend, selectedNetwork]
  );
  const execution = useMemo11(
    () => buildSvmTransactionMethods(wallet, config),
    [config, wallet]
  );
  const options = useMemo11(
    () => buildSvmWalletDescriptors(wallet).map(toSvmWalletOption),
    [wallet]
  );
  const accounts = useCallback3(
    (now) => selectAccounts(registryStore.getSnapshot(), "svm", now),
    [registryStore]
  );
  const identity = useCallback3(
    (now) => {
      const registryIdentity = selectSvmIdentity(
        registryStore.getSnapshot(),
        now
      );
      return {
        ...registryIdentity,
        cluster: selectedNetwork?.cluster ?? DEFAULT_SVM_CLUSTER,
        walletSource: registryIdentity.address ? wallet.transport === "embedded" ? "embedded" : "injected" : void 0,
        transport: registryIdentity.address ? wallet.transport ?? detectSvmTransport(registryIdentity.walletName) : void 0,
        capabilities: getSvmCapabilitySnapshot(wallet)
      };
    },
    [registryStore, selectedNetwork?.cluster, wallet]
  );
  return {
    status: wallet.select || wallet.connect || wallet.publicKey ? "ready" : "unavailable",
    registryStore,
    identity,
    accounts,
    activeAccount: accounts(Date.now()).find((account) => account.active),
    options,
    supportedNetworks,
    selectedNetwork,
    connect,
    disconnect,
    selectAccount,
    selectNetwork,
    execution
  };
}

// src/lib/wallet-kit/catalog/evm-connector-catalog.ts
import { http as http2 } from "viem";
import { createConfig } from "wagmi";
import {
  baseAccount,
  coinbaseWallet,
  injected,
  walletConnect
} from "wagmi/connectors";
var AOMI_DEFAULT_WC_PROJECT_ID = safeEnv(() => process.env.NEXT_PUBLIC_AOMI_WC_PROJECT_ID) ?? safeEnv(() => process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ?? safeEnv(() => process.env.NEXT_PUBLIC_PROJECT_ID);
var evmConfigCache = /* @__PURE__ */ new Map();
function defaultHttpTransports(chains) {
  return Object.fromEntries(
    chains.map((chain) => [chain.id, http2(chain.rpcUrls.default.http[0])])
  );
}
function connectorLooksLikeWalletConnect(connector) {
  const meta = connector;
  const text = [meta.id, meta.name, meta.type].filter(Boolean).join(" ");
  return /wallet\s*connect|walletconnect/i.test(text);
}
function warnDuplicateWalletConnect() {
  if (safeEnv(() => process.env.NODE_ENV) === "production") return;
  console.warn(
    "[aomi-wallet-kit] wallets.evm.connectors included a WalletConnect-like connector. Aomi owns the WalletConnect connector; pass walletConnectProjectId instead."
  );
}
function createAomiEvmConfig(input) {
  const wanted = new Set(
    input.wallets ?? EVM_PRESETS[input.preset ?? "popular"]
  );
  const wcProjectId = input.walletConnectProjectId ?? AOMI_DEFAULT_WC_PROJECT_ID;
  const hostConnectors = (input.connectors ?? []).filter((connector) => {
    if (!connectorLooksLikeWalletConnect(connector)) return true;
    warnDuplicateWalletConnect();
    return false;
  });
  const cacheKey = evmConfigCacheKey(input, wanted, wcProjectId);
  if (cacheKey) {
    const cached = evmConfigCache.get(cacheKey);
    if (cached) return cached;
  }
  const connectors = [
    injected({ shimDisconnect: true }),
    ...wanted.has("walletconnect") && wcProjectId ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : [],
    ...input.coinbase !== false && wanted.has("coinbase") ? [
      coinbaseWallet({
        appName: input.appName ?? "Aomi",
        appLogoUrl: input.appLogoUrl ?? void 0
      })
    ] : [],
    ...wanted.has("baseAccount") || input.includeBaseAccount ? [
      baseAccount({
        appName: input.appName ?? "Aomi",
        appLogoUrl: input.appLogoUrl ?? null,
        paymasterUrls: {}
      })
    ] : [],
    ...hostConnectors
  ];
  const config = createConfig({
    chains: input.chains,
    connectors,
    transports: input.transports ?? defaultHttpTransports(input.chains),
    multiInjectedProviderDiscovery: true,
    ssr: input.ssr ?? true
  });
  if (cacheKey) {
    evmConfigCache.set(cacheKey, config);
    if (evmConfigCache.size > 8) {
      const firstKey = evmConfigCache.keys().next().value;
      if (firstKey) evmConfigCache.delete(firstKey);
    }
  }
  return config;
}
function evmConfigCacheKey(input, wanted, wcProjectId) {
  if (input.connectors?.length || input.transports) return null;
  return JSON.stringify({
    chains: input.chains.map((chain) => [
      chain.id,
      chain.rpcUrls.default.http[0]
    ]),
    wallets: [...wanted].sort(),
    walletConnectProjectId: wcProjectId ?? null,
    coinbase: input.coinbase !== false,
    appName: input.appName ?? null,
    appLogoUrl: input.appLogoUrl ?? null,
    ssr: input.ssr ?? true,
    includeBaseAccount: input.includeBaseAccount ?? false
  });
}

// src/lib/wallet-kit/providers/plugin-registry.ts
var registry = /* @__PURE__ */ new Map();
function registerWalletProvider(plugin) {
  registry.set(plugin.id, plugin);
}
function getWalletProvider(id) {
  return registry.get(id);
}
function requireWalletProvider(id) {
  const plugin = registry.get(id);
  if (!plugin) {
    throw new Error(
      `[aomi-wallet-kit] Unknown wallet provider "${id}". Import "@aomi-labs/widget-lib/providers/${id}" before mounting AomiWalletKitProvider, or use preset="wallets-only".`
    );
  }
  return plugin;
}
function detectProviderSugar(input) {
  for (const plugin of registry.values()) {
    const normalized = plugin.detectSugar?.(input);
    if (normalized) return normalized;
  }
  return null;
}

export {
  normalizeWalletOptionId,
  registerWalletBrand,
  canonicalWalletKey,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  AOMI_SESSION_BOOTING_IDENTITY,
  formatWalletAddress,
  formatWalletProvider,
  formatAuthMethod,
  inferAuthMethod,
  AomiWalletKitContextProvider,
  useAomiWalletKit,
  REGISTRY_STORAGE_KEY,
  walletDebug,
  AomiWalletKitComposer,
  toSocialLoginOption,
  hexToBase64,
  useResolvedAccountRuntime,
  buildEvmExecutionRuntime,
  DEFAULT_SVM_CLUSTER,
  normalizeSvmNetworkOptions,
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
  useOptionalAomiWalletNetworkPreferences,
  safeEnv,
  selectEvmIdentity,
  selectAccounts,
  useWalletRegistry,
  useEvmWalletRuntime,
  resolveAomiSvmConfig,
  DEFAULT_SVM_ENDPOINT,
  useSafeSvmWallet,
  useSvmWalletRuntime,
  createAomiEvmConfig,
  registerWalletProvider,
  getWalletProvider,
  requireWalletProvider,
  detectProviderSugar
};
//# sourceMappingURL=chunk-FUKWMD3O.js.map