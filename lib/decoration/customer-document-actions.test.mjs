import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const detailUrl = new URL('../../components/decoration/decoration-event-detail-modal.tsx', import.meta.url);
const printUrl = new URL('../../app/(app)/decoration/print/page.tsx', import.meta.url);

test('View and Print remain static query-string links while Download is a button', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /action\.id === 'view' \|\| action\.id === 'print'/);
  assert.match(source, /href={`\/decoration\/print\?bookingId=\$\{encodeURIComponent\(booking\.id\)\}&mode=\$\{action\.id\}`}/);
  assert.match(source, /action\.id === 'download'/);
  assert.match(source, /downloadDecorationCustomerPdf/);
  assert.doesNotMatch(source, /\/decoration\/print\/\$\{/);
});

test('Download prevents duplicates and exposes busy and inline error states', async () => {
  const source = await readFile(detailUrl, 'utf8');
  assert.match(source, /createPdfDownloadController/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /mounted = false/);
  assert.match(source, /disabled={downloading}/);
  assert.match(source, /Downloading…/);
  assert.match(source, /role="alert"/);
  assert.match(source, /saveDownloadedPdf/);
});

test('only Print auto-prints and waits for fonts and every image to settle', async () => {
  const source = await readFile(printUrl, 'utf8');
  assert.match(source, /mode !== 'print'/);
  assert.doesNotMatch(source, /mode === 'download' \|\| mode === 'print'/);
  assert.match(source, /document\.fonts\.ready/);
  assert.match(source, /ref={printableRoot}/);
  assert.match(source, /data-decoration-print-document/);
  assert.match(source, /waitForPrintableDocument\(root/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /window\.print\(\)/);
});
