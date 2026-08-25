import '@/lib/decoration/image-crop-test-dom.mjs';
import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CustomerFeedback, FeedbackInvitation } from '@/lib/feedback/types';

const require = createRequire(import.meta.url);
require.extensions['.css'] = (module: NodeModule) => {
  module.exports = { default: new Proxy({}, { get: (_target, property) => String(property) }) };
};
const { FeedbackManagementView } = require('./feedback-management-list') as typeof import('./feedback-management-list');

afterEach(cleanup);

const invitation: FeedbackInvitation = {
  id: 'invite-1', status: 'PENDING',
  prefill: { fullName: 'Aarav Mehta', designation: 'Director', company: 'Mehta Events' },
  expiresAt: '2026-09-24T00:00:00.000Z', submittedAt: null, revokedAt: null,
  revokedReason: null, replacementInvitationId: null,
  createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z',
};

const feedback: CustomerFeedback = {
  _id: 'feedback-1', invitationId: 'invite-1', moderationStatus: 'SUBMITTED',
  isPublished: false, displayOrder: 0,
  original: { ...invitation.prefill, rating: 5, message: 'Original submission', image: { key: 'original', url: '/original.jpg', mimeType: 'image/jpeg', byteSize: 100, width: 800, height: 600, displayMode: 'FULL' } },
  publicVersion: { ...invitation.prefill, rating: 5, message: 'Public version', image: { key: 'public', url: '/public.jpg', mimeType: 'image/jpeg', byteSize: 100, width: 800, height: 600, displayMode: 'FULL' } },
  submittedAt: '2026-08-25T00:00:00.000Z', rejectionReason: null,
  publishedAt: null, updatedAt: '2026-08-25T00:00:00.000Z',
};

test('shows invitation and review workflows and can approve and publish', () => {
  let approved = 0;
  render(<FeedbackManagementView invitations={[invitation]} feedback={[feedback]} counts={{ pendingLinks: 1, awaitingReview: 1, published: 0 }} onCreate={() => {}} onReviewAction={(action) => { if (action === 'approve-publish') approved += 1; }} />);

  assert.ok(screen.getByRole('tab', { name: /pending links/i }));
  assert.ok(screen.getByRole('tab', { name: /awaiting review/i }));
  assert.ok(screen.getByRole('button', { name: /create feedback link/i }));
  fireEvent.click(screen.getByRole('tab', { name: /awaiting review/i }));
  fireEvent.click(screen.getByRole('button', { name: /review aarav mehta/i }));
  assert.ok(screen.getAllByText(/original submission/i).length >= 1);
  assert.ok(screen.getAllByText(/public version/i).length >= 1);
  fireEvent.click(screen.getByRole('button', { name: /approve and publish/i }));
  assert.equal(approved, 1);
});
