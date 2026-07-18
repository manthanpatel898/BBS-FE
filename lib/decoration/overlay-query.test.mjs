import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  decorationEventsUrl,
  readDecorationOverlayQuery,
} from './overlay-query.ts';

test('builds a static query URL for the retained day and detail overlay', () => {
  assert.equal(
    decorationEventsUrl({ date: '2026-07-18', bookingId: 'booking/a' }),
    '/decoration/events?date=2026-07-18&bookingId=booking%2Fa',
  );
  assert.equal(
    decorationEventsUrl({ date: '2026-07-18', bookingId: null }),
    '/decoration/events?date=2026-07-18',
  );
  assert.equal(
    decorationEventsUrl({ date: null, bookingId: null }),
    '/decoration/events',
  );
});

test('reads only canonical overlay parameters and rejects detail without a day', () => {
  assert.deepEqual(
    readDecorationOverlayQuery(new URLSearchParams('date=2026-07-18&bookingId=b1')),
    { date: '2026-07-18', bookingId: 'b1' },
  );
  assert.deepEqual(
    readDecorationOverlayQuery(new URLSearchParams('bookingId=b1')),
    { date: null, bookingId: null },
  );
  assert.deepEqual(
    readDecorationOverlayQuery(new URLSearchParams('date=18-07-2026&bookingId=b1')),
    { date: null, bookingId: null },
  );
});

test('production navigation no longer targets the standalone Event Detail route', async () => {
  const files = [
    '../../components/decoration/decoration-dashboard.tsx',
    '../../components/decoration/decoration-workspace.tsx',
    '../../app/(app)/decoration/print/page.tsx',
    '../../app/(app)/decoration/selection/page.tsx',
    '../auth/business-routes.ts',
  ];
  const sources = await Promise.all(
    files.map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
  );
  for (const source of sources) {
    assert.doesNotMatch(source, /['"]\/decoration\/event-detail/);
  }
});
