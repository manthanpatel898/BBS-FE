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
  DecorationImageDisplayMode,
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

export type CustomCropModalProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (
    file: File,
    displayMode: DecorationImageDisplayMode,
  ) => void | Promise<void>;
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
  saveSelectionRequest?: typeof saveDecorationSelection;
  deleteDraftRequest?: typeof deleteDecorationSelectionDraft;
  uploadCustomImage?: typeof uploadCustomDecorationImage;
  materializeImage?: typeof materializeDecorationImageFile;
  CropModal?: ComponentType<CustomCropModalProps>;
};

type WorkspaceTab = 'inventory' | 'custom' | 'selected';

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
  saveSelectionRequest = saveDecorationSelection,
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
  const [workspaceTab, setWorkspaceTab] =
    useState<WorkspaceTab>('inventory');
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({
    blocks: {} as Record<string, string[]>,
    generalNotes: null as string | null,
  });
  const [changed, setChanged] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const customPhotoRef = useRef<HTMLButtonElement>(null);
  const selectedTabRef = useRef<HTMLButtonElement>(null);
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

  function selectInventory(item: DecorationItem) {
    const result = selectCatalogNoteBlock(state, item);
    if (result.added) {
      setState(result.state);
      setChanged((value) => value + 1);
    }
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

  async function upload(
    file: File,
    displayMode: DecorationImageDisplayMode,
  ) {
    if (!accessToken || uploading) return;
    const request = ++uploadRequest.current;
    setUploading(true);
    try {
      const stable = await materializeImage(file);
      const image = await uploadCustomImage(
        accessToken,
        booking.id,
        stable,
        displayMode,
      );
      if (alive.current && request === uploadRequest.current) {
        change((current) =>
          addCustomNoteBlock(current, { ...image, displayMode }),
        );
        setPending(null);
        setWorkspaceTab('selected');
        window.setTimeout(() => selectedTabRef.current?.focus(), 0);
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
    setValidation(errors);
    if (
      Object.keys(errors.blocks).length ||
      errors.generalNotes
    ) {
      setError('Correct the highlighted note details.');
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
      const result = await saveSelectionRequest(
        accessToken,
        booking.id,
        payload.items,
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
                <div
                  role="tablist"
                  aria-label="Decoration selection workspace"
                  className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === 'inventory'}
                    onClick={() => setWorkspaceTab('inventory')}
                    className={`min-h-10 rounded-xl px-2 text-sm font-bold ${
                      workspaceTab === 'inventory'
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    Inventory · {selectedItemIds.size}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === 'custom'}
                    onClick={() => setWorkspaceTab('custom')}
                    className={`min-h-10 rounded-xl px-2 text-sm font-bold ${
                      workspaceTab === 'custom'
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    Custom Photo
                  </button>
                  <button
                    ref={selectedTabRef}
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === 'selected'}
                    onClick={() => setWorkspaceTab('selected')}
                    className={`min-h-10 rounded-xl px-2 text-sm font-bold ${
                      workspaceTab === 'selected'
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    Selected · {state.blocks.length}
                  </button>
                </div>
                {workspaceTab === 'inventory' ? (
                  <DecorationInventoryGalleryModal
                    categories={categories}
                    items={items}
                    selectedItemIds={selectedItemIds}
                    onSelect={selectInventory}
                  />
                ) : null}
                {workspaceTab === 'custom' ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-bold text-slate-950">
                      Add a custom photo note
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Use your camera or gallery for a decoration not listed in inventory.
                    </p>
                    <button
                      ref={customPhotoRef}
                      type="button"
                      disabled={saving || uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 min-h-12 w-full rounded-xl bg-amber-500 px-4 font-bold text-slate-950"
                    >
                      {uploading
                        ? 'Uploading custom photo…'
                        : 'Add Custom Photo Note'}
                    </button>
                  </section>
                ) : null}
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
                {workspaceTab === 'selected' && !state.blocks.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                    Select inventory or add a custom photo note.
                  </div>
                ) : null}
                {workspaceTab === 'selected' ? state.blocks.map((block, index) => {
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
                }) : null}
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
            <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end sm:justify-end">
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
