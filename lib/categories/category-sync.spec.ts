import * as assert from 'node:assert/strict';
import {
  canConfirmCategorySync,
  categorySyncReducer,
  hasCategoryDeactivationRisk,
  initialCategorySyncState,
} from './category-sync';
import { CategorySyncPreview } from '@/lib/auth/types';

const preview: CategorySyncPreview = {
  previewId: 'preview-1',
  expiresAt: '2099-08-10T12:00:00.000Z',
  canConfirm: true,
  totalRows: 3,
  summary: {
    create: 1,
    update: 1,
    unchanged: 0,
    reactivate: 0,
    deactivate: 1,
  },
  issues: [],
};

function main() {
  const uploading = categorySyncReducer(initialCategorySyncState, {
    type: 'UPLOAD_STARTED',
    fileName: 'categories.csv',
  });
  assert.equal(uploading.phase, 'uploading');
  assert.equal(uploading.fileName, 'categories.csv');

  const ready = categorySyncReducer(uploading, {
    type: 'PREVIEW_RECEIVED',
    preview,
  });
  assert.equal(ready.phase, 'preview');
  assert.equal(canConfirmCategorySync(ready), true);
  assert.equal(hasCategoryDeactivationRisk(ready), true);

  const blocked = categorySyncReducer(uploading, {
    type: 'PREVIEW_RECEIVED',
    preview: {
      ...preview,
      canConfirm: false,
      issues: [
        {
          row: 2,
          code: 'INVALID_CATEGORY_ID',
          message: 'Invalid category ID',
          severity: 'ERROR',
        },
      ],
    },
  });
  assert.equal(canConfirmCategorySync(blocked), false);

  const confirming = categorySyncReducer(ready, { type: 'CONFIRM_STARTED' });
  assert.equal(confirming.phase, 'confirming');
  assert.equal(canConfirmCategorySync(confirming), false);

  const resetForNewFile = categorySyncReducer(ready, {
    type: 'FILE_SELECTED',
    fileName: 'replacement.xlsx',
  });
  assert.equal(resetForNewFile.phase, 'idle');
  assert.equal(resetForNewFile.preview, null);

  const failed = categorySyncReducer(confirming, {
    type: 'REQUEST_FAILED',
    message: 'Preview expired',
  });
  assert.equal(failed.phase, 'error');
  assert.equal(failed.errorMessage, 'Preview expired');

  console.log('Category synchronization frontend state tests passed.');
}

main();
