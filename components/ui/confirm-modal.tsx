'use client';

import { CommonModal } from './common-modal';
import { LoadingButton } from './loading-button';

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
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
        >
          Cancel
        </button>
        <LoadingButton
          type="button"
          disabled={isLoading}
          onClick={onConfirm}
          isLoading={isLoading}
          className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60 sm:w-auto"
        >
          {confirmLabel}
        </LoadingButton>
      </div>
    </CommonModal>
  );
}
