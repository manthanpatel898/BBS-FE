import { strict as assert } from 'node:assert';
import { bookingFeedbackAverage, canShowBookingFeedbackAction } from './domain';
const valid = { enabled: true, status: 'COMPLETED' as const, eventDate: '2026-08-31', today: '2026-09-01', canManage: true };
assert.equal(canShowBookingFeedbackAction(valid), true);
assert.equal(canShowBookingFeedbackAction({ ...valid, eventDate: '2026-09-01' }), false);
assert.equal(canShowBookingFeedbackAction({ ...valid, status: 'CANCELLED' }), false);
assert.equal(canShowBookingFeedbackAction({ ...valid, enabled: false }), false);
assert.equal(bookingFeedbackAverage([5, 4, 4]), 4.33);
