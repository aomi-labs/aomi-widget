// =============================================================================
// Typed EventEmitter (browser-safe, no Node.js deps)
// =============================================================================

type Listener<T = unknown> = (payload: T) => void;

/**
 * Minimal typed event emitter with wildcard support.
 *
 * ```ts
 * type Events = { message: string; error: { code: number } };
 * const ee = new TypedEventEmitter<Events>();
 * ee.on("message", (msg) => console.log(msg));
 * ee.emit("message", "hello");
 * ```
 */
export class TypedEventEmitter<
  EventMap extends Record<string, unknown> = Record<string, unknown>,
> {
  private listeners = new Map<string, Set<Listener<never>>>();

  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   */
  on<K extends keyof EventMap & string>(
    type: K,
    handler: Listener<EventMap[K]>,
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler as Listener<never>);

    return () => {
      set!.delete(handler as Listener<never>);
      if (set!.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Subscribe to an event type for a single emission, then auto-unsubscribe.
   */
  once<K extends keyof EventMap & string>(
    type: K,
    handler: Listener<EventMap[K]>,
  ): () => void {
    const wrapper = ((payload: EventMap[K]) => {
      unsub();
      handler(payload);
    }) as Listener<EventMap[K]>;

    const unsub = this.on(type, wrapper);
    return unsub;
  }

  /**
   * Emit an event to all listeners of `type` and wildcard `"*"` listeners.
   */
  emit<K extends keyof EventMap & string>(
    type: K,
    payload: EventMap[K],
  ): void {
    // Type-specific listeners
    const typeSet = this.listeners.get(type);
    if (typeSet) {
      for (const handler of typeSet) {
        (handler as Listener<EventMap[K]>)(payload);
      }
    }

    // Wildcard listeners
    if (type !== "*") {
      const wildcardSet = this.listeners.get("*");
      if (wildcardSet) {
        for (const handler of wildcardSet) {
          (handler as Listener<unknown>)({ type, payload });
        }
      }
    }
  }

  /**
   * Remove a specific handler from an event type.
   */
  off<K extends keyof EventMap & string>(
    type: K,
    handler: Listener<EventMap[K]>,
  ): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(handler as Listener<never>);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  /**
   * Remove all listeners for all event types.
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}
