import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const detailUrl = new URL('../../components/decoration/decoration-event-detail-modal.tsx', import.meta.url);
const printUrl = new URL('../../app/decoration/print/page.tsx', import.meta.url);
const printControlsUrl = new URL('../../components/decoration/decoration-print-button.tsx', import.meta.url);

test('View uses a static query-string destination while Download and Share remain binary', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /action\.id === 'view'/);
  assert.match(source, /returnDate=\$\{encodeURIComponent\(booking\.startDate\.slice\(0, 10\)\)\}/);
  assert.match(source, /router\.push\(destination\)/);
  assert.match(source, /action\.id === 'download'/);
  assert.match(source, /downloadDecorationCustomerPdf/);
  assert.match(source, /action\.id === 'share'/);
  assert.doesNotMatch(source, /action\.id === 'print'/);
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
  assert.match(source, /Preparing share…/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /saveDownloadedPdf/);
});

test('mobile Share preloads the PDF and calls the prepared share controller directly from the tap', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /createPdfShareController/);
  assert.match(source, /shareController\.prepare\(\)/);
  assert.match(source, /shareController\.share\(\)/);
  assert.match(source, /disabled={disabled \|\| preparing}/);
  assert.doesNotMatch(source, /action\.id === 'share'[^]*onClick={async/);
});

test('detail actions follow the banquet sticky responsive action-bar pattern', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /h-\[100dvh\]/);
  assert.match(source, /flex-col overflow-hidden/);
  assert.match(source, /min-h-0 flex-1[^"']*overflow-y-auto[^"']*overscroll-contain/);
  assert.doesNotMatch(source, /sticky bottom-0/);
  assert.doesNotMatch(source, /className="fixed inset-x-0 bottom-0/);
  assert.match(source, /aria-expanded={mobileActionsOpen}/);
  assert.match(source, /grid-cols-2/);
  assert.match(source, /sm:grid/);
  assert.match(source, /var\(--zb-safe-bottom\)/);
});

test('the query-only PDF view loads the binary without application chrome', async () => {
  const [page, controls] = await Promise.all([readFile(printUrl, 'utf8'), readFile(printControlsUrl, 'utf8')]);
  assert.match(page, /downloadDecorationCustomerPdf/);
  assert.doesNotMatch(page, /fetchDecorationCustomerDocument/);
  assert.match(page, /<DecorationPdfViewer/);
  assert.match(controls, /URL\.createObjectURL/);
  assert.match(controls, /URL\.revokeObjectURL/);
  assert.match(controls, /Decoration proposal PDF/);
  assert.match(controls, /contentWindow\?\.print\(\)/);
});
