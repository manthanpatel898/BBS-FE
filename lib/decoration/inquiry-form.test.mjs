import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationBookingPatch, createDecorationInquiryValues, validateDecorationInquiry } from './inquiry-form.ts';

const valid = {
  customerName: 'Manthan Patel', mobile: '9876543210', eventTypeId: 'event-1', venueId: 'venue-1', hallId: '', address: '',
  functionName: 'Wedding', timeSlot: 'EVENING', startDate: '2026-07-18', endDate: '2026-07-18', packageRate: '100000', notes: '',
};

test('prefills both dates when inquiry opens from selected date', () => {
  assert.deepEqual(createDecorationInquiryValues('2026-07-18').startDate, '2026-07-18');
  assert.deepEqual(createDecorationInquiryValues('2026-07-18').endDate, '2026-07-18');
});

test('rejects invalid mobile, missing configuration, and reversed date range', () => {
  const errors = validateDecorationInquiry({ ...valid, mobile: '123', eventTypeId: '', endDate: '2026-07-17' });
  assert.equal(errors.mobile, 'Enter a valid 10-digit mobile number');
  assert.equal(errors.eventTypeId, 'Select an event type');
  assert.equal(errors.endDate, 'End date cannot be before start date');
});

test('builds normalized create payload', () => {
  assert.deepEqual(buildDecorationBookingPatch(null, valid), {
    customerName: 'Manthan Patel', mobile: '9876543210', eventTypeId: 'event-1', venueId: 'venue-1', hallId: null,
    address: null, functionName: 'Wedding', timeSlot: 'EVENING', startDate: '2026-07-18', endDate: '2026-07-18', packageRate: 100000, notes: null,
  });
});

test('edit payload contains only fields that changed', () => {
  assert.deepEqual(buildDecorationBookingPatch(valid, { ...valid, notes: 'Updated' }), { notes: 'Updated' });
});
