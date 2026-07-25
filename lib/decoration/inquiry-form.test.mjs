import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDecorationBookingPatch, changeInquiryLocation, createDecorationInquiryValues, OTHER_DECORATION_OPTION, validateDecorationInquiry } from './inquiry-form.ts';

const inquirySource = readFileSync(
  new URL('../../components/decoration/decoration-inquiry-form.tsx', import.meta.url),
  'utf8',
);

const valid = {
  ...createDecorationInquiryValues(), customerName: 'Manthan Patel', mobile: '9876543210', eventTypeId: 'event-1', venueId: 'venue-1',
  timeSlot: 'EVENING', startTime: '18:30', endTime: '22:00', startDate: '2026-07-18', packageRate: '100000',
};

test('prefills the event date when inquiry opens from selected date', () => {
  assert.deepEqual(createDecorationInquiryValues('2026-07-18').startDate, '2026-07-18');
  assert.equal('endDate' in createDecorationInquiryValues('2026-07-18'), false);
});

test('rejects invalid mobile and missing configuration', () => {
  const errors = validateDecorationInquiry({ ...valid, mobile: '123', eventTypeId: '' });
  assert.equal(errors.mobile, 'Enter a valid 10-digit mobile number');
  assert.equal(errors.eventTypeId, 'Select an event type');
});

test('builds normalized create payload', () => {
  assert.deepEqual(buildDecorationBookingPatch(null, valid), {
    customerName: 'Manthan Patel', mobile: '9876543210', eventTypeId: 'event-1', venueId: 'venue-1', hallId: null,
    address: null, timeSlot: 'EVENING', startTime: '18:30', endTime: '22:00', startDate: '2026-07-18', packageRate: 100000, notes: null,
  });
});

test('requires independent start and end times and rejects equal values', () => {
  assert.equal(validateDecorationInquiry({ ...valid, startTime: '' }).startTime, 'Start time is required');
  assert.equal(validateDecorationInquiry({ ...valid, endTime: '' }).endTime, 'End time is required');
  assert.match(validateDecorationInquiry({ ...valid, endTime: valid.startTime }).endTime, /different/);
});

test('allows package price to remain unfinalized', () => {
  const values = { ...valid, packageRate: '' };
  assert.equal(validateDecorationInquiry(values).packageRate, undefined);
  assert.equal('packageRate' in buildDecorationBookingPatch(null, values), false);
});

test('requires custom names only when Other is selected', () => {
  const errors = validateDecorationInquiry({ ...valid, eventTypeId: OTHER_DECORATION_OPTION, customEventTypeName: '', venueId: OTHER_DECORATION_OPTION, customVenueName: '' });
  assert.equal(errors.customEventTypeName, 'Enter an event type');
  assert.equal(errors.customVenueName, 'Enter a hotel or venue name');
});

test('changing location clears the previous hall and custom hall', () => {
  const changed = changeInquiryLocation({ ...valid, hallId: 'hall-1', customHallName: 'Custom' }, 'venue-2');
  assert.equal(changed.venueId, 'venue-2');
  assert.equal(changed.hallId, '');
  assert.equal(changed.customHallName, '');
});

test('booking payload excludes transient custom fields and functionName', () => {
  const payload = buildDecorationBookingPatch(null, { ...valid, customEventTypeName: 'Transient' });
  assert.equal('customEventTypeName' in payload, false);
  assert.equal('functionName' in payload, false);
});

test('edit payload contains only fields that changed', () => {
  assert.deepEqual(buildDecorationBookingPatch(valid, { ...valid, notes: 'Updated' }), { notes: 'Updated' });
});

test('rejects a previous date only while creating a new inquiry', () => {
  assert.match(
    validateDecorationInquiry(
      { ...valid, startDate: '2026-07-17' },
      { mode: 'create', todayKey: '2026-07-18' },
    ).startDate,
    /previous date/i,
  );
  assert.equal(
    validateDecorationInquiry(
      { ...valid, startDate: '2026-07-17' },
      { mode: 'edit', todayKey: '2026-07-18' },
    ).startDate,
    undefined,
  );
});

test('offers separate create and confirm actions only for a new inquiry', () => {
  assert.match(inquirySource, /Create Inquiry/);
  assert.match(inquirySource, /Confirm Booking/);
  assert.match(inquirySource, /bg-emerald-500/);
  assert.match(inquirySource, /createConfirmedDecorationBooking/);
  assert.doesNotMatch(
    inquirySource,
    /saveDecorationBooking[^]*status:\s*['"]CONFIRMED['"]/,
  );
});
