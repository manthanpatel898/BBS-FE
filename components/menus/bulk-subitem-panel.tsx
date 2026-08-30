'use client';

import { useMemo, useState } from 'react';
import { parseBulkSubitems } from '@/lib/menus/bulk-subitems';

type Props = {
  existingItems: string[];
  onAdd: (items: string[]) => void;
};

export function BulkSubitemPanel({ existingItems, onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const preview = useMemo(
    () => parseBulkSubitems(value, existingItems),
    [existingItems, value],
  );
  const skippedCount = preview.duplicates.length + preview.existing.length;

  const addItems = () => {
    if (!preview.accepted.length) return;
    onAdd(preview.accepted);
    setValue('');
  };

  return (
    <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3 sm:p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">Bulk add subitems</span>
          <span className="mt-0.5 block text-xs text-slate-600">Paste one subitem on each line.</span>
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white text-lg font-semibold text-amber-700">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-4 border-t border-amber-200 pt-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              One subitem per line
            </span>
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={7}
              placeholder={'Mango Juice\nOrange Juice\nWatermelon Juice'}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          {value.trim() ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                {preview.accepted.length} ready to add
              </span>
              {skippedCount ? (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
                  {skippedCount} skipped
                </span>
              ) : null}
            </div>
          ) : null}

          {preview.existing.length ? (
            <p className="mt-2 text-xs text-slate-600">
              Already present: {preview.existing.join(', ')}
            </p>
          ) : null}
          {preview.duplicates.length ? (
            <p className="mt-1 text-xs text-slate-600">
              Duplicate lines: {preview.duplicates.join(', ')}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!preview.accepted.length}
            onClick={addItems}
            className="mt-4 w-full rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
          >
            Add {preview.accepted.length} subitem{preview.accepted.length === 1 ? '' : 's'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
