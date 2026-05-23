// =============================================================================
// In-memory SecretStore — tests and dev fallback when no BE is reachable.
// =============================================================================

import type { SecretHandle, UserId } from "../types";
import type { SecretStore } from "./index";

export class MemorySecretStore implements SecretStore {
  private store = new Map<string, string>();
  private counter = 0;

  async put(args: {
    userId: UserId;
    application: string;
    secrets: Record<string, string>;
  }): Promise<Record<string, SecretHandle>> {
    const handles: Record<string, SecretHandle> = {};
    for (const [name, value] of Object.entries(args.secrets)) {
      const handle = `mem_${args.userId}_${args.application}_${name}_${++this.counter}`;
      this.store.set(handle, value);
      handles[name] = handle;
    }
    return handles;
  }

  /** Test helper. Not part of the public interface. */
  _peek(handle: SecretHandle): string | undefined {
    return this.store.get(handle);
  }
}
