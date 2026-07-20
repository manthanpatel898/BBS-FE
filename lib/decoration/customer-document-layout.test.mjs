import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../../components/decoration/decoration-customer-document.tsx', import.meta.url);
const pageUrl = new URL('../../app/decoration/print/page.tsx', import.meta.url);
const apiUrl = new URL('../auth/api.ts', import.meta.url);

test('customer document consumes the normalized DTO and renders optional company branding', async () => {
  const [component, page, api] = await Promise.all([
    readFile(componentUrl, 'utf8'),
    readFile(pageUrl, 'utf8'),
    readFile(apiUrl, 'utf8'),
  ]);

  assert.match(api, /authorizedRequest<DecorationCustomerDocument>/);
  assert.match(page, /DecorationPdfViewer/);
  assert.match(page, /downloadDecorationCustomerPdf/);
  assert.match(component, /document\.company\.logoUrl \?/);
  assert.match(component, /document\.company\.name/);
  assert.match(component, /document\.company\.contactNumbers\.length/);
  assert.match(component, /document\.company\.contactNumbers\.map/);
});

test('Event Type is a row inside Event & Venue and not a document-header subtitle', async () => {
  const source = await readFile(componentUrl, 'utf8');
  const eventSection = source.indexOf('Event & Venue');
  const eventType = source.indexOf("['Event Type', document.event.eventType]");
  const decorationSelection = source.indexOf('Decoration Selection');

  assert.ok(eventSection >= 0);
  assert.ok(eventType > eventSection && eventType < decorationSelection);
  assert.doesNotMatch(source.slice(0, eventSection), /document\.event\.eventType/);
});

test('normalized categories drive semantic snapshot groups with stable 4:3 image fallbacks', async () => {
  const source = await readFile(componentUrl, 'utf8');

  assert.match(source, /document\.categories\.map/);
  assert.match(source, /category\.items\.map/);
  assert.match(source, /<section[^>]*aria-labelledby=/);
  assert.match(source, /<article/);
  assert.match(source, /aspect-\[4\/3\]/);
  assert.match(source, /Image unavailable/);
  assert.match(source, /onError=/);
  assert.match(source, /break-words/);
});

test('layout is responsive and print CSS defines A4 and page-break behavior', async () => {
  const source = await readFile(componentUrl, 'utf8');

  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /@page \{ size: A4 portrait;/);
  assert.match(source, /break-inside: avoid/);
  assert.match(source, /print-color-adjust: exact/);
  assert.match(source, /decoration-document-group/);
  assert.match(source, /decoration-document-item/);
});

test('print route remains query-only and preserves booking Back navigation', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /params\.get\('bookingId'\)/);
  assert.match(source, /params\.get\('returnDate'\)/);
  assert.match(source, /returnHref={decorationEventsUrl\(\{ date: returnDate \|\| null, bookingId \}\)}/);
  assert.doesNotMatch(source, /\/decoration\/print\/\$\{/);
});
