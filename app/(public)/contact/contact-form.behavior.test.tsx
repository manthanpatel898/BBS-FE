import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactPage from './page';
import { buildContactPayload, getContactErrorMessage } from './contact-form';

test.afterEach(() => {
  cleanup();
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

test('contact payload trims values and includes the honeypot', () => {
  assert.deepEqual(
    buildContactPayload({
      fullName: ' Visitor ',
      email: ' visitor@example.com ',
      phone: ' 1234567890 ',
      company: ' Example ',
      useCase: ' Demo ',
      message: ' Please contact me ',
      website: '',
    }),
    {
      fullName: 'Visitor',
      email: 'visitor@example.com',
      phone: '1234567890',
      company: 'Example',
      useCase: 'Demo',
      message: 'Please contact me',
      website: '',
    },
  );
});

test('contact error helper supports Nest validation arrays', async () => {
  assert.equal(
    await getContactErrorMessage(
      { message: ['Email must be valid', 'Message is required'] },
      'Fallback',
    ),
    'Email must be valid. Message is required',
  );
  assert.equal(await getContactErrorMessage({}, 'Fallback'), 'Fallback');
});

test('contact form is accessible, locks during submission, and resets on success', async () => {
  let resolveFetch: ((value: Response) => void) | undefined;
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })) as typeof fetch;

  render(<ContactPage />);
  const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
  assert.ok(honeypot);
  assert.equal(honeypot.tabIndex, -1);
  assert.ok(screen.getByLabelText('Full name'));
  assert.ok(screen.getByLabelText('Email address'));
  assert.ok(screen.getByRole('status'));

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Visitor' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'visitor@example.com' },
  });
  fireEvent.change(screen.getByLabelText('How can we help?'), {
    target: { value: 'Need a demo' },
  });
  fireEvent.submit(screen.getByRole('button', { name: 'Submit Inquiry' }).closest('form')!);
  assert.equal((screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement).disabled, true);

  resolveFetch!(
    new Response(
      JSON.stringify({ success: true, message: 'Inquiry submitted successfully' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  await waitFor(() => screen.getByText(/our team will contact you shortly/i));
  assert.equal((screen.getByLabelText('Full name') as HTMLInputElement).value, '');
});

test('contact form keeps entered data and shows server validation errors', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, message: ['Email must be valid'] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
  render(<ContactPage />);
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Visitor' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'invalid@example.com' },
  });
  fireEvent.change(screen.getByLabelText('How can we help?'), {
    target: { value: 'Need a demo' },
  });
  fireEvent.submit(screen.getByRole('button', { name: 'Submit Inquiry' }).closest('form')!);
  await waitFor(() => screen.getByText('Email must be valid'));
  assert.equal((screen.getByLabelText('Full name') as HTMLInputElement).value, 'Visitor');
});
