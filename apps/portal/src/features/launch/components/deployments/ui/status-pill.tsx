export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "ready" || value === "live" || value === "recorded"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "failed"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <span
      className={`aomi-eyebrow inline-flex h-6 items-center rounded-full border px-2 ${tone}`}
    >
      {value}
    </span>
  );
}
