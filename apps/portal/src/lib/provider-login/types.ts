export type PortalEmbeddedProvider = "privy" | "para";

export const PORTAL_PROVIDER_LABELS = {
  privy: "Privy",
  para: "Para",
} as const;

export function isPortalEmbeddedProvider(
  value: string | null,
): value is PortalEmbeddedProvider {
  return value === "privy" || value === "para";
}
