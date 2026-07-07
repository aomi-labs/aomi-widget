"use client";

import { Button } from "@aomi-labs/widget-lib";
import {
  settingsCardClass,
  settingsCardTitleClass,
  settingsBodyTextClass,
  settingsPrimaryButtonClass,
} from "@portal/lib/settings-styles";
import { useSvmWalletBinding } from "./use-svm-wallet-binding";

/**
 * Settings action (c) for ralph row 52a: bind a client-connected Solana
 * wallet to the account. A Phantom/Solflare wallet has no `public_keys` row
 * until it proves possession here, so the kernel gate fails its transactions
 * closed (`signing_unbound_wallet`) until it's bound.
 *
 * Renders nothing when no Solana wallet is connected — this card is only
 * meaningful for the client-wallet case.
 */
export function SvmWalletBinding() {
  const { state, binding, canBind, bind } = useSvmWalletBinding();

  if (state.status === "no-wallet") {
    return null;
  }

  return (
    <div className={settingsCardClass}>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className={settingsCardTitleClass}>Solana signing</p>
          <p className={settingsBodyTextClass}>
            {describe(state)}
          </p>
        </div>
        {state.status === "unbound" && (
          <Button
            type="button"
            disabled={!canBind || binding}
            onClick={() => {
              void bind();
            }}
            className={settingsPrimaryButtonClass}
          >
            {binding ? "Waiting for signature…" : "Bind wallet"}
          </Button>
        )}
        {state.status === "error" && (
          <Button
            type="button"
            disabled={!canBind || binding}
            onClick={() => {
              void bind();
            }}
            className={settingsPrimaryButtonClass}
          >
            {binding ? "Waiting for signature…" : "Try binding again"}
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
      return "This Solana wallet isn't bound to your account yet. Sign a one-time message to bind it so it can approve transactions.";
    case "error":
      return `Couldn't check the binding: ${state.message}`;
    default:
      return "";
  }
}
