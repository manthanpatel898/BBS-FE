import '@/lib/decoration/image-crop-test-dom.mjs';
import { strict as assert } from 'node:assert';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const require = createRequire(import.meta.url);
require.extensions['.css'] = (module) => {
  const classes = new Proxy({}, { get: (_target, property) => String(property) });
  module.exports = { __esModule: true, default: classes };
};

const { PublicFeedbackForm } = require('./public-feedback-form') as typeof import('./public-feedback-form');

afterEach(() => cleanup());

test('renders accessible required feedback controls and keeps submit disabled initially', async () => {
  render(
    <PublicFeedbackForm
      initialToken="test-token"
      validateInvitation={async () => ({
        status: 'READY',
        prefill: { fullName: 'Aarav', designation: 'Director', company: 'Mehta Events' },
      })}
      submitFeedback={async () => ({})}
    />,
  );

  await waitFor(() => screen.getByLabelText(/customer name/i));
  assert.ok(screen.getByLabelText(/designation/i));
  assert.ok(screen.getByLabelText(/company/i));
  assert.ok(screen.getByRole('radiogroup', { name: /rating/i }));
  assert.ok(screen.getByLabelText(/allow.*publish/i));
  assert.equal(
    (screen.getByRole('button', { name: /submit feedback/i }) as HTMLButtonElement).disabled,
    true,
  );
});

test('submits the selected full image mode', async () => {
  let submitted: Record<string, unknown> | null = null;
  render(
    <PublicFeedbackForm
      initialToken="test-token"
      validateInvitation={async () => ({
        status: 'READY',
        prefill: { fullName: 'Aarav', designation: 'Director', company: 'Mehta Events' },
      })}
      submitFeedback={async (_token, input) => {
        submitted = input as unknown as Record<string, unknown>;
        return {};
      }}
    />,
  );

  await waitFor(() => screen.getByLabelText(/feedback message/i));
  fireEvent.click(screen.getByLabelText('5 stars'));
  fireEvent.change(screen.getByLabelText(/feedback message/i), {
    target: { value: 'The platform saves our team significant time.' },
  });
  fireEvent.change(screen.getByLabelText(/customer photo/i), {
    target: { files: [new File(['image'], 'customer.jpg', { type: 'image/jpeg' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: /use full image/i }));
  fireEvent.click(screen.getByLabelText(/allow.*publish/i));
  fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

  await waitFor(() => screen.getByText(/thank you for sharing/i));
  assert.equal(submitted?.displayMode, 'FULL');
});
