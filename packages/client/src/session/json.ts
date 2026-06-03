import type { UserState as UserStateShape } from "../user-state";

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function stableUserStateString(state: UserStateShape | undefined): string {
  return JSON.stringify(sortJson(state ?? {}));
}

export function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJson((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function isSubsetMatch(expected: unknown, actual: unknown): boolean {
  if (isNil(expected) && isNil(actual)) {
    return true;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      return false;
    }
    return expected.every((entry, index) =>
      isSubsetMatch(entry, actual[index]),
    );
  }

  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      return false;
    }

    return Object.entries(expected as Record<string, unknown>).every(
      ([key, value]) =>
        isSubsetMatch(value, (actual as Record<string, unknown>)[key]),
    );
  }

  return expected === actual;
}
