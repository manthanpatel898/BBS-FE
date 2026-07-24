'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import { DecorationImageCropModal } from './decoration-image-crop-modal';
import { DecorationInventoryGalleryModal } from './decoration-inventory-gallery-modal';
import { DecorationNoteBlockEditor } from './decoration-note-block-editor';
import { DecorationGeneralNotes } from './decoration-general-notes';
import { useDecorationNotesAutosave } from './use-decoration-notes-autosave';
import {
  deleteDecorationSelectionDraft,
  fetchDecorationAvailability,
  fetchDecorationCategories,
  fetchDecorationItems,
  fetchDecorationSelectionDraft,
  saveDecorationSelection,
  saveDecorationSelectionDraft,
  uploadCustomDecorationImage,
} from '@/lib/auth/api';
import type {
  DecorationBooking,
  DecorationCategory,
  DecorationItem,
} from '@/lib/auth/types';
import {
  addCustomNoteBlock,
  buildDecorationDraftPayload,
  buildDecorationFinalPayload,
  hydrateDecorationNotes,
  moveDecorationNoteBlock,
  removeDecorationNoteBlock,
  selectCatalogNoteBlock,
  selectCatalogNoteImage,
  updateDecorationNoteBlock,
  validateDecorationNotesForFinalSave,
  type DecorationNotesState,
} from '@/lib/decoration/notes-builder-state';
import {
  materializeDecorationImageFile,
  validateDecorationImageFile,
} from '@/lib/decoration/catalog-images';
import { applyDecorationAvailability } from '@/lib/decoration/availability';
import { decorationReservationErrorMessage } from '@/lib/decoration/reservation-error';
import { validateDecorationSelectionPrice } from '@/lib/decoration/selection-price';

export type CustomCropModalProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

type Props = {
  booking: DecorationBooking;
  onClose: () => void;
  onSaved: (booking: DecorationBooking) => void;
  accessToken?: string | null;
  loadCategories?: typeof fetchDecorationCategories;
  loadItems?: typeof fetchDecorationItems;
  loadAvailability?: typeof fetchDecorationAvailability;
  loadDraft?: typeof fetchDecorationSelectionDraft;
  saveDraftRequest?: typeof saveDecorationSelectionDraft;
  deleteDraftRequest?: typeof deleteDecorationSelectionDraft;
  uploadCustomImage?: typeof uploadCustomDecorationImage;
  materializeImage?: typeof materializeDecorationImageFile;
  CropModal?: ComponentType<CustomCropModalProps>;
};

export function DecorationSelectionModal(props: Props) {
  const auth = useAuth();
  return (
    <DecorationSelectionModalContent
      {...props}
      loadAvailability={
        props.loadAvailability ?? fetchDecorationAvailability
      }
      accessToken={
        props.accessToken === undefined ? auth.accessToken : props.accessToken
      }
    />
  );
}

export function DecorationSelectionModalContent({
  booking,
  onClose,
  onSaved,
  accessToken,
  loadCategories = fetchDecorationCategories,
  loadItems = fetchDecorationItems,
  loadAvailability,
  loadDraft = fetchDecorationSelectionDraft,
  saveDraftRequest = saveDecorationSelectionDraft,
  deleteDraftRequest = deleteDecorationSelectionDraft,
  uploadCustomImage = uploadCustomDecorationImage,
  materializeImage = materializeDecorationImageFile,
  CropModal = DecorationImageCropModal,
}: Props) {
  const [state, setState] = useState<DecorationNotesState>(() =>
    hydrateDecorationNotes(booking.decorationSnapshot ?? [], null),
  );
  const [categories, setCategories] = useState<DecorationCategory[]>([]);
  const [items, setItems] = useState<DecorationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({
    blocks: {} as Record<string, string[]>,
    generalNotes: null as string | null,
  });
  const [changed, setChanged] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const browseInventoryRef = useRef<HTMLButtonElement>(null);
  const customPhotoRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRequest = useRef(0);
  const uploadRequest = useRef(0);
  const alive = useRef(true);
  useModalViewport(onClose, saving || uploading);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const abort = new AbortController();
    setLoading(true);
    Promise.all([
      loadCategories(accessToken),
      loadItems(accessToken),
      loadAvailability?.(accessToken, booking.id),
      loadDraft(accessToken, booking.id, abort.signal),
    ])
      .then(([nextCategories, catalog, availability, draft]) => {
        if (abort.signal.aborted) return;
        setCategories(nextCategories);
        setItems(applyDecorationAvailability(catalog, availability));
        setState(
          hydrateDecorationNotes(booking.decorationSnapshot ?? [], draft),
        );
        setHasDraft(Boolean(draft));
      })
      .catch((reason) => {
        if (!abort.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load decoration notes.',
          );
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [
    accessToken,
    booking.id,
    booking.decorationSnapshot,
    loadAvailability,
    loadCategories,
    loadDraft,
    loadItems,
  ]);

  const draft = useMemo(
    () => (changed ? buildDecorationDraftPayload(state) : null),
    [changed, state],
  );
  const saveDraft = useCallback(
    (
      payload: ReturnType<typeof buildDecorationDraftPayload>,
      signal: AbortSignal,
    ) => saveDraftRequest(accessToken!, booking.id, payload, signal),
    [accessToken, booking.id, saveDraftRequest],
  );
  const discardDraft = useCallback(async () => {
    if (accessToken) await deleteDraftRequest(accessToken, booking.id);
    setState(hydrateDecorationNotes(booking.decorationSnapshot ?? [], null));
    setChanged(0);
    setHasDraft(false);
  }, [
    accessToken,
    booking.decorationSnapshot,
    booking.id,
    deleteDraftRequest,
  ]);
  const autosave = useDecorationNotesAutosave({
    draft,
    enabled: Boolean(accessToken) && !loading,
    save: saveDraft,
    discardDraft,
  });

  const change = (
    transition: (current: DecorationNotesState) => DecorationNotesState,
  ) => {
    setState((current) => {
      const next = transition(current);
      if (next !== current) setChanged((value) => value + 1);
      return next;
    });
  };

  const selectedItemIds = useMemo(
    () =>
      new Set(
        state.blocks
          .map((block) => block.itemId)
          .filter((itemId): itemId is string => Boolean(itemId)),
      ),
    [state.blocks],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  function focusNote(clientId: string) {
    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-note-id="${clientId}"]`)
        ?.focus();
    }, 0);
  }

  function selectInventory(item: DecorationItem) {
    const result = selectCatalogNoteBlock(state, item);
    if (result.added) {
      setState(result.state);
      setChanged((value) => value + 1);
    }
    setGalleryOpen(false);
    if (result.selectedClientId) focusNote(result.selectedClientId);
  }

  async function source(file: File) {
    const message = validateDecorationImageFile(file, 0);
    if (message) {
      setError(message);
      return;
    }
    const request = ++selectionRequest.current;
    try {
      const stable = await materializeImage(file);
      if (alive.current && request === selectionRequest.current) {
        setPending(stable);
      }
    } catch (reason) {
      if (alive.current && request === selectionRequest.current) {
        setError(
          reason instanceof Error ? reason.message : 'Unable to read image.',
        );
      }
    }
  }

  async function upload(file: File) {
    if (!accessToken || uploading) return;
    const request = ++uploadRequest.current;
    setUploading(true);
    try {
      const stable = await materializeImage(file);
      const image = await uploadCustomImage(
        accessToken,
        booking.id,
        stable,
      );
      if (alive.current && request === uploadRequest.current) {
        change((current) => addCustomNoteBlock(current, image));
        setPending(null);
      }
    } catch (reason) {
      if (alive.current && request === uploadRequest.current) {
        setError(
          reason instanceof Error ? reason.message : 'Unable to upload image.',
        );
      }
    } finally {
      if (alive.current && request === uploadRequest.current) {
        setUploading(false);
      }
    }
  }

  async function refreshAvailability() {
    if (!accessToken || !loadAvailability) return;
    try {
      const availability = await loadAvailability(accessToken, booking.id);
      setItems((current) =>
        applyDecorationAvailability(current, availability),
      );
    } catch {
      // The original reservation error remains the actionable message.
    }
  }

  async function finalSave() {
    if (!accessToken) return;
    const errors = validateDecorationNotesForFinalSave(state);
    for (const block of state.blocks) {
      const item = items.find((entry) => entry.id === block.itemId);
      if (item && block.quantity > item.availableQuantity) {
        errors.blocks[block.clientId] = [
          ...(errors.blocks[block.clientId] ?? []),
          `Only ${item.availableQuantity} available for this event.`,
        ];
      }
    }
    const priceError = validateDecorationSelectionPrice(
      state.finalPackagePrice,
      booking.totalCollected,
    );
    setValidation(errors);
    if (
      Object.keys(errors.blocks).length ||
      errors.generalNotes ||
      priceError
    ) {
      setError(priceError ?? 'Correct the highlighted note details.');
      return;
    }
    if (!state.blocks.length) {
      setError('Add at least one photo note.');
      return;
    }
    setSaving(true);
    try {
      await autosave.flush();
      const payload = buildDecorationFinalPayload(state);
      const result = await saveDecorationSelection(
        accessToken,
        booking.id,
        payload.items,
        payload.finalPackagePrice,
        payload.customItems,
        payload.generalNotes,
      );
      onSaved(result.booking);
    } catch (reason) {
      setError(decorationReservationErrorMessage(reason));
      await refreshAvailability();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[75] flex items-end justify-center overflow-x-hidden bg-slate-950/55 sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Decoration Notes Builder"
      >
        <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 sm:h-[calc(100dvh-2.5rem)] sm:rounded-3xl">
          <header className="flex shrink-0 justify-between border-b bg-white p-4 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Decoration Notes Builder
              </p>
              <h2 className="text-xl font-bold text-slate-950">
                {booking.customer.name}
              </h2>
              <p className="text-sm text-slate-600">
                {autosave.status === 'saving'
                  ? 'Saving draft…'
                  : autosave.status === 'saved'
                    ? 'Draft saved'
                    : autosave.status === 'error'
                      ? 'Draft not saved'
                      : 'Select inventory or add a custom photo note'}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close Decoration Selection"
              disabled={saving || uploading}
              onClick={onClose}
              className="h-11 w-11 rounded-full border bg-white text-2xl text-slate-600"
            >
              ×
            </button>
          </header>

          <main className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {error || autosave.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error || autosave.error}
                {autosave.status === 'error' ? (
                  <button
                    type="button"
                    onClick={() => void autosave.retry()}
                    className="ml-3 font-bold underline"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}
            {loading ? (
              <p className="py-20 text-center text-slate-600">
                Loading decoration notes…
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    ref={browseInventoryRef}
                    type="button"
                    disabled={saving}
                    onClick={() => setGalleryOpen(true)}
                    className="min-h-14 rounded-2xl bg-amber-500 px-5 text-left font-bold text-slate-950 shadow-sm"
                  >
                    Browse Existing Inventory
                  </button>
                  <button
                    ref={customPhotoRef}
                    type="button"
                    disabled={saving || uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-14 rounded-2xl border-2 border-slate-300 bg-white px-5 text-left font-bold text-slate-800"
                  >
                    {uploading
                      ? 'Uploading custom photo…'
                      : 'Add Custom Photo Note'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void source(file);
                    }}
                  />
                </div>
                {state.blocks.map((block, index) => {
                  const catalogItem = items.find(
                    (item) => item.id === block.itemId,
                  );
                  return (
                    <DecorationNoteBlockEditor
                      key={block.clientId}
                      block={block}
                      index={index}
                      count={state.blocks.length}
                      catalogItem={catalogItem}
                      categoryName={
                        catalogItem
                          ? categoryNames.get(catalogItem.categoryId)
                          : undefined
                      }
                      errors={validation.blocks[block.clientId]}
                      disabled={saving}
                      onChange={(patch) =>
                        change((current) =>
                          updateDecorationNoteBlock(
                            current,
                            block.clientId,
                            patch,
                          ),
                        )
                      }
                      onImageChange={(image) =>
                        change((current) =>
                          selectCatalogNoteImage(
                            current,
                            block.clientId,
                            image,
                          ),
                        )
                      }
                      onMove={(direction) =>
                        change((current) =>
                          moveDecorationNoteBlock(
                            current,
                            block.clientId,
                            direction,
                          ),
                        )
                      }
                      onRemove={() =>
                        change((current) =>
                          removeDecorationNoteBlock(
                            current,
                            block.clientId,
                          ),
                        )
                      }
                    />
                  );
                })}
                <DecorationGeneralNotes
                  value={state.generalNotes}
                  disabled={saving}
                  error={validation.generalNotes}
                  onChange={(value) =>
                    change((current) => ({
                      ...current,
                      generalNotes: value,
                    }))
                  }
                />
              </>
            )}
          </main>

          <footer className="safe-pad-bottom shrink-0 border-t bg-white/95 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="text-sm font-semibold text-slate-700">
                Final Package Price
                <input
                  type="number"
                  min="0"
                  value={state.finalPackagePrice}
                  onChange={(event) =>
                    change((current) => ({
                      ...current,
                      finalPackagePrice: event.target.value,
                    }))
                  }
                  className="light-form-field mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-slate-950"
                />
              </label>
              <button
                type="button"
                disabled={!(hasDraft || changed) || saving}
                onClick={() => {
                  if (
                    confirm(
                      'Discard saved draft and restore the finalized selection?',
                    )
                  ) {
                    void autosave.discard();
                  }
                }}
                className="rounded-xl border px-5 py-3 font-bold text-red-600"
              >
                Discard Draft
              </button>
              <button
                type="button"
                disabled={loading || saving || uploading}
                onClick={() => void finalSave()}
                className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950"
              >
                {saving ? 'Saving…' : `Save ${state.blocks.length} notes`}
              </button>
            </div>
          </footer>
        </div>
      </div>
      {galleryOpen ? (
        <DecorationInventoryGalleryModal
          categories={categories}
          items={items}
          selectedItemIds={selectedItemIds}
          returnFocusRef={browseInventoryRef}
          onSelect={selectInventory}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
      {pending ? (
        <CropModal
          file={pending}
          busy={uploading}
          returnFocusRef={customPhotoRef}
          onCancel={() => setPending(null)}
          onConfirm={upload}
        />
      ) : null}
    </BodyPortal>
  );
}
