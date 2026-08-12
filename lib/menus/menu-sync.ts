import { MenuSyncConfirmationResult, MenuSyncPreview } from '@/lib/auth/types';

export type MenuSyncPhase = 'idle' | 'uploading' | 'preview' | 'confirming' | 'success' | 'error';
export type MenuSyncState = {
  phase: MenuSyncPhase;
  fileName: string;
  preview: MenuSyncPreview | null;
  result: MenuSyncConfirmationResult | null;
  errorMessage: string;
};
export const initialMenuSyncState: MenuSyncState = { phase: 'idle', fileName: '', preview: null, result: null, errorMessage: '' };
export type MenuSyncEvent =
  | { type: 'FILE_SELECTED'; fileName: string }
  | { type: 'UPLOAD_STARTED'; fileName: string }
  | { type: 'PREVIEW_RECEIVED'; preview: MenuSyncPreview }
  | { type: 'CONFIRM_STARTED' }
  | { type: 'CONFIRM_SUCCEEDED'; result: MenuSyncConfirmationResult }
  | { type: 'REQUEST_FAILED'; message: string }
  | { type: 'RESET' };

export function menuSyncReducer(state: MenuSyncState, event: MenuSyncEvent): MenuSyncState {
  switch (event.type) {
    case 'FILE_SELECTED': return { ...initialMenuSyncState, fileName: event.fileName };
    case 'UPLOAD_STARTED': return { phase: 'uploading', fileName: event.fileName, preview: null, result: null, errorMessage: '' };
    case 'PREVIEW_RECEIVED': return { ...state, phase: 'preview', preview: event.preview, result: null, errorMessage: '' };
    case 'CONFIRM_STARTED': return { ...state, phase: 'confirming', errorMessage: '' };
    case 'CONFIRM_SUCCEEDED': return { ...state, phase: 'success', result: event.result, errorMessage: '' };
    case 'REQUEST_FAILED': return { ...state, phase: state.preview ? 'preview' : 'error', errorMessage: event.message };
    case 'RESET': return initialMenuSyncState;
  }
}

export function canConfirmMenuSync(state: MenuSyncState): boolean {
  return Boolean(state.phase === 'preview' && state.preview?.canConfirm && state.preview.issues.every((issue) => issue.severity !== 'ERROR') && new Date(state.preview.expiresAt).getTime() > Date.now());
}
