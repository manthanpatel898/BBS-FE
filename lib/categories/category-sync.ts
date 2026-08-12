import {
  CategorySyncConfirmationResult,
  CategorySyncPreview,
} from '@/lib/auth/types';

export type CategorySyncPhase =
  | 'idle'
  | 'uploading'
  | 'preview'
  | 'confirming'
  | 'success'
  | 'error';

export type CategorySyncState = {
  phase: CategorySyncPhase;
  fileName: string;
  preview: CategorySyncPreview | null;
  result: CategorySyncConfirmationResult | null;
  errorMessage: string;
};

export const initialCategorySyncState: CategorySyncState = {
  phase: 'idle',
  fileName: '',
  preview: null,
  result: null,
  errorMessage: '',
};

export type CategorySyncEvent =
  | { type: 'FILE_SELECTED'; fileName: string }
  | { type: 'UPLOAD_STARTED'; fileName: string }
  | { type: 'PREVIEW_RECEIVED'; preview: CategorySyncPreview }
  | { type: 'CONFIRM_STARTED' }
  | { type: 'CONFIRM_SUCCEEDED'; result: CategorySyncConfirmationResult }
  | { type: 'REQUEST_FAILED'; message: string }
  | { type: 'RESET' };

export function categorySyncReducer(
  state: CategorySyncState,
  event: CategorySyncEvent,
): CategorySyncState {
  switch (event.type) {
    case 'FILE_SELECTED':
      return {
        ...initialCategorySyncState,
        fileName: event.fileName,
      };
    case 'UPLOAD_STARTED':
      return {
        phase: 'uploading',
        fileName: event.fileName,
        preview: null,
        result: null,
        errorMessage: '',
      };
    case 'PREVIEW_RECEIVED':
      return {
        ...state,
        phase: 'preview',
        preview: event.preview,
        result: null,
        errorMessage: '',
      };
    case 'CONFIRM_STARTED':
      return { ...state, phase: 'confirming', errorMessage: '' };
    case 'CONFIRM_SUCCEEDED':
      return {
        ...state,
        phase: 'success',
        result: event.result,
        errorMessage: '',
      };
    case 'REQUEST_FAILED':
      return {
        ...state,
        phase: state.preview ? 'preview' : 'error',
        errorMessage: event.message,
      };
    case 'RESET':
      return initialCategorySyncState;
  }
}

export function canConfirmCategorySync(state: CategorySyncState): boolean {
  return Boolean(
    state.phase === 'preview' &&
      state.preview?.canConfirm &&
      state.preview.issues.every((issue) => issue.severity !== 'ERROR') &&
      new Date(state.preview.expiresAt).getTime() > Date.now(),
  );
}

export function hasCategoryDeactivationRisk(state: CategorySyncState): boolean {
  return (state.preview?.summary.deactivate ?? 0) > 0;
}
