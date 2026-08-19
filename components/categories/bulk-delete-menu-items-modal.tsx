'use client';

import { useState } from 'react';
import { BodyPortal } from '@/components/ui/body-portal';
import { CommonModal } from '@/components/ui/common-modal';

export function BulkDeleteMenuItemsModal({
  title,
  items,
  onDelete,
  onClose,
}: {
  title: string;
  items: string[];
  onDelete: (indexes: number[]) => void;
  onClose: () => void;
}) {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const selected = new Set(selectedIndexes);
  const allSelected = items.length > 0 && selectedIndexes.length === items.length;
  const actions = (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
      <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 sm:px-5">
        Cancel
      </button>
      <button
        type="button"
        disabled={!selectedIndexes.length}
        onClick={() => {
          onDelete(selectedIndexes);
          onClose();
        }}
        className="min-h-11 rounded-xl bg-red-600 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
      >
        Delete {selectedIndexes.length} selected
      </button>
    </div>
  );

  return (
    <BodyPortal>
      <CommonModal
      title={`Bulk delete items from ${title}`}
      description="Select the menu items you want to remove. This only changes the category draft until you save it."
      onClose={onClose}
      widthClassName="max-w-2xl"
      zIndexClassName="z-[70]"
      mobileFullScreen
      footer={actions}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            {selectedIndexes.length} of {items.length} selected
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIndexes(items.map((_, index) => index))}
              disabled={allSelected}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelectedIndexes([])}
              disabled={!selectedIndexes.length}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
          {items.map((item, index) => (
            <label
              key={`${index}-${item}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900"
            >
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={(event) =>
                  setSelectedIndexes((current) =>
                    event.target.checked
                      ? [...current, index]
                      : current.filter((value) => value !== index),
                  )
                }
                className="h-5 w-5 shrink-0 accent-red-600"
              />
              <span className="min-w-0 break-words">{item.trim() || `Blank item ${index + 1}`}</span>
            </label>
          ))}
        </div>

      </div>
      </CommonModal>
    </BodyPortal>
  );
}
