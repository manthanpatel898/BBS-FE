import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const detailUrl = new URL('../../components/decoration/decoration-event-detail-modal.tsx', import.meta.url);
const printUrl = new URL('../../app/(app)/decoration/print/page.tsx', import.meta.url);
const printControlsUrl = new URL('../../components/decoration/decoration-print-button.tsx', import.meta.url);

test('View and Print use static query-string destinations while Download remains binary', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /action\.id === 'view' \|\| action\.id === 'print'/);
  assert.match(source, /returnDate=\$\{encodeURIComponent\(booking\.startDate\.slice\(0, 10\)\)\}/);
  assert.match(source, /router\.push\(destination\)/);
  assert.match(source, /action\.id === 'download'/);
  assert.match(source, /downloadDecorationCustomerPdf/);
  assert.doesNotMatch(source, /\/decoration\/print\/\$\{/);
});

test('Download prevents duplicates and exposes busy and inline error states', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /createPdfDownloadController/);
  assert.match(source, /BookingDownloadActions key={`\$\{booking\.id\}:\$\{accessToken \?\? ''\}`}/);
  assert.match(source, /BookingDownloadLifecycle/);
  assert.match(source, /activeDocumentAction/);
  assert.match(source, /Opening…/);
  assert.match(source, /Downloading…/);
  assert.match(source, /Preparing print…/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /saveDownloadedPdf/);
});

test('detail actions follow the banquet sticky responsive action-bar pattern', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /sticky bottom-0/);
  assert.doesNotMatch(source, /className="fixed inset-x-0 bottom-0/);
  assert.match(source, /aria-expanded={mobileActionsOpen}/);
  assert.match(source, /grid-cols-2/);
  assert.match(source, /sm:grid/);
  assert.match(source, /var\(--zb-safe-bottom\)/);
});

test('only Print auto-prints and waits for fonts and every image to settle', async () => {
  const [page, controls] = await Promise.all([readFile(printUrl, 'utf8'), readFile(printControlsUrl, 'utf8')]);
  assert.match(page, /<DecorationPrintControls mode={mode} printableRoot={printableRoot}/);
  assert.match(page, /ref={printableRoot}/);
  assert.match(page, /data-decoration-print-document/);
  assert.match(controls, /if \(mode !== 'print'\) return/);
  assert.match(controls, /mode === 'view' \? <DecorationPrintButton/);
  assert.match(controls, /window\.document\.fonts\.ready/);
  assert.match(controls, /waitForReady\(root/);
  assert.match(controls, /controller\.abort\(\)/);
  assert.match(controls, /window\.print\(\)/);
});
