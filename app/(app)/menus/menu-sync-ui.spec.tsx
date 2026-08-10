import * as assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuSyncPreviewPanel } from '@/components/menus/menu-sync-preview-panel';

function main() {
  const html = renderToStaticMarkup(<MenuSyncPreviewPanel preview={{
    previewId: 'x', expiresAt: '2099-01-01', canConfirm: true, totalRows: 2,
    summary: { create: 0, update: 1, unchanged: 0, reactivate: 0, deactivate: 1, removedSections: 2, removedSubitems: 4 }, issues: [],
  }} />);
  assert.ok(html.includes('Removed sections'));
  assert.ok(html.includes('Removed subitems'));
  assert.ok(html.includes('Historical bookings remain unchanged'));
  console.log('Menu synchronization UI tests passed.');
}

main();
