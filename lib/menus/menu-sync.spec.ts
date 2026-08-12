import * as assert from 'node:assert/strict';
import { canConfirmMenuSync, initialMenuSyncState, menuSyncReducer } from './menu-sync';
import { MenuSyncPreview } from '@/lib/auth/types';

const preview: MenuSyncPreview = {
  previewId: 'preview', expiresAt: '2099-01-01T00:00:00.000Z', canConfirm: true, totalRows: 3,
  summary: { create: 1, update: 1, unchanged: 0, reactivate: 0, deactivate: 1, removedSections: 1, removedSubitems: 2 }, issues: [],
};

function main() {
  const uploading = menuSyncReducer(initialMenuSyncState, { type: 'UPLOAD_STARTED', fileName: 'menus.csv' });
  assert.equal(uploading.phase, 'uploading');
  const ready = menuSyncReducer(uploading, { type: 'PREVIEW_RECEIVED', preview });
  assert.equal(canConfirmMenuSync(ready), true);
  assert.equal(menuSyncReducer(ready, { type: 'CONFIRM_STARTED' }).phase, 'confirming');
  const retry = menuSyncReducer({ ...ready, phase: 'confirming' }, { type: 'REQUEST_FAILED', message: 'Network error' });
  assert.equal(retry.phase, 'preview');
  assert.equal(canConfirmMenuSync(retry), true);
  assert.equal(menuSyncReducer(ready, { type: 'FILE_SELECTED', fileName: 'new.xlsx' }).preview, null);
  console.log('Menu synchronization frontend state tests passed.');
}

main();
