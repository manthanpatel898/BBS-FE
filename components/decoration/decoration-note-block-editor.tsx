import { useRef, useState } from 'react';
import { DecorationQuantityInput } from './decoration-quantity-input';
import { DecorationInventoryImagePicker } from './decoration-inventory-image-picker';
import type { DecorationItem } from '@/lib/auth/types';
import type { DecorationNoteBlock } from '@/lib/decoration/notes-builder-state';

const field = 'light-form-field min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400';

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
  const quantityExceeded =
    Boolean(catalogItem) &&
    block.quantity > (catalogItem?.availableQuantity ?? 0);

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
              className="absolute inset-0 h-full w-full object-cover"
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
                max={catalogItem?.availableQuantity}
                disabled={disabled}
                onCommit={(quantity) => onChange({ quantity })}
                className={`${field} mt-1`}
              />
            </label>
            {quantityExceeded && catalogItem ? (
              <p className="text-xs font-semibold text-red-600">
                Only {catalogItem.availableQuantity} available for this event.
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
                disabled={disabled || index === 0}
                onClick={() => onMove(-1)}
                className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Move up
              </button>
              <button
                type="button"
                disabled={disabled || index === count - 1}
                onClick={() => onMove(1)}
                className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Move down
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onRemove}
                className="ml-auto rounded-lg px-3 py-2 text-xs font-bold text-red-600"
              >
                Remove
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
