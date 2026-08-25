import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HomePage from '@/app/(public)/page';
import { PublicLayout } from '@/components/layouts/public-layout';

const publishedFeedback = [{
  id: 'feedback-1',
  fullName: 'Verified Customer',
  designation: 'Director',
  company: 'Verified Banquet',
  rating: 5,
  message: 'Verified customer quote',
  imageUrl: '/verified-customer.jpg',
  imageDisplayMode: 'FULL',
  publishedAt: '2026-08-25T00:00:00.000Z',
}];

function feedbackResponse(data = publishedFeedback, ok = true) {
  return Promise.resolve({
    ok,
    json: async () => ({ success: ok, data, message: ok ? undefined : 'Unavailable' }),
  } as Response);
}

test.beforeEach(() => {
  global.fetch = () => new Promise<Response>(() => {});
});

test.afterEach(() => cleanup());

test('homepage presents the banquet and event decoration solutions without fabricated metrics', () => {
  render(<HomePage />);

  assert.ok(screen.getByRole('heading', { name: /turn every inquiry into a well-managed event/i }));
  assert.ok(screen.getByRole('button', { name: 'Banquet Management' }));
  assert.ok(screen.getByRole('button', { name: 'Event Decoration Management' }));
  assert.ok(screen.getByText(/trusted by teams who run memorable events/i));
  assert.equal(screen.queryByText('78%'), null);
  assert.equal(screen.queryByText('93%'), null);
});

test('solution switcher exposes only the selected business workflow', () => {
  render(<HomePage />);

  const banquet = screen.getByRole('button', { name: 'Banquet Management' });
  const decoration = screen.getByRole('button', { name: 'Event Decoration Management' });
  assert.equal(banquet.getAttribute('aria-pressed'), 'true');
  assert.ok(screen.getByText('From first inquiry to final invoice'));

  fireEvent.click(decoration);
  assert.equal(decoration.getAttribute('aria-pressed'), 'true');
  assert.equal(banquet.getAttribute('aria-pressed'), 'false');
  assert.ok(screen.getByText('Plan every detail without spreadsheets'));
  assert.equal(screen.queryByText('From first inquiry to final invoice'), null);
});

test('public navigation exposes solution anchors, demo action, and login', () => {
  render(
    <PublicLayout>
      <p>Page content</p>
    </PublicLayout>,
  );

  assert.ok(screen.getByRole('link', { name: 'Solutions' }));
  assert.ok(screen.getByRole('link', { name: 'Features' }));
  assert.ok(screen.getByRole('link', { name: 'Customer stories' }));
  assert.ok(screen.getByRole('link', { name: 'Book a free demo' }));
  assert.ok(screen.getByRole('link', { name: 'Login' }));
});

test('customer stories hydrate only approved public feedback', async () => {
  global.fetch = () => feedbackResponse();
  render(<HomePage />);

  assert.ok(screen.getByRole('region', { name: 'Customer feedback carousel' }));
  assert.equal(screen.queryByText(/demo feedback/i), null);
  assert.ok(await screen.findByText('Verified customer quote'));
  assert.ok(screen.getByLabelText('5 out of 5 stars'));
  assert.ok(screen.getByRole('img', { name: /feedback from verified customer/i }));
});

test('customer stories expose safe error and empty states', async () => {
  global.fetch = () => feedbackResponse([], false);
  const view = render(<HomePage />);
  assert.ok(await screen.findByText(/customer stories are temporarily unavailable/i));

  view.unmount();
  global.fetch = () => feedbackResponse([]);
  render(<HomePage />);
  assert.ok(await screen.findByText(/customer stories coming soon/i));
});

test('event journey exposes four ordered stages with operational context', () => {
  render(<HomePage />);

  const journey = screen.getByRole('list', { name: 'Banquet event journey' });
  assert.equal(journey.querySelectorAll('[role="listitem"]').length, 4);
  assert.ok(screen.getByText('Date, pax and event'));
  assert.ok(screen.getByText('Slot availability checked'));
  assert.ok(screen.getByText('Packages and add-ons'));
  assert.ok(screen.getByText('Order and invoice prepared'));
});
