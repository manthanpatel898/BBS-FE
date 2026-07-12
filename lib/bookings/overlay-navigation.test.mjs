import assert from 'node:assert/strict';
import test from 'node:test';

import { consumeOverlayParent } from './overlay-navigation.ts';

test('restores a day sidebar parent and consumes it', () => {
  const parent = { type: 'day-sidebar', value: { dateKey: '2026-07-16' } };
  assert.deepEqual(consumeOverlayParent(parent), { restored: parent, nextParent: null });
});

test('restores an event detail parent and consumes it', () => {
  const parent = { type: 'event-detail', value: { id: 'booking-1' } };
  assert.deepEqual(consumeOverlayParent(parent), { restored: parent, nextParent: null });
});

test('direct entry has no parent to restore', () => {
  assert.deepEqual(consumeOverlayParent(null), { restored: null, nextParent: null });
});
