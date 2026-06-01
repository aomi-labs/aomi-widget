// =============================================================================
// Provider registry — name → ProviderModule.
// =============================================================================
//
// The portal wires its own registry in `apps/portal/src/lib/providers.ts`
// and passes it into the route handler factories. This module just gives
// you the type and a simple Map-backed impl.

import type { ProviderModule } from "./types";

export interface ProviderRegistry {
  get(name: string): ProviderModule | undefined;
  list(): string[];
}

export class MapProviderRegistry implements ProviderRegistry {
  private map = new Map<string, ProviderModule>();

  constructor(providers: ProviderModule[] = []) {
    for (const p of providers) this.map.set(p.name, p);
  }

  register(provider: ProviderModule): void {
    this.map.set(provider.name, provider);
  }

  get(name: string): ProviderModule | undefined {
    return this.map.get(name);
  }

  list(): string[] {
    return [...this.map.keys()];
  }
}
