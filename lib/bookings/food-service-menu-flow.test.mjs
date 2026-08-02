import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookingSource = readFileSync(new URL('../../app/(app)/bookings/page.tsx', import.meta.url), 'utf8');
const selectorSource = readFileSync(new URL('../../components/bookings/food-service-time-select.tsx', import.meta.url), 'utf8');

test('menu workflow hydrates, conditionally renders, validates, and submits food times', () => {
  assert.match(bookingSource, /welcomeDrinkStartTime: string/);
  assert.match(bookingSource, /mainCourseStartTime: string/);
  assert.match(bookingSource, /order\.welcomeDrinkStartTime \?\? ''/);
  assert.match(bookingSource, /settings\?\.enableWelcomeDrinkStartTime/);
  assert.match(bookingSource, /settings\?\.enableMainCourseStartTime/);
  assert.match(bookingSource, /validateFoodServiceScheduleForm/);
  assert.match(bookingSource, /welcomeDrinkStartTime:[\s\S]*\? formState\.welcomeDrinkStartTime \|\| null/);
  assert.match(bookingSource, /mainCourseStartTime:[\s\S]*\? formState\.mainCourseStartTime \|\| null/);
});

test('time selector provides quarter-hour choices and a clear action', () => {
  assert.match(selectorSource, /\['00', '15', '30', '45'\]/);
  assert.match(selectorSource, />Clear</);
  assert.match(selectorSource, /min-h-11/);
});
