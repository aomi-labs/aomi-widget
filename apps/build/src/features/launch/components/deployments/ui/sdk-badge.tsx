import { sdkCompatibility } from "../sdk-compatibility";

export function SdkBadge({
  stamped,
  required,
  label,
}: {
  stamped?: string | null;
  required?: string | null;
  label?: string | null;
}) {
  const compatibility = sdkCompatibility(stamped, required);
  const state =
    compatibility === "current"
      ? "ok"
      : compatibility === "outdated"
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
      className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-[0.05em] whitespace-nowrap ${tone}`}
    >
      {label ?? stamped ?? "SDK unknown"}
    </span>
  );
}
