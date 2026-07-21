import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { DecorationRequiredFollowupList } from '../../components/decoration/decoration-followup-workspace';

const booking = {
  id: 'booking-1', customer: { name: 'Action Customer', mobile: '8980938142' }, status: 'INQUIRY',
  eventType: { id: 'event-1', name: 'Marriage' }, venue: { id: 'venue-1', name: 'Banquet One' }, hall: null,
  startDate: '2026-07-22', endDate: '2026-07-22', startTime: '10:00', endTime: '14:00', timeSlot: 'AFTERNOON',
  followups: [],
} as any;

test.afterEach(() => cleanup());

test('renders banquet-style date cards and opens a day sidebar with icon actions', async () => {
  render(<DecorationRequiredFollowupList entries={[{ booking, followup: null, dateKey: '2026-07-22', state: 'PENDING' }]} onDetail={() => {}} onFollowup={() => {}} />);
  const page = within(document.body);
  assert.ok(page.getByText('July 2026'));
  fireEvent.click(page.getByRole('button', { name: /Jul 22.*1 inquiry/i }));
  assert.ok(await page.findByText('Action Customer'));
  assert.ok(page.getByRole('link', { name: 'Call Action Customer' }));
  assert.ok(page.getByRole('button', { name: 'View booking' }));
  assert.ok(page.getByRole('button', { name: 'Follow ups' }));
});
