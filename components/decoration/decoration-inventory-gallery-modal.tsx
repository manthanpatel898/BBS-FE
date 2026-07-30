'use client';

import { useMemo, useState } from 'react';
import type {
  DecorationCategory,
  DecorationItem,
} from '@/lib/auth/types';
import {
  filterInventoryItems,
  getInventoryCoverImage,
  getInventoryDisabledReason,
} from '@/lib/decoration/inventory-gallery';
import { decorationImageFitClass } from '@/lib/decoration/image-display-mode';

export type DecorationInventoryGalleryModalProps = {
  categories: DecorationCategory[];
  items: DecorationItem[];
  selectedItemIds: Set<string>;
  onSelect: (item: DecorationItem) => void;
};

export function DecorationInventoryGalleryModal({
  categories,
  items,
  selectedItemIds,
  onSelect,
}: DecorationInventoryGalleryModalProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brokenItemIds, setBrokenItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const categoriesForSelection = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );
  const visibleItems = useMemo(
    () =>
      filterInventoryItems(
        items,
        categoriesForSelection,
        query,
        categoryId,
      ),
    [categoriesForSelection, categoryId, items, query],
  );
  const categoryNames = useMemo(
    () =>
      new Map(
        categoriesForSelection.map((category) => [
          category.id,
          category.name,
        ]),
      ),
    [categoriesForSelection],
  );

  return (
    <section aria-label="Existing inventory" className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Search inventory
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sofa, entry, stage…"
          className="light-form-field mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 placeholder:text-slate-400"
        />
      </label>
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Decoration type filters"
      >
        <button
          type="button"
          aria-pressed={!categoryId}
          onClick={() => setCategoryId('')}
          className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-bold ${
            !categoryId
              ? 'bg-slate-950 text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          All
        </button>
        {categoriesForSelection.map((category) => (
          <button
            type="button"
            key={category.id}
            aria-pressed={categoryId === category.id}
            onClick={() => setCategoryId(category.id)}
            className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-bold ${
              categoryId === category.id
                ? 'bg-slate-950 text-white'
                : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      {visibleItems.length ? (
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-3">
          {visibleItems.map((item) => {
            const cover = getInventoryCoverImage(item);
            const disabledReason = brokenItemIds.has(item.id)
              ? 'Image required'
              : getInventoryDisabledReason(item);
            const selected = selectedItemIds.has(item.id);
            const status = selected
              ? 'Already selected'
              : disabledReason ?? `${item.availableQuantity} available`;
            const categoryName =
              categoryNames.get(item.categoryId) ?? 'Decoration';
            return (
              <button
                type="button"
                key={item.id}
                disabled={Boolean(disabledReason) || selected}
                aria-label={`${item.name}, ${categoryName}, ${status}`}
                onClick={() => onSelect(item)}
                className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed ${
                  selected
                    ? 'border-amber-500 ring-1 ring-amber-400'
                    : disabledReason
                      ? 'border-slate-200 opacity-65'
                      : item.availableQuantity === 0
                        ? 'border-amber-300'
                        : 'border-slate-200 active:scale-[0.99]'
                }`}
              >
                <div className="aspect-[4/3] bg-slate-100">
                  {cover && !brokenItemIds.has(item.id) ? (
                    <img
                      src={cover.url}
                      alt={item.name}
                      onError={() =>
                        setBrokenItemIds((current) => {
                          const next = new Set(current);
                          next.add(item.id);
                          return next;
                        })
                      }
                      className={`h-full w-full ${decorationImageFitClass(cover.displayMode)}`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-sm font-semibold text-slate-500">
                      Image required
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <strong className="line-clamp-2 block text-sm text-slate-950">
                    {item.name}
                  </strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {categoryName}
                  </span>
                  <span
                    className={`mt-2 block text-xs font-bold ${
                      selected
                        ? 'text-amber-700'
                        : item.availableQuantity === 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-bold text-slate-950">No inventory found</p>
          <p className="mt-1 text-sm text-slate-600">
            Try another search or decoration type.
          </p>
        </div>
      )}
    </section>
  );
}
