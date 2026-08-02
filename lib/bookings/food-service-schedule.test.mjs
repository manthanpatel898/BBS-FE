import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatFoodServiceTime,
  validateFoodServiceScheduleForm,
} from './food-service-schedule.ts';

test('formats stored 24-hour times for people', () => {
  assert.equal(formatFoodServiceTime('18:30'), '6:30 PM');
  assert.equal(formatFoodServiceTime('00:00'), '12:00 AM');
  assert.equal(formatFoodServiceTime(''), 'Not added');
});

test('accepts optional, ordered times inside an ordinary event range', () => {
  assert.equal(
    validateFoodServiceScheduleForm({
      eventStartTime: '18:00',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '18:30',
      mainCourseStartTime: '21:00',
    }),
    null,
  );
  assert.equal(
    validateFoodServiceScheduleForm({
      eventStartTime: '18:00',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '',
      mainCourseStartTime: '',
    }),
    null,
  );
});

test('supports overnight events and equal schedule times', () => {
  assert.equal(
    validateFoodServiceScheduleForm({
      eventStartTime: '20:00',
      eventEndTime: '02:00',
      welcomeDrinkStartTime: '21:00',
      mainCourseStartTime: '00:30',
    }),
    null,
  );
  assert.equal(
    validateFoodServiceScheduleForm({
      eventStartTime: '18:00',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '20:00',
      mainCourseStartTime: '20:00',
    }),
    null,
  );
});

test('returns clear validation messages', () => {
  assert.match(
    validateFoodServiceScheduleForm({
      eventStartTime: '18:00',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '17:45',
      mainCourseStartTime: '',
    }) ?? '',
    /within the event time range/,
  );
  assert.match(
    validateFoodServiceScheduleForm({
      eventStartTime: '18:00',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '21:30',
      mainCourseStartTime: '20:30',
    }) ?? '',
    /earlier than or equal/,
  );
  assert.match(
    validateFoodServiceScheduleForm({
      eventStartTime: 'invalid',
      eventEndTime: '23:00',
      welcomeDrinkStartTime: '20:00',
      mainCourseStartTime: '',
    }) ?? '',
    /valid event start and end time/,
  );
});
