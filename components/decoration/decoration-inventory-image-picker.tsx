'use client';

import {
  useEffect,
  useState,
  type RefObject,
} from 'react';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import type { DecorationItem } from '@/lib/auth/types';

type InventoryImage = DecorationItem['images'][number];

export function DecorationInventoryImagePicker({
  item,
  imageId,
  returnFocusRef,
  onSelect,
  onClose,
}: {
  item: DecorationItem;
  imageId?: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSelect: (image: InventoryImage) => void;
  onClose: () => void;
}) {
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  useModalViewport(onClose);

  useEffect(
    () => () => {
      queueMicrotask(() => returnFocusRef.current?.focus());
    },
    [returnFocusRef],
  );

  const images = item.images.filter(
    (image) => image.id && image.key?.trim() && image.url.trim(),
  );

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-950/65 sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Choose presentation image"
      >
        <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                {item.name}
              </p>
              <h2 className="text-xl font-bold text-slate-950">
                Choose presentation image
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close image picker"
              onClick={onClose}
              className="h-11 w-11 shrink-0 rounded-full border border-slate-300 bg-white text-2xl text-slate-700"
            >
              ×
            </button>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-3">
              {images.map((image, index) => {
                const selected = image.id === imageId;
                const broken = brokenImageIds.has(image.id);
                return (
                  <button
                    type="button"
                    key={image.id}
                    aria-pressed={selected}
                    disabled={broken}
                    aria-label={`${item.name} image ${index + 1}${selected ? ', selected' : ''}`}
                    onClick={() => {
                      onSelect(image);
                      onClose();
                    }}
                    className={`overflow-hidden rounded-2xl border bg-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      selected
                        ? 'border-amber-500 ring-2 ring-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {broken ? (
                      <div className="flex aspect-[4/3] items-center justify-center text-sm font-semibold text-slate-500">
                        Image unavailable
                      </div>
                    ) : (
                      <img
                        src={image.url}
                        alt=""
                        onError={() =>
                          setBrokenImageIds((current) => {
                            const next = new Set(current);
                            next.add(image.id);
                            return next;
                          })
                        }
                        className="aspect-[4/3] w-full object-cover"
                      />
                    )}
                    <span className="block bg-white px-3 py-2 text-xs font-bold text-slate-700">
                      {selected
                        ? 'Current image'
                        : image.isCover
                          ? 'Cover image'
                          : 'Use this image'}
                    </span>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </BodyPortal>
  );
}
