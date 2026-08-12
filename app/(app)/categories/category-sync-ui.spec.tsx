import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategorySyncPreviewPanel } from '@/components/categories/category-sync-preview-panel';

const markup = renderToStaticMarkup(
  createElement(CategorySyncPreviewPanel, {
    preview: {
      previewId: 'preview-1',
      expiresAt: '2099-08-10T12:00:00.000Z',
      canConfirm: false,
      totalRows: 4,
      summary: {
        create: 1,
        update: 1,
        unchanged: 0,
        reactivate: 0,
        deactivate: 2,
      },
      issues: [
        {
          row: 3,
          code: 'INVALID_CATEGORY_ID',
          message: 'Category ID is invalid',
          severity: 'ERROR',
        },
      ],
    },
  }),
);

assert.match(markup, /New/);
assert.match(markup, /Updated/);
assert.match(markup, /Deactivated/);
assert.match(markup, /2 active categories will be deactivated/);
assert.match(markup, /Row 3/);
assert.match(markup, /Category ID is invalid/);

const pageSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8',
);
assert.match(pageSource, /accept="\.csv,\.xlsx"/);
assert.doesNotMatch(pageSource, /accept="[^"]*\.xls(?:,|\")/);
assert.match(
  pageSource,
  /Excel includes guided menu association sheets and dropdowns/,
);
assert.match(pageSource, /Only the Categories sheet is synchronized/);
assert.match(pageSource, /CSV is intended for direct table editing/);

console.log('Category synchronization UI tests passed.');
