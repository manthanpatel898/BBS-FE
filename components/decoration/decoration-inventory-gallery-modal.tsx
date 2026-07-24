'use client';

import {
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import type {
  DecorationCategory,
  DecorationItem,
} from '@/lib/auth/types';
import {
  filterInventoryItems,
  getInventoryCoverImage,
  getInventoryDisabledReason,
} from '@/lib/decoration/inventory-gallery';

export type DecorationInventoryGalleryModalProps = {
  categories: DecorationCategory[];
  items: DecorationItem[];
  selectedItemIds: Set<string>;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSelect: (item: DecorationItem) => void;
  onClose: () => void;
};

export function DecorationInventoryGalleryModal({
  categories,
  items,
  selectedItemIds,
  returnFocusRef,
  onSelect,
  onClose,
}: DecorationInventoryGalleryModalProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brokenItemIds, setBrokenItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  useModalViewport(onClose);

  useEffect(
    () => () => {
      queueMicrotask(() => returnFocusRef.current?.focus());
    },
    [returnFocusRef],
  );

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );
  const visibleItems = useMemo(
    () => filterInventoryItems(items, activeCategories, query, categoryId),
    [activeCategories, categoryId, items, query],
  );
  const categoryNames = useMemo(
    () =>
      new Map(
        activeCategories.map((category) => [category.id, category.name]),
      ),
    [activeCategories],
  );

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center overflow-x-hidden bg-slate-950/60 sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Browse Existing Inventory"
      >
        <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 sm:h-[calc(100dvh-2.5rem)] sm:rounded-3xl">
          <header className="shrink-0 border-b border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  Decoration inventory
                </p>
                <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  Browse Existing Inventory
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Select by photo and check live availability.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close inventory gallery"
                onClick={onClose}
                className="h-11 w-11 shrink-0 rounded-full border border-slate-300 bg-white text-2xl text-slate-700"
              >
                ×
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Search inventory
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sofa, entry, stage…"
                className="light-form-field mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 placeholder:text-slate-400"
              />
            </label>
            <div
              className="mt-3 flex gap-2 overflow-x-auto pb-1"
              aria-label="Decoration type filters"
            >
              <button
                type="button"
                aria-pressed={!categoryId}
                onClick={() => setCategoryId('')}
                className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${
                  !categoryId
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                All
              </button>
              {activeCategories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  aria-pressed={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${
                    categoryId === category.id
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {visibleItems.length ? (
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {visibleItems.map((item) => {
                  const cover = getInventoryCoverImage(item);
                  const disabledReason = brokenItemIds.has(item.id)
                    ? 'Image required'
                    : getInventoryDisabledReason(item);
                  const selected = selectedItemIds.has(item.id);
                  const status = selected
                    ? 'Already selected'
                    : disabledReason ??
                      `${item.availableQuantity} available`;
                  const categoryName =
                    categoryNames.get(item.categoryId) ?? 'Decoration';

                  return (
                    <button
                      type="button"
                      key={item.id}
                      disabled={Boolean(disabledReason)}
                      aria-label={`${item.name}, ${categoryName}, ${status}`}
                      onClick={() => onSelect(item)}
                      className={`overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-amber-500 ring-1 ring-amber-400'
                          : disabledReason
                            ? 'border-slate-200 opacity-65'
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
                            className="h-full w-full object-cover"
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
                              : disabledReason
                                ? 'text-red-600'
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
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div>
                  <p className="font-bold text-slate-950">
                    No inventory found
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Try another search or decoration type.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </BodyPortal>
  );
}
