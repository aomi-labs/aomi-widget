export function SdkBadge({
  stamped,
  required,
}: {
  stamped?: string | null;
  required?: string | null;
}) {
  const state = !stamped
    ? "missing"
    : required && stamped === required
      ? "ok"
      : required
        ? "outdated"
        : "missing";
  const tone =
    state === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state === "outdated"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return (
    <span
      data-testid="sdk-badge"
      data-state={state}
      className={`aomi-numeric inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${tone}`}
    >
      {stamped ?? "no SDK"}
    </span>
  );
}
