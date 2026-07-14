import type { SecretSlot } from "./types";

export type { SecretSlot };

/**
 * The required slots that have no value in the vault yet.
 *
 * `configuredKeys` are vault key NAMES (values are never readable). Matching is
 * case-sensitive because environment variable names are.
 */
export function missingRequiredSecrets(
  slots: SecretSlot[] | undefined,
  configuredKeys: string[],
): SecretSlot[] {
  if (!slots?.length) return [];
  const configured = new Set(configuredKeys);
  return slots.filter((slot) => slot.required && !configured.has(slot.name));
}
