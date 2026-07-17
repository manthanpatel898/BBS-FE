import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorationOverlayReducer,
  initialDecorationOverlayState,
} from './overlay-state.ts';

test('closes child, detail, and selected date one level at a time', () => {
  let state = initialDecorationOverlayState;
  state = decorationOverlayReducer(state, {
    type: 'OPEN_DAY',
    date: '2026-07-17',
    origin: 'EVENTS',
  });
  state = decorationOverlayReducer(state, {
    type: 'OPEN_DETAIL',
    bookingId: 'booking-1',
  });
  state = decorationOverlayReducer(state, {
    type: 'OPEN_CHILD',
    child: 'ADVANCE',
  });

  state = decorationOverlayReducer(state, { type: 'CLOSE_TOP' });
  assert.equal(state.child, null);
  assert.equal(state.bookingId, 'booking-1');
  assert.equal(state.date, '2026-07-17');

  state = decorationOverlayReducer(state, { type: 'CLOSE_TOP' });
  assert.equal(state.bookingId, null);
  assert.equal(state.date, '2026-07-17');

  state = decorationOverlayReducer(state, { type: 'CLOSE_TOP' });
  assert.equal(state.date, null);
  assert.equal(state.origin, 'EVENTS');
});

test('preserves the selected day when replacing the selected booking', () => {
  const day = decorationOverlayReducer(initialDecorationOverlayState, {
    type: 'OPEN_DAY',
    date: '2026-07-17',
    origin: 'FOLLOWUPS',
  });
  const first = decorationOverlayReducer(day, {
    type: 'OPEN_DETAIL',
    bookingId: 'booking-1',
  });
  const second = decorationOverlayReducer(first, {
    type: 'OPEN_DETAIL',
    bookingId: 'booking-2',
  });

  assert.equal(second.date, '2026-07-17');
  assert.equal(second.bookingId, 'booking-2');
  assert.equal(second.origin, 'FOLLOWUPS');
});

test('rejects child overlays that require a selected booking', () => {
  assert.throws(
    () =>
      decorationOverlayReducer(initialDecorationOverlayState, {
        type: 'OPEN_CHILD',
        child: 'EDIT',
      }),
    /selected booking/,
  );
});

test('allows Add Inquiry without a selected booking and retains its date', () => {
  const day = decorationOverlayReducer(initialDecorationOverlayState, {
    type: 'OPEN_DAY',
    date: '2026-07-17',
    origin: 'EVENTS',
  });
  const add = decorationOverlayReducer(day, {
    type: 'OPEN_CHILD',
    child: 'ADD',
  });

  assert.equal(add.child, 'ADD');
  assert.equal(add.bookingId, null);
  assert.equal(add.date, '2026-07-17');
});
