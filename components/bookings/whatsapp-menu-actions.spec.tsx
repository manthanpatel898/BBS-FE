import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WhatsappMenuActions } from './whatsapp-menu-actions';
afterEach(cleanup);
test('ordinary Save does not send and restaurant gate hides the WhatsApp action', () => {
  let saved = 0; let sent = 0;
  render(<WhatsappMenuActions restaurantEnabled={false} globallyAvailable eligibleBooking busy={false} onSave={() => saved++} onSaveAndSend={() => sent++} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
  assert.equal(saved, 1); assert.equal(sent, 0);
  assert.equal(screen.queryByRole('button', { name: 'Save & send on WhatsApp' }), null);
});
test('global gate and busy state prevent sending', () => {
  let sent = 0;
  const props = { restaurantEnabled: true, globallyAvailable: false, eligibleBooking: true, busy: false, onSave: () => {}, onSaveAndSend: () => sent++ };
  const view = render(<WhatsappMenuActions {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save & send on WhatsApp' }));
  assert.equal(sent, 0); assert.ok(screen.getByText(/not active yet/i));
  view.rerender(<WhatsappMenuActions {...props} globallyAvailable busy />);
  fireEvent.click(screen.getByRole('button', { name: 'Save & send on WhatsApp' }));
  assert.equal(sent, 0);
});
