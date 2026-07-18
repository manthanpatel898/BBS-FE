import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDecorationFollowupSchedule,
  decorationFollowupState,
  groupDecorationFollowupsByMonth,
} from './followups.ts';

function booking(overrides = {}) {
  return {
    id: 'booking-1',
    status: 'INQUIRY',
    startDate: '2026-07-25T00:00:00.000Z',
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

test('uses the latest pending next follow-up date as the schedule date', () => {
  const result = buildDecorationFollowupSchedule([
    booking({
      followups: [
        followup({ id: 'old', date: '2026-07-05', nextDate: '2026-07-12' }),
        followup({ id: 'latest', date: '2026-07-10', nextDate: '2026-07-20' }),
      ],
    }),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].dateKey, '2026-07-20');
  assert.equal(result[0].followup.id, 'latest');
});

test('falls back to the recorded date when a follow-up has no next date', () => {
  const result = buildDecorationFollowupSchedule([
    booking({ followups: [followup({ date: '2026-07-14', nextDate: null })] }),
  ]);

  assert.equal(result[0].dateKey, '2026-07-14');
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

test('labels due follow-ups consistently for taken, pending, and overdue states', () => {
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-18' }), '2026-07-18'),
    'TAKEN',
  );
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-17', nextDate: '2026-07-20' }), '2026-07-18'),
    'PENDING',
  );
  assert.equal(
    decorationFollowupState(followup({ date: '2026-07-10', nextDate: '2026-07-17' }), '2026-07-18'),
    'OVERDUE',
  );
});

test('groups scheduled follow-ups by month in chronological order', () => {
  const schedule = buildDecorationFollowupSchedule([
    booking({ id: 'aug', followups: [followup({ nextDate: '2026-08-02' })] }),
    booking({ id: 'jul', followups: [followup({ nextDate: '2026-07-30' })] }),
  ]);

  assert.deepEqual(
    groupDecorationFollowupsByMonth(schedule).map((month) => month.key),
    ['2026-07', '2026-08'],
  );
});
