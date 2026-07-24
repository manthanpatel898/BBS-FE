export const DECORATION_NOTES_AUTOSAVE_DELAY_MS = 800;

export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type DraftSaveView = { status: DraftSaveStatus; error: string | null };
type Revisioned = { revision: number };
type Clock = {
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const browserClock: Clock = {
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: (handle) =>
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createDecorationNotesAutosave<
  T extends Revisioned,
  R extends Revisioned,
>({
  save,
  debounceMs = DECORATION_NOTES_AUTOSAVE_DELAY_MS,
  clock = browserClock,
  onChange,
}: {
  save: (draft: T) => Promise<R>;
  debounceMs?: number;
  clock?: Clock;
  onChange?: (state: DraftSaveView) => void;
}) {
  let saveOperation = save;
  let view: DraftSaveView = { status: 'idle', error: null };
  let pending: T | null = null;
  let active: Promise<void> | null = null;
  let timer: unknown;
  let disposed = false;
  let nextRevision = 0;

  const publish = (status: DraftSaveStatus, error: string | null = null) => {
    if (disposed) return;
    view = { status, error };
    onChange?.(view);
  };
  const clearTimer = () => {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
  };
  const pump = (): Promise<void> => {
    if (disposed || active || !pending) return active ?? Promise.resolve();
    clearTimer();
    const draft = pending;
    pending = null;
    publish('saving');
    active = saveOperation(draft)
      .then((saved) => {
        nextRevision = Math.max(nextRevision, saved.revision);
        if (!pending) publish('saved');
      })
      .catch((error: unknown) => {
        if (!pending) pending = draft;
        publish(
          'error',
          error instanceof Error ? error.message : 'Unable to save draft.',
        );
      })
      .finally(() => {
        active = null;
        if (pending && view.status !== 'error') void pump();
      });
    return active;
  };
  const schedule = () => {
    clearTimer();
    timer = clock.setTimeout(() => {
      timer = undefined;
      void pump();
    }, debounceMs);
  };
  const flush = async () => {
    clearTimer();
    while (!disposed && (pending || active)) {
      if (pending && !active) await pump();
      else if (active) await active;
      if (view.status === 'error') break;
    }
  };

  return {
    setSave(nextSave: (draft: T) => Promise<R>) {
      saveOperation = nextSave;
    },
    edit(draft: T) {
      if (disposed) return;
      nextRevision = Math.max(nextRevision + 1, draft.revision);
      pending = { ...draft, revision: nextRevision };
      publish('dirty');
      schedule();
    },
    flush,
    async retry() {
      if (disposed || !pending) return;
      publish('dirty');
      await pump();
    },
    discard() {
      clearTimer();
      pending = null;
      publish('idle');
    },
    dispose() {
      clearTimer();
      pending = null;
      disposed = true;
    },
    state: () => view,
  };
}
