'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createDecorationNotesAutosave,
  type DraftSaveView,
} from '@/lib/decoration/notes-autosave';
import type { DecorationDraftBlock, DecorationSelectionDraft } from '@/lib/auth/types';

export type DecorationDraftPayload = {
  revision: number;
  blocks: DecorationDraftBlock[];
  generalNotes: string | null;
  finalPackagePrice: string;
};

export function useDecorationNotesAutosave({
  draft,
  enabled,
  save,
  discardDraft,
}: {
  draft: DecorationDraftPayload | null;
  enabled: boolean;
  save: (
    draft: DecorationDraftPayload,
    signal: AbortSignal,
  ) => Promise<DecorationSelectionDraft>;
  discardDraft: () => Promise<void>;
}) {
  const [view, setView] = useState<DraftSaveView>({
    status: 'idle',
    error: null,
  });
  const [runtime] = useState(() => {
    let activeAbort: AbortController | null = null;
    const controller = createDecorationNotesAutosave({
      save: async (_payload: DecorationDraftPayload) => {
        throw new Error('Draft save is not ready.');
      },
      onChange: setView,
    });
    return {
      controller,
      setSave(nextSave: typeof save) {
        controller.setSave(async (payload) => {
          activeAbort?.abort();
          activeAbort = new AbortController();
          return nextSave(payload, activeAbort.signal);
        });
      },
      abort() {
        activeAbort?.abort();
      },
    };
  });

  useEffect(() => runtime.setSave(save), [runtime, save]);

  useEffect(() => {
    if (enabled && draft) runtime.controller.edit(draft);
  }, [draft, enabled, runtime]);

  useEffect(
    () => () => {
      runtime.abort();
      runtime.controller.dispose();
    },
    [runtime],
  );

  const discard = useCallback(async () => {
    runtime.controller.discard();
    runtime.abort();
    await discardDraft();
  }, [discardDraft, runtime]);

  return {
    ...view,
    retry: runtime.controller.retry,
    flush: runtime.controller.flush,
    discard,
  };
}
