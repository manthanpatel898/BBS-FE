import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast';
import { AppSettings } from '@/lib/auth/types';
import { QuotationSettingsCard } from './quotation-settings-card';

const baseSettings = {
  id: 'settings-1',
  restaurantId: 'restaurant-1',
  paymentOptions: [],
  eventOptions: [],
  eventPlanners: [],
  hallDetails: [],
  hiddenHallDetailCombinations: [],
  banquetRules: [],
  addonServices: [],
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
} satisfies AppSettings;

test.afterEach(() => cleanup());

test('quotation settings card renders saved settings and allows toggling availability', () => {
  let saved: AppSettings | null = null;

  render(
    <ToastProvider>
      <QuotationSettingsCard
        accessToken="token"
        settings={{
          ...baseSettings,
          inquiryQuotationSettings: {
            enableInquiryQuotations: true,
            validityDays: 20,
            taxTreatment: 'TAX_INCLUDED',
            gstPercentage: 18,
            terms: 'Terms text',
            paymentTerms: 'Payment text',
            cancellationPolicy: 'Cancellation text',
            footer: 'Footer text',
          },
        }}
        onSaved={(settings) => {
          saved = settings;
        }}
      />
    </ToastProvider>,
  );

  assert.equal(screen.getByRole('switch').getAttribute('aria-checked'), 'true');
  assert.equal((screen.getByLabelText('Validity days') as HTMLInputElement).value, '20');
  assert.equal((screen.getByLabelText('GST percentage') as HTMLInputElement).value, '18');

  fireEvent.click(screen.getByRole('switch'));

  assert.equal(screen.getByRole('switch').getAttribute('aria-checked'), 'false');
  assert.equal(saved, null);
});
