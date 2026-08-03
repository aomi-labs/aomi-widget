"use client";

import { formatWalletAddress } from "../../lib/wallet-kit";

export function DisconnectConfirmDialog({
  open,
  address,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  address?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const label = address ? formatWalletAddress(address) : "this wallet";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-dialog-title"
        className="border-aomi-border bg-aomi-raised relative w-full max-w-[400px] rounded-t-xl border border-b-0 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:rounded-lg sm:border-b sm:pb-6"
      >
        <h2
          id="disconnect-dialog-title"
          className="text-aomi-fg text-base font-semibold"
        >
          Disconnect wallet?
        </h2>
        <p className="text-aomi-muted mt-2 text-[14px] leading-5">
          Disconnects {label} and signs you out. Your chat history remains in
          your Aomi account.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border-aomi-border text-aomi-muted hover:text-aomi-fg h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="bg-aomi-danger text-aomi-on-danger h-9 rounded-full px-3.5 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
}
