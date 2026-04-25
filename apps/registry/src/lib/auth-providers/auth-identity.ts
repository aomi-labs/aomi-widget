"use client";

export function formatAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}

export function formatAuthProvider(provider?: string): string | undefined {
  if (!provider) return undefined;

  const labelMap: Record<string, string> = {
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
    wallet: "Wallet",
  };

  return labelMap[provider] ?? provider;
}

export function inferAuthProvider(authMethods: unknown): string | undefined {
  if (!(authMethods instanceof Set) || authMethods.size === 0) return undefined;

  const allowed = new Set([
    "google",
    "github",
    "apple",
    "facebook",
    "x",
    "discord",
    "farcaster",
    "telegram",
    "email",
    "phone",
  ]);

  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (allowed.has(normalized)) return normalized;
  }

  const first = authMethods.values().next().value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}
