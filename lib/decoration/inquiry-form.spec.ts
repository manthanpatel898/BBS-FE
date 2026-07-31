import { strict as assert } from 'assert';
import {
  buildDecorationBookingPatch,
  createDecorationInquiryValues,
  validateDecorationInquiry,
} from './inquiry-form';

const validValues = {
  ...createDecorationInquiryValues('2026-08-15'),
  customerName: 'Asha Shah',
  mobile: '9123456789',
  eventTypeId: 'event-1',
  venueId: 'venue-1',
  startTime: '18:00',
  endTime: '22:00',
};

assert.equal(createDecorationInquiryValues().customerAddress, '');
assert.equal(
  validateDecorationInquiry(
    { ...validValues, customerAddress: 'x'.repeat(1001) },
    { mode: 'edit' },
  ).customerAddress,
  'Customer address cannot exceed 1000 characters',
);
assert.equal(
  buildDecorationBookingPatch(null, {
    ...validValues,
    customerAddress: '  44 Sunrise Society\nAhmedabad  ',
  }).customerAddress,
  '44 Sunrise Society\nAhmedabad',
);
assert.equal(
  buildDecorationBookingPatch(
    { ...validValues, customerAddress: 'Ahmedabad' },
    { ...validValues, customerAddress: '' },
  ).customerAddress,
  null,
);
assert.equal(
  'customerAddress' in
    buildDecorationBookingPatch(
      { ...validValues, customerAddress: 'Ahmedabad' },
      { ...validValues, customerAddress: 'Ahmedabad' },
    ),
  false,
);
