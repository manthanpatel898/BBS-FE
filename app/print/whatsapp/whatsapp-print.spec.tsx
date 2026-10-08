import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { WhatsappPrint } from './whatsapp-print';

test('renderer starts empty and prints injected packages with the normal booking document', async () => {
  render(<WhatsappPrint />);
  assert.equal(screen.queryByText('Booking Summary'), null);
  await act(async () => window.renderWhatsappPrint!({ version: 2, order: {
    customer: { firstName: 'Sample', lastName: 'Guest', phone: '123' }, eventDate: '2026-10-20',
    menuSelectionSnapshot: [{ menuId: 'drinks', title: 'Drinks', directItems: ['Mojito'], sections: [] }],
    additionalCategorySelections: [{ selectionId: 'dinner', categorySnapshot: { name: 'Dinner Package' }, pax: 50, effectivePricePerPlate: 600, subtotal: 30000, displayOrder: 1, startTime: '19:00', endTime: '23:00', menuSelectionSnapshot: [{ menuId: 'soup', title: 'Soup', directItems: ['Tomato soup'], sections: [] }] }],
    advancePayments: [], addonServiceSnapshots: [], pricePerPlate: 500, pax: 100,
  }, restaurant: { name: 'Sample Banquet' }, settings: { banquetRules: [{ id: 'r', label: 'Sample rule' }] } } as never));
  for (const text of ['Booking Summary', 'Mojito', 'Tomato soup', 'Sample rule', 'Customer Sign', 'Manager Sign']) assert.ok(screen.getByText(text));
  assert.ok(screen.getByText(/Dinner Package/));
  assert.ok(document.querySelector('[data-print-ready="true"]'));
  cleanup();
  assert.equal(window.renderWhatsappPrint, undefined);
});
