'use client';

import { useMemo, useState } from 'react';
import { CommonModal } from '@/components/ui/common-modal';
import {
  buildBulkItemPreview,
  parseBulkItemFile,
  parseBulkItemText,
} from '@/lib/categories/bulk-menu-items';

export function BulkMenuItemsModal({
  title,
  existingItems,
  onApply,
  onClose,
}: {
  title: string;
  existingItems: string[];
  onApply: (items: string[]) => void;
  onClose: () => void;
}) {
  const [sourceItems, setSourceItems] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const preview = useMemo(
    () => buildBulkItemPreview(sourceItems, existingItems),
    [existingItems, sourceItems],
  );

  return (
    <CommonModal
      title={`Bulk add items to ${title}`}
      description="Paste one item per line or upload a CSV/XLSX file whose first column contains item names. Review the result before adding."
      onClose={onClose}
      widthClassName="max-w-2xl"
      zIndexClassName="z-[70]"
    >
      <div className="space-y-5">
        <label className="block space-y-2 text-sm font-semibold text-slate-700">
          Paste item names
          <textarea
            value={pastedText}
            onChange={(event) => {
              const text = event.target.value;
              setPastedText(text);
              setFileName('');
              setError('');
              setSourceItems(parseBulkItemText(text));
            }}
            className="min-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            placeholder={'Paneer Tikka\nVeg Manchurian\nSpring Roll'}
          />
        </label>

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />or upload file<span className="h-px flex-1 bg-slate-200" />
        </div>

        <label className="block space-y-2 text-sm font-semibold text-slate-700">
          CSV or Excel file
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={isReading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setIsReading(true);
              setError('');
              setFileName(file.name);
              void parseBulkItemFile(file)
                .then((items) => {
                  setPastedText('');
                  setSourceItems(items);
                })
                .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to read this file.'))
                .finally(() => setIsReading(false));
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:font-semibold file:text-amber-800"
          />
          {fileName ? <span className="block text-xs font-normal text-slate-500">Selected: {fileName}</span> : null}
        </label>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase text-emerald-700">Ready to add</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{preview.itemsToAdd.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-700">Duplicates skipped</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{preview.duplicates.length}</p>
          </div>
        </div>

        {preview.itemsToAdd.length ? (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</p>
            <ol className="space-y-1 text-sm text-slate-800">
              {preview.itemsToAdd.map((item, index) => <li key={`${item}-${index}`}>{index + 1}. {item}</li>)}
            </ol>
          </div>
        ) : null}

        <div className="sticky bottom-0 grid gap-2 border-t border-slate-200 bg-white pt-4 sm:flex sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700">Cancel</button>
          <button
            type="button"
            disabled={!preview.itemsToAdd.length || isReading || Boolean(error)}
            onClick={() => { onApply(preview.itemsToAdd); onClose(); }}
            className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add {preview.itemsToAdd.length} items
          </button>
        </div>
      </div>
    </CommonModal>
  );
}
