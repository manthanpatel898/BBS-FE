import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, render, within } from '@testing-library/react';
import { DecorationRequiredFollowupList } from '../../components/decoration/decoration-followup-workspace';

const booking = {
  id: 'booking-1', customer: { name: 'Action Customer', mobile: '8980938142' }, status: 'INQUIRY',
  eventType: { id: 'event-1', name: 'Marriage' }, venue: { id: 'venue-1', name: 'Banquet One' }, hall: null,
  startDate: '2026-07-22', endDate: '2026-07-22', startTime: '10:00', endTime: '14:00', timeSlot: 'AFTERNOON',
  followups: [],
} as any;

test.afterEach(() => cleanup());

test('renders a full actionable queue without month or date navigation', () => {
  render(<DecorationRequiredFollowupList entries={[{ booking, followup: null, dateKey: '2026-07-22', state: 'PENDING' }]} onDetail={() => {}} onFollowup={() => {}} />);
  const page = within(document.body);
  assert.ok(page.getByText('Action Customer'));
  assert.equal(page.queryByText('July 2026'), null);
  assert.equal(page.queryByRole('button', { name: /July 22/i }), null);
  assert.ok(page.getByRole('link', { name: 'Call Action Customer' }));
  assert.ok(page.getByRole('button', { name: 'View Details' }));
  assert.ok(page.getByRole('button', { name: 'Add Follow-up' }));
});
