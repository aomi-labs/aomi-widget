import "server-only";

/**
 * Run `task` over `items` with at most `limit` in flight, preserving order.
 *
 * Rejections propagate — this is for fan-outs where a failure must fail the
 * whole read. Fan-outs that should degrade per item (dropping a bad source and
 * rendering the rest) want a settling variant instead.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  );
  return results;
}
