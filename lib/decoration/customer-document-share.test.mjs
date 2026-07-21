import assert from 'node:assert/strict';
import test from 'node:test';
import { canSharePdf, sharePdf } from './customer-document-share.ts';

test('detects native PDF file sharing support', () => {
  const supported = { share() {}, canShare: ({ files }) => files?.[0]?.type === 'application/pdf' };
  assert.equal(canSharePdf(supported), true);
  assert.equal(canSharePdf({ share() {}, canShare: () => false }), false);
  assert.equal(canSharePdf({}), false);
});

test('shares a correctly named PDF file', async () => {
  let payload;
  const navigatorLike = { canShare: () => true, share: async (value) => { payload = value; } };
  await sharePdf(new Blob(['pdf'], { type: 'application/pdf' }), 'proposal.pdf', 'Decoration proposal', navigatorLike);
  assert.equal(payload.title, 'Decoration proposal');
  assert.equal(payload.files[0].name, 'proposal.pdf');
  assert.equal(payload.files[0].type, 'application/pdf');
});

test('treats AbortError as cancellation but propagates real share errors', async () => {
  await assert.doesNotReject(() => sharePdf(new Blob(), 'a.pdf', 'Proposal', {
    canShare: () => true,
    share: async () => { throw new DOMException('cancelled', 'AbortError'); },
  }));
  await assert.rejects(() => sharePdf(new Blob(), 'a.pdf', 'Proposal', {
    canShare: () => true,
    share: async () => { throw new Error('share failed'); },
  }), /share failed/);
});
