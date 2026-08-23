"use client";

import {
  PORTAL_PROVIDER_LABELS,
  type PortalEmbeddedProvider,
} from "@portal/lib/provider-login/types";

export function PortalProviderPicker({
  onSelect,
  order,
}: {
  onSelect: (provider: PortalEmbeddedProvider) => void;
  order: readonly PortalEmbeddedProvider[];
}) {
  return (
    <div className="mt-6 grid gap-3">
      {order.map((provider, index) => (
        <button
          className={
            index === 0
              ? "bg-foreground text-background h-11 rounded-md px-4 text-sm font-medium"
              : "border-border h-11 rounded-md border px-4 text-sm font-medium"
          }
          key={provider}
          onClick={() => onSelect(provider)}
          type="button"
        >
          Continue with {PORTAL_PROVIDER_LABELS[provider]}
        </button>
      ))}
    </div>
  );
}
