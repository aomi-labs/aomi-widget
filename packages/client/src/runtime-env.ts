/** Read an optional Node-style environment value without requiring the
 * browser to provide a global `process` shim. */
export function runtimeEnv(name: string): string | undefined {
  return typeof process === "undefined" ? undefined : process.env[name];
}
