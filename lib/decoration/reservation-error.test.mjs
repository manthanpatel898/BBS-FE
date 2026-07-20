import test from 'node:test';
import assert from 'node:assert/strict';
import { decorationReservationErrorMessage } from './reservation-error.ts';

test('hides MongoDB topology details from customers', () => {
  assert.equal(
    decorationReservationErrorMessage(new Error('Decoration selection requires MongoDB replica-set transactions. Configure a replica set and retry.')),
    'Decoration selection is temporarily unavailable. Please contact the administrator.',
  );
});

test('retains safe reservation errors and fallback copy', () => {
  assert.equal(decorationReservationErrorMessage(new Error('Only 2 available.')), 'Only 2 available.');
  assert.equal(decorationReservationErrorMessage(null), 'Unable to save decoration selection. Your choices are retained.');
});
