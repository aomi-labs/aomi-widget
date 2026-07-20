export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerBunCompatHooks } = await import("./server/bun-compat");
  await registerBunCompatHooks();
}
