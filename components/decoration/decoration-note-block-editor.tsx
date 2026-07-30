import { useRef, useState } from 'react';
import { DecorationQuantityInput } from './decoration-quantity-input';
import { DecorationInventoryImagePicker } from './decoration-inventory-image-picker';
import type { DecorationItem } from '@/lib/auth/types';
import type { DecorationNoteBlock } from '@/lib/decoration/notes-builder-state';
import { inventoryShortage } from '@/lib/decoration/inventory-shortage';
import { decorationImageFitClass } from '@/lib/decoration/image-display-mode';

const field = 'light-form-field min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400';

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DecorationNoteBlockEditor({
  block,
  index,
  count,
  catalogItem,
  categoryName,
  errors,
  disabled,
  onChange,
  onImageChange,
  onMove,
  onRemove,
}: {
  block: DecorationNoteBlock;
  index: number;
  count: number;
  catalogItem?: DecorationItem;
  categoryName?: string;
  errors?: string[];
  disabled: boolean;
  onChange: (patch: Partial<DecorationNoteBlock>) => void;
  onImageChange: (image: DecorationItem['images'][number]) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const changeImageRef = useRef<HTMLButtonElement>(null);
  const shortage = catalogItem
    ? inventoryShortage(block.quantity, catalogItem.availableQuantity)
    : null;

  return (
    <>
      <article
        data-note-id={block.clientId}
        tabIndex={-1}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <div className="grid gap-0 md:grid-cols-[minmax(220px,40%)_1fr]">
          <div className="relative min-h-52 bg-slate-100">
            <img
              src={block.image.url}
              alt={block.title || `Decoration note ${index + 1}`}
              className={`absolute inset-0 h-full w-full ${decorationImageFitClass(block.image.displayMode)}`}
            />
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">
              Image {index + 1}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-slate-50 p-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {catalogItem ? 'Catalog item' : 'Custom item'}
                </span>
                {catalogItem ? (
                  <>
                    <p className="font-bold text-slate-950">
                      {catalogItem.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {categoryName ?? 'Decoration'} ·{' '}
                      <span className="font-semibold text-emerald-700">
                        {catalogItem.availableQuantity} available
                      </span>
                    </p>
                  </>
                ) : null}
              </div>
              {catalogItem && catalogItem.images.length > 1 ? (
                <button
                  ref={changeImageRef}
                  type="button"
                  disabled={disabled}
                  onClick={() => setImagePickerOpen(true)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
                >
                  Change image
                </button>
              ) : null}
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Title <span className="text-red-600">*</span>
              <input
                value={block.title}
                disabled={disabled}
                onChange={(event) => onChange({ title: event.target.value })}
                className={`${field} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Quantity <span className="text-red-600">*</span>
              <DecorationQuantityInput
                ariaLabel={`Quantity for image ${index + 1}`}
                value={block.quantity}
                disabled={disabled}
                onCommit={(quantity) => onChange({ quantity })}
                className={`${field} mt-1`}
              />
            </label>
            {shortage ? (
              <p
                role="status"
                className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900"
              >
                {shortage.message}
              </p>
            ) : null}
            <label className="block text-sm font-semibold text-slate-700">
              Description (optional)
              <textarea
                rows={3}
                value={block.description}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ description: event.target.value })
                }
                className={`${field} mt-1`}
              />
            </label>
            {errors?.map((error) => (
              <p key={error} className="text-xs font-semibold text-red-600">
                {error}
              </p>
            ))}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                aria-label="Move decoration note up"
                title="Move decoration note up"
                disabled={disabled || index === 0}
                onClick={() => onMove(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronIcon direction="up" />
              </button>
              <button
                type="button"
                aria-label="Move decoration note down"
                title="Move decoration note down"
                disabled={disabled || index === count - 1}
                onClick={() => onMove(1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronIcon direction="down" />
              </button>
              <button
                type="button"
                aria-label="Remove decoration note"
                title="Remove decoration note"
                disabled={disabled}
                onClick={onRemove}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      </article>
      {imagePickerOpen && catalogItem ? (
        <DecorationInventoryImagePicker
          item={catalogItem}
          imageId={block.imageId}
          returnFocusRef={changeImageRef}
          onSelect={onImageChange}
          onClose={() => setImagePickerOpen(false)}
        />
      ) : null}
    </>
  );
}
