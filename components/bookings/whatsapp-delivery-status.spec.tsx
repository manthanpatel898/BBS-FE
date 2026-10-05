import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WhatsappBookingCommunication, WhatsappDeliveryStatus } from './whatsapp-delivery-status';
afterEach(cleanup);
test('acceptance is not presented as delivery and unknown outcomes explain no automatic resend', () => {
  render(<WhatsappDeliveryStatus entries={[{ _id: '1', eventType: 'MENU_FINALIZED', status: 'ACCEPTED' }, { _id: '2', eventType: 'BOOKING_CONFIRMED', status: 'UNCERTAIN' }]} />);
  assert.ok(screen.getByText(/Accepted by WhatsApp provider/));
  assert.ok(screen.getByText(/not resent automatically/));
  assert.equal(screen.queryByText('Delivered'), null);
});
test('status continues polling while a newly queued intent awaits reconciliation', async context => {
  let requests = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ success: true, data: requests === 1 ? [] : [{ _id: '1', eventType: 'MENU_FINALIZED', status: 'DELIVERED' }] }), { status: 200 });
  });
  context.mock.timers.enable({ apis: ['setTimeout'] });
  await act(async () => { render(<WhatsappBookingCommunication token="test" orderId="booking" customerId="customer" consentGranted />); });
  await act(async () => { context.mock.timers.tick(10000); });
  assert.ok(screen.getByText('Menu: Delivered'));
});
test('status can be refreshed after another send for the same booking', async context => {
  let requests = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ success: true, data: requests === 1 ? [] : [{ _id: '1', eventType: 'MENU_FINALIZED', status: 'PENDING' }] }), { status: 200 });
  });
  await act(async () => { render(<WhatsappBookingCommunication token="test" orderId="booking" customerId="customer" consentGranted />); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh status', hidden: true })); });
  assert.ok(screen.getByText('Menu: Queued'));
});
