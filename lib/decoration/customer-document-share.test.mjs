import assert from 'node:assert/strict';
import test from 'node:test';
import { canSharePdf, createPdfShareController, sharePdf } from './customer-document-share.ts';

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

test('prepares the PDF before the tap and invokes native sharing synchronously from share()', async () => {
  const events = [];
  let finishDownload;
  const controller = createPdfShareController({
    download: () => new Promise((resolve) => { finishDownload = resolve; }),
    share: () => { events.push('native-share-called'); },
    onStatus: (status) => events.push(status),
    onError: () => {},
  });

  const preparation = controller.prepare();
  assert.equal(controller.share(), false);
  finishDownload({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'proposal.pdf' });
  await preparation;

  events.length = 0;
  const sharing = controller.share();
  assert.deepEqual(events, ['sharing', 'native-share-called']);
  await sharing;
  assert.deepEqual(events, ['sharing', 'native-share-called', 'ready']);
});

test('deduplicates preparation and aborts stale PDF work', async () => {
  let signal;
  let calls = 0;
  const controller = createPdfShareController({
    download: (value) => { calls += 1; signal = value; return new Promise(() => {}); },
    share: () => {},
    onStatus: () => {},
    onError: () => {},
  });

  controller.prepare();
  assert.equal(controller.prepare(), false);
  assert.equal(calls, 1);
  controller.abort();
  assert.equal(signal.aborted, true);
});
