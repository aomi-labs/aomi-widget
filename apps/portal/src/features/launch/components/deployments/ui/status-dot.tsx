export function StatusDot({ state }: { state: string }) {
  const tone =
    state === "ready" || state === "live" || state === "recorded"
      ? "bg-emerald-500"
      : state === "failed"
        ? "bg-red-500"
        : "bg-zinc-400";
  return <span className={`size-2 rounded-full ${tone}`} />;
}
