import assert from 'node:assert/strict';
import test from 'node:test';
import { canShowInquiryQuotationAction } from './eligibility';

test('shows inquiry quotation action only for enabled open future inquiries', () => {
  assert.equal(
    canShowInquiryQuotationAction({
      enabled: true,
      canManage: true,
      status: 'INQUIRY',
      inquiryClosed: false,
      isPastEvent: false,
    }),
    true,
  );
  assert.equal(canShowInquiryQuotationAction({ enabled: false, canManage: true, status: 'INQUIRY' }), false);
  assert.equal(canShowInquiryQuotationAction({ enabled: true, canManage: false, status: 'INQUIRY' }), false);
  assert.equal(canShowInquiryQuotationAction({ enabled: true, canManage: true, status: 'CONFIRMED' }), false);
  assert.equal(canShowInquiryQuotationAction({ enabled: true, canManage: true, status: 'INQUIRY', inquiryClosed: true }), false);
  assert.equal(canShowInquiryQuotationAction({ enabled: true, canManage: true, status: 'INQUIRY', isPastEvent: true }), false);
});
