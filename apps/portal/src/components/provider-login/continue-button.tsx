"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import {
  PORTAL_PROVIDER_LABELS,
  type PortalEmbeddedProvider,
} from "@portal/lib/provider-login/types";

export function PortalProviderContinueButton({
  complete,
  disabled,
  onClick,
  pending,
  provider,
}: {
  complete: boolean;
  disabled: boolean;
  onClick: () => void;
  pending: boolean;
  provider: PortalEmbeddedProvider;
}) {
  return (
    <button
      className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {complete ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : null}
      Continue with {PORTAL_PROVIDER_LABELS[provider]}
    </button>
  );
}
