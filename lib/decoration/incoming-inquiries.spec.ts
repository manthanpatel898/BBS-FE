import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEnablePartnerSharing,
  incomingInquiryUrl,
  normalizeIncomingInquiryStatus,
} from './incoming-inquiries';

test('incoming inquiry routes remain compatible with static deployment', () => {
  assert.equal(incomingInquiryUrl('PENDING'), '/decoration/incoming-inquiries');
  assert.equal(incomingInquiryUrl('ACCEPTED'), '/decoration/incoming-inquiries?status=ACCEPTED');
  assert.equal(normalizeIncomingInquiryStatus('unknown'), 'PENDING');
});

test('sharing requires a partner and current policy acknowledgement', () => {
  assert.equal(canEnablePartnerSharing({ partnerCount: 1, currentPolicyAccepted: true, acceptingCurrentPolicy: false }), true);
  assert.equal(canEnablePartnerSharing({ partnerCount: 1, currentPolicyAccepted: false, acceptingCurrentPolicy: true }), true);
  assert.equal(canEnablePartnerSharing({ partnerCount: 0, currentPolicyAccepted: true, acceptingCurrentPolicy: false }), false);
  assert.equal(canEnablePartnerSharing({ partnerCount: 1, currentPolicyAccepted: false, acceptingCurrentPolicy: false }), false);
});
