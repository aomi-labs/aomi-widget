/**
 * Read an environment variable defensively.
 *
 * The value is supplied through a thunk so the literal `process.env.X`
 * reference stays in the source — Next.js still inlines `NEXT_PUBLIC_*` vars at
 * build time — while the try/catch tolerates `process` being undefined in
 * pure-browser builds instead of throwing a ReferenceError.
 */
export function safeEnv(read: () => string | undefined): string | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}
