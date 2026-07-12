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
      ? "border-positive/40 bg-positive/10 text-positive"
      : state === "outdated"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-border bg-surface-2 text-dim";
  return (
    <span
      data-testid="sdk-badge"
      data-state={state}
      className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${tone}`}
    >
      {stamped ?? "no SDK"}
    </span>
  );
}
