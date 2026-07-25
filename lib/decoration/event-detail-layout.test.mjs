import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const detailUrl = new URL(
  '../../components/decoration/decoration-event-detail-modal.tsx',
  import.meta.url,
);
const galleryUrl = new URL(
  '../../components/decoration/decoration-snapshot-gallery.tsx',
  import.meta.url,
);

test('event detail uses a fixed compact header and decoration-first body', async () => {
  const source = await readFile(detailUrl, 'utf8');
  const eventIndex = source.indexOf('title="Event & Venue"');
  const decorationIndex = source.indexOf('title={`Selected Decoration');
  const advanceIndex = source.indexOf('title="Advance Payments"');

  assert.match(source, /data-detail-region="header"/);
  assert.match(source, /data-detail-region="content"/);
  assert.match(source, /data-detail-region="actions"/);
  assert.ok(eventIndex > -1, 'Event & Venue must be present');
  assert.ok(decorationIndex > eventIndex, 'Selected Decoration must follow Event & Venue');
  assert.ok(advanceIndex > decorationIndex, 'Advance Payments must follow Selected Decoration');
  assert.match(
    source,
    /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(280px,1fr\)\]/,
  );
  assert.match(source, /title="Payment Summary"/);
  assert.match(source, /canManageDecoration/);
  assert.match(source, /Edit selection/);
  assert.match(source, /compact/);
});

test('detail snapshot stays large with one mobile and two wider columns', async () => {
  const [source, detailSource] = await Promise.all([
    readFile(galleryUrl, 'utf8'),
    readFile(detailUrl, 'utf8'),
  ]);

  assert.match(source, /detail = false/);
  assert.match(source, /detail \? 'grid-cols-1 sm:grid-cols-2'/);
  assert.match(detailSource, /<DecorationSnapshotGallery[^>]*detail/);
});

test('action footer uses aligned responsive grids without horizontal scrolling', async () => {
  const source = await readFile(detailUrl, 'utf8');

  assert.match(source, /grid grid-cols-2 gap-2 overflow-hidden/);
  assert.match(source, /hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-2 min-\[720px\]:grid-cols-3 lg:grid-cols-4/);
  assert.match(source, /w-full/);
  assert.match(source, /var\(--zb-safe-bottom\)/);
  assert.doesNotMatch(source, /overflow-x-auto/);
});
