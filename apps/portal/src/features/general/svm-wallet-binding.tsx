"use client";

import { Button } from "@aomi-labs/widget-lib";
import {
  settingsBodyTextClass,
  settingsCardClass,
  settingsCardTitleClass,
  settingsPrimaryButtonClass,
} from "@portal/lib/settings-styles";
import { useSvmWalletBinding } from "./use-svm-wallet-binding";

export function SvmWalletBinding() {
  const { state, binding, canBind, bind } = useSvmWalletBinding();
  if (state.status === "no-wallet") return null;

  const action =
    state.status === "unbound"
      ? "Bind wallet"
      : state.status === "error"
        ? "Try binding again"
        : null;

  return (
    <div className={settingsCardClass} data-testid="svm-wallet-binding">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className={settingsCardTitleClass}>Solana signing</p>
          <p className={settingsBodyTextClass}>{describe(state)}</p>
        </div>
        {action && (
          <Button
            type="button"
            disabled={!canBind || binding}
            onClick={() => void bind()}
            className={settingsPrimaryButtonClass}
          >
            {binding ? "Waiting for signature…" : action}
          </Button>
        )}
      </div>
    </div>
  );
}

function describe(
  state: ReturnType<typeof useSvmWalletBinding>["state"],
): string {
  switch (state.status) {
    case "loading":
      return "Checking whether this wallet is bound…";
    case "bound":
      return `Bound to your account (signing mode: ${state.signingMode}).`;
    case "unbound":
      return "This Solana wallet is not bound yet. Sign one message to enable transaction approvals.";
    case "error":
      return `Could not check the binding: ${state.message}`;
    default:
      return "";
  }
}
