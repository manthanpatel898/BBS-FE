'use client';

import { CommonModal } from './common-modal';

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  isLoading = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <CommonModal title={title} description={message} onClose={onCancel} widthClassName="max-w-md">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={onConfirm}
          className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
        >
          {isLoading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </CommonModal>
  );
}
