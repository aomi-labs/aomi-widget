"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Connector } from "wagmi";
import type { AomiWalletOption } from "../../types";

/**
 * Wallet branding and detection shared by wallet kit providers and the picker UI.
 *
 * Everything that decides "which wallet brand is this?" lives here — the
 * canonical brand keys, the installed-extension probes, the connector → picker
 * option mapping, and the runtime sniffing of which brand actually answers
 * behind a connector (Rabby impersonating MetaMask, etc).
 */

export function normalizeWalletOptionId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Collapse ids/labels/rdns strings onto one canonical brand key so the same
 * wallet matches across connectors, accounts, icons and dedupe sets.
 */
export function canonicalWalletKey(value: string): string {
  const normalized = normalizeWalletOptionId(value);
  if (normalized.includes("metamask")) return "metamask";
  if (normalized.includes("rabby")) return "rabby";
  if (normalized.includes("coinbase")) return "coinbase";
  if (normalized.includes("rainbow")) return "rainbow";
  if (normalized.includes("walletconnect")) return "walletconnect";
  if (normalized.includes("para")) return "para";
  if (normalized.includes("baseaccount") || normalized === "base") {
    return "base";
  }
  if (normalized.includes("phantom")) return "phantom";
  if (normalized.includes("solflare")) return "solflare";
  if (normalized.includes("backpack")) return "backpack";
  if (normalized.includes("glow")) return "glow";
  return normalized;
}

const walletLabelOverrides: Record<string, string> = {
  base: "Base Account",
  baseaccount: "Base Account",
  coinbase: "Coinbase Wallet",
  coinbasewallet: "Coinbase Wallet",
  injected: "Browser wallet",
  metamask: "MetaMask",
  rabby: "Rabby",
  rainbow: "Rainbow",
  walletconnect: "WalletConnect",
};

export const solanaWalletAllowlist = new Set([
  "phantom",
  "solflare",
  "backpack",
  "glow",
]);

export type InstalledWalletFlags = {
  metamask: boolean;
  rabby: boolean;
  coinbase: boolean;
  rainbow: boolean;
};

const emptyInstalledWalletFlags: InstalledWalletFlags = {
  metamask: false,
  rabby: false,
  coinbase: false,
  rainbow: false,
};

type InjectedProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isPhantom?: boolean;
  isBraveWallet?: boolean;
  providers?: InjectedProvider[];
};

function detectInstalledWalletFlags(): InstalledWalletFlags {
  if (typeof window === "undefined") return emptyInstalledWalletFlags;

  const hostWindow = window as typeof window & {
    ethereum?: unknown;
    rabby?: unknown;
    coinbaseWalletExtension?: unknown;
  };
  const injected = hostWindow.ethereum as InjectedProvider | undefined;
  const rabbyProvider = hostWindow.rabby as InjectedProvider | undefined;
  const providers = [
    injected,
    rabbyProvider,
    ...(injected?.providers ?? []),
  ].filter(Boolean);

  return {
    metamask: providers.some((provider) => Boolean(provider?.isMetaMask)),
    rabby:
      Boolean(rabbyProvider) ||
      providers.some((provider) => Boolean(provider?.isRabby)),
    coinbase:
      Boolean(hostWindow.coinbaseWalletExtension) ||
      providers.some((provider) => Boolean(provider?.isCoinbaseWallet)),
    rainbow: providers.some((provider) => Boolean(provider?.isRainbow)),
  };
}

function mergeInstalledWalletFlags(
  current: InstalledWalletFlags,
  next: Partial<InstalledWalletFlags>,
): InstalledWalletFlags {
  return {
    metamask: current.metamask || Boolean(next.metamask),
    rabby: current.rabby || Boolean(next.rabby),
    coinbase: current.coinbase || Boolean(next.coinbase),
    rainbow: current.rainbow || Boolean(next.rainbow),
  };
}

function flagsFromEip6963Provider(info: {
  name?: string;
  rdns?: string;
}): Partial<InstalledWalletFlags> {
  const key = canonicalWalletKey(`${info.rdns ?? ""} ${info.name ?? ""}`);
  return {
    metamask: key === "metamask",
    rabby: key === "rabby",
    coinbase: key === "coinbase",
    rainbow: key === "rainbow",
  };
}

export function useInstalledWalletFlags(): InstalledWalletFlags {
  const [flags, setFlags] = useState<InstalledWalletFlags>(() =>
    detectInstalledWalletFlags(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setFlags((current) =>
      mergeInstalledWalletFlags(current, detectInstalledWalletFlags()),
    );

    const handleProvider = (event: Event) => {
      const detail = (
        event as CustomEvent<{ info?: { name?: string; rdns?: string } }>
      ).detail;
      const info = detail?.info;
      if (!info) return;
      setFlags((current) =>
        mergeInstalledWalletFlags(current, flagsFromEip6963Provider(info)),
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

export function inferWalletLabel(connector: Connector): string {
  const connectorName = connector.name?.trim() || connector.id || "Wallet";
  const normalized =
    walletLabelOverrides[normalizeWalletOptionId(connectorName)] ??
    walletLabelOverrides[normalizeWalletOptionId(connector.id ?? "")];

  return normalized ?? connectorName;
}

function inferWalletKind(connector: Connector): AomiWalletOption["kind"] {
  const key = normalizeWalletOptionId(
    `${connector.id ?? ""} ${connector.name ?? ""} ${connector.type ?? ""}`,
  );
  return key.includes("walletconnect") ? "walletconnect" : "evm";
}

function connectorReady(connector: Connector): boolean | undefined {
  return (connector as Connector & { ready?: boolean }).ready;
}

export function isProviderInternalWalletLabel(label: string): boolean {
  return false;
}

function knownWalletInstalled(
  key: string,
  flags: InstalledWalletFlags,
): boolean | undefined {
  if (key === "metamask") return flags.metamask;
  if (key === "rabby") return flags.rabby;
  if (key === "coinbase") return flags.coinbase;
  if (key === "rainbow") return flags.rainbow;
  return undefined;
}

export function toEvmWalletOption(
  connector: Connector,
  installedWalletFlags: InstalledWalletFlags,
): AomiWalletOption {
  const id =
    connector.uid || connector.id || normalizeWalletOptionId(connector.name);
  const kind = inferWalletKind(connector);
  const ready = connectorReady(connector);
  const label = inferWalletLabel(connector);
  const knownInstalled = knownWalletInstalled(
    canonicalWalletKey(label),
    installedWalletFlags,
  );
  const installed =
    ready === true ||
    knownInstalled === true ||
    (knownInstalled === undefined && connector.type === "injected");

  return {
    id,
    connectorId: connector.id,
    label,
    family: kind === "walletconnect" ? "multichain" : "evm",
    kind,
    status:
      kind === "walletconnect"
        ? "qr"
        : ready === false
          ? "unavailable"
          : installed
            ? "installed"
            : "available",
    installed,
    ready: ready !== false,
    description:
      kind === "walletconnect"
        ? "Scan with a mobile wallet"
        : "Connect an Ethereum wallet",
  };
}

export function dedupeWalletOptions(
  options: readonly AomiWalletOption[],
): AomiWalletOption[] {
  const byKey = new Map<string, AomiWalletOption>();

  for (const option of options) {
    const key = canonicalWalletKey(option.label);
    const previous = byKey.get(key);
    if (!previous || optionIsMoreProviderSpecific(option, previous)) {
      byKey.set(key, option);
    }
  }

  return [...byKey.values()];
}

function optionIsMoreProviderSpecific(
  candidate: AomiWalletOption,
  current: AomiWalletOption,
): boolean {
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

export function walletOptionIsDetected(option: AomiWalletOption): boolean {
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

const socialLoginLabels: Record<string, string> = {
  APPLE: "Continue with Apple",
  DISCORD: "Continue with Discord",
  FACEBOOK: "Continue with Facebook",
  FARCASTER: "Continue with Farcaster",
  GITHUB: "Continue with GitHub",
  GOOGLE: "Email or Google",
  TELEGRAM: "Continue with Telegram",
  X: "Continue with X",
};

const socialLoginDescriptions: Record<string, string> = {
  GOOGLE: "Fast account sign-in",
};

export function toSocialLoginOption(method: string): AomiWalletOption {
  const id = method.toLowerCase();
  return {
    id,
    label: socialLoginLabels[method] ?? `Continue with ${method}`,
    family: "multichain",
    kind: "social",
    status: "available",
    ready: true,
    description:
      socialLoginDescriptions[method] ?? "Create or use an Aomi account",
  };
}

/**
 * Identify which wallet brand actually answers behind an injected provider.
 *
 * Connector names lie: with Rabby (or Phantom, Brave, …) set as the default
 * wallet, the "MetaMask" connector binds to Rabby's provider — Rabby sets
 * `isMetaMask` for compatibility. So specific-brand flags are checked before
 * the generic `isMetaMask`.
 */
export function detectEvmProviderBrand(provider: unknown): string | undefined {
  if (!provider || typeof provider !== "object") return undefined;
  const flags = provider as InjectedProvider;
  if (flags.isRabby) return "Rabby";
  if (flags.isPhantom) return "Phantom";
  if (flags.isBraveWallet) return "Brave Wallet";
  if (flags.isRainbow) return "Rainbow";
  if (flags.isCoinbaseWallet) return "Coinbase Wallet";
  if (flags.isMetaMask) return "MetaMask";
  return undefined;
}

export type EvmConnectionBrandInput = {
  connectorId: string;
  address: string;
};

/**
 * Resolve the real brand for each live EVM connection by sniffing the
 * underlying provider. Returns `connectorId → brand label`; connections whose
 * provider exposes no brand flags (embedded SDK wallets, WalletConnect, ...) are
 * absent — callers fall back to the connector name.
 *
 * Re-sniffs whenever the connection set changes, so flipping the wallet's
 * "default wallet" setting is picked up without a page refresh.
 */
export function useEvmProviderBrands(
  connections: readonly EvmConnectionBrandInput[],
  connectors: readonly Connector[],
): Record<string, string> {
  const [brands, setBrands] = useState<Record<string, string>>({});
  // Re-sniff on membership changes without retriggering on unrelated renders.
  const membershipKey = useMemo(
    () =>
      connections
        .map((connection) => `${connection.connectorId}:${connection.address}`)
        .sort()
        .join("|"),
    [connections],
  );
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;
  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;

  useEffect(() => {
    if (!membershipKey) {
      setBrands((previous) => (Object.keys(previous).length ? {} : previous));
      return;
    }

    let cancelled = false;
    void Promise.all(
      connectionsRef.current.map(async (connection) => {
        const connector = connectorsRef.current.find(
          (candidate) => candidate.uid === connection.connectorId,
        );
        if (!connector?.getProvider) return null;
        try {
          const provider = await connector.getProvider();
          const brand = detectEvmProviderBrand(provider);
          return brand ? ([connection.connectorId, brand] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setBrands(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [string, string] => entry !== null,
          ),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [membershipKey]);

  return brands;
}
