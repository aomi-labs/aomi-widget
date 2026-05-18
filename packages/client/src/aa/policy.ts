import type { AAMode, AASponsorship } from "./types";

export function aaModeFromExecutionKind(
  executionKind: string | undefined,
): "4337" | "7702" | "none" | undefined {
  if (!executionKind) return undefined;
  if (executionKind.endsWith("_4337")) return "4337";
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind === "eoa") return "none";
  return undefined;
}

export function resolveAASponsorship(
  mode: AAMode,
  configuredSponsorship: AASponsorship,
): AASponsorship {
  return mode === "7702" ? "disabled" : configuredSponsorship;
}
