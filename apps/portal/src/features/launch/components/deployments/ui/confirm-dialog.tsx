export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
      >
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-2 text-sm text-zinc-600">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
