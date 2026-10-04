'use client';

import { useState } from 'react';
import type {
  MenuSelectionItem,
  PendingMenuSelection,
  reconcileMenuSelections,
} from '@/lib/bookings/menu-selection-reconciliation';

export function MenuSelectionReview({
  review,
  onResolve,
}: {
  review: ReturnType<typeof reconcileMenuSelections>;
  onResolve: (
    item: PendingMenuSelection,
    replacement: MenuSelectionItem | null,
  ) => void;
}) {
  const [replacement, setReplacement] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<string | null>(null);
  if (!review.pending.length) return null;
  return (
    <section
      className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-slate-900 sm:p-4"
      aria-label="Selection review"
    >
      <h3 className="text-base font-bold">
        Previously selected — needs review
      </h3>
      <p className="mt-1 text-sm text-slate-700">
        {review.pending.length} saved items could not be safely matched to the
        current category. Replace or remove each item before saving. Your saved
        booking has not changed.
      </p>
      <ul className="mt-3 space-y-3">
        {review.pending.map((entry) => (
          <li
            key={entry.key}
            className="min-w-0 rounded-xl border border-amber-200 bg-white p-3"
          >
            <p className="break-words font-semibold">{entry.item}</p>
            <p className="mt-1 break-words text-xs text-slate-600">
              {entry.title || 'Previous menu'}
              {entry.sectionTitle ? ` · ${entry.sectionTitle}` : ''}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                aria-label={`Replace ${entry.item}`}
                value={replacement[entry.key] ?? ''}
                onChange={(event) =>
                  setReplacement((current) => ({
                    ...current,
                    [entry.key]: event.target.value,
                  }))
                }
                className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950"
              >
                <option value="">Choose a replacement…</option>
                {review.options.map((option, index) => (
                  <option key={index} value={index}>
                    {option.title}
                    {option.sectionTitle
                      ? ` / ${option.sectionTitle}`
                      : ''} — {option.item}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!replacement[entry.key]}
                onClick={() => {
                  const option = review.options[Number(replacement[entry.key])];
                  if (option) onResolve(entry, option);
                }}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 disabled:opacity-50"
              >
                Apply replacement
              </button>
              {removing === entry.key ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onResolve(entry, null);
                      setRemoving(null);
                    }}
                    className="min-h-11 rounded-xl bg-red-700 px-3 text-sm font-semibold text-white"
                  >
                    Confirm removal
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(null)}
                    className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                  >
                    Keep item
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${entry.item}`}
                  onClick={() => setRemoving(entry.key)}
                  className="min-h-11 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
