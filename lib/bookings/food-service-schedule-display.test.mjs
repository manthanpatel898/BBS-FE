import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const details = readFileSync(new URL('../../app/(app)/bookings/page.tsx', import.meta.url), 'utf8');
const print = readFileSync(new URL('../../app/print/order/print-order-view.tsx', import.meta.url), 'utf8');

test('booking details displays only stored historical schedule values', () => {
  assert.match(details, /Food Service Schedule/);
  assert.match(details, /detailOrder\.welcomeDrinkStartTime \|\| detailOrder\.mainCourseStartTime/);
  assert.match(details, /formatFoodServiceTime\(detailOrder\.welcomeDrinkStartTime\)/);
  assert.match(details, /formatFoodServiceTime\(detailOrder\.mainCourseStartTime\)/);
});

test('both banquet print copies use compact non-empty schedule rows', () => {
  assert.match(print, /const foodScheduleRows/);
  assert.match(print, /order\.welcomeDrinkStartTime/);
  assert.match(print, /order\.mainCourseStartTime/);
  assert.match(print, /formatFoodServiceTime/);
  assert.match(print, /foodScheduleRows\.length > 0/);
  assert.match(print, /Food Service Schedule/);
});
