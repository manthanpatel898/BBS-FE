import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDecorationRequiredFollowupQueue,
  buildDecorationFollowupSchedule,
  decorationFollowupState,
  groupDecorationFollowupsByMonth,
} from './followups.ts';

function booking(overrides = {}) {
  return {
    id: 'booking-1',
    customer: { name: 'Customer' },
    status: 'INQUIRY',
    startDate: '2026-07-25T00:00:00.000Z',
    endDate: '2026-07-25T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    followups: [],
    ...overrides,
  };
}

function followup(overrides = {}) {
  return {
    id: 'followup-1',
    date: '2026-07-10T00:00:00.000Z',
    nextDate: null,
    status: 'PENDING',
    note: 'Call customer',
    recordedBy: 'Manthan',
    completedAt: null,
    completedBy: null,
    ...overrides,
  };
}

test('groups by event date and never creates a card from next follow-up date', () => {
  const result = buildDecorationFollowupSchedule([
    booking({
      followups: [
        followup({ id: 'old', date: '2026-07-05', nextDate: '2026-07-12' }),
        followup({ id: 'latest', date: '2026-07-10', nextDate: '2026-07-20' }),
      ],
    }),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].dateKey, '2026-07-25');
  assert.equal(result[0].followup.id, 'latest');
});

test('keeps two bookings on their shared event date', () => {
  const result = buildDecorationFollowupSchedule([
    booking({ id: 'one', startDate: '2026-07-22', endDate: '2026-07-22', followups: [followup({ nextDate: '2026-07-21' })] }),
    booking({ id: 'two', startDate: '2026-07-22', endDate: '2026-07-22' }),
  ], '2026-07-20');

  assert.deepEqual(result.map((entry) => entry.dateKey), ['2026-07-22', '2026-07-22']);
});

test('keeps a new inquiry visible on its event date before its first follow-up', () => {
  const result = buildDecorationFollowupSchedule([
    booking({ startDate: '2026-07-25T00:00:00.000Z', followups: [] }),
  ]);

  assert.equal(result[0].dateKey, '2026-07-25');
  assert.equal(result[0].followup, null);
});

test('excludes closed, cancelled, and completed bookings', () => {
  const statuses = ['CLOSED_INQUIRY', 'CANCELLED', 'COMPLETED'];
  const result = buildDecorationFollowupSchedule(
    statuses.map((status, index) =>
      booking({ id: String(index), status, followups: [followup()] }),
    ),
  );

  assert.deepEqual(result, []);
});

test('excludes past events but keeps today and ongoing multi-day events', () => {
  const result = buildDecorationFollowupSchedule([
    booking({ id: 'past', startDate: '2026-07-18', endDate: '2026-07-18' }),
    booking({ id: 'today', startDate: '2026-07-20', endDate: '2026-07-20' }),
    booking({ id: 'ongoing', startDate: '2026-07-18', endDate: '2026-07-21' }),
  ], '2026-07-20');
  assert.deepEqual(result.map((entry) => entry.booking.id), ['ongoing', 'today']);
});

test('labels due follow-ups consistently for taken, pending, and overdue states', () => {
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-18' }), '2026-07-18'),
    'TAKEN_TODAY',
  );
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-17', nextDate: '2026-07-20' }), '2026-07-18'),
    'SCHEDULED',
  );
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-10', nextDate: '2026-07-17' }), '2026-07-18'),
    'OVERDUE',
  );
  assert.equal(decorationFollowupState(followup({ date: '2026-07-17', nextDate: '2026-07-18' }), '2026-07-18'), 'DUE_TODAY');
});

test('groups scheduled follow-ups by month in chronological order', () => {
  const schedule = buildDecorationFollowupSchedule([
    booking({ id: 'aug', startDate: '2026-08-02', endDate: '2026-08-02' }),
    booking({ id: 'jul', startDate: '2026-07-30', endDate: '2026-07-30' }),
  ]);

  assert.deepEqual(
    groupDecorationFollowupsByMonth(schedule).map((month) => month.key),
    ['2026-07', '2026-08'],
  );
});

test('required queue contains only follow-ups that need action today', () => {
  const result = buildDecorationRequiredFollowupQueue([
    booking({ id: 'new', followups: [] }),
    booking({ id: 'overdue', followups: [followup({ date: '2026-07-18', nextDate: '2026-07-19' })] }),
    booking({ id: 'today', followups: [followup({ date: '2026-07-18', nextDate: '2026-07-20' })] }),
    booking({ id: 'future', followups: [followup({ date: '2026-07-18', nextDate: '2026-07-21' })] }),
    booking({ id: 'taken', followups: [followup({ date: '2026-07-20', nextDate: '2026-07-22' })] }),
    booking({ id: 'past', startDate: '2026-07-18', endDate: '2026-07-18' }),
    booking({ id: 'closed', status: 'CLOSED_INQUIRY' }),
    booking({ id: 'complete', status: 'COMPLETED' }),
  ], '2026-07-20');

  assert.deepEqual(result.map(({ booking: entry }) => entry.id), ['overdue', 'today', 'new']);
  assert.deepEqual(result.map(({ state }) => state), ['OVERDUE', 'DUE_TODAY', 'PENDING']);
});
