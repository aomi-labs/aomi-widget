"use client";

/**
 * Small "?" affordance whose explainer appears on hover/focus. Pure CSS
 * positioning (no portal) so it can sit inside timeline rows, the upgrade
 * rail, and the deployment-detail panel alike.
 */
export function HintBubble({
  label,
  side = "top",
  children,
}: {
  /** Accessible name for the trigger, e.g. "About the merge step". */
  label: string;
  side?: "top" | "bottom";
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="border-border text-dim hover:text-foreground inline-grid size-4 cursor-help place-items-center rounded-full border text-[10px] font-semibold leading-none"
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`border-border bg-surface-1 text-foreground pointer-events-none absolute left-1/2 z-30 w-60 -translate-x-1/2 rounded-md border p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
