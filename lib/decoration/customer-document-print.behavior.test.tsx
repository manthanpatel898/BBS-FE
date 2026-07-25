import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DecorationPdfViewer, DecorationPrintButton, DecorationPrintControls } from '../../components/decoration/decoration-print-button';
import { DecorationCustomerDocumentView } from '../../components/decoration/decoration-customer-document';
import { waitForPrintableDocument } from './customer-document-print-readiness';

const page = () => within(document.body);

test.afterEach(() => cleanup());

test('visible Print waits for fonts, printable images, and paint while blocking duplicate clicks', async () => {
  const rootRef = createRef<HTMLElement>();
  let resolveFonts!: () => void;
  let resolvePaint!: () => void;
  let prints = 0;
  const fonts = new Promise<void>((resolve) => { resolveFonts = resolve; });
  const paint = new Promise<void>((resolve) => { resolvePaint = resolve; });
  const view = render(<main ref={rootRef}><img alt="pending" src="/pending.png" /><DecorationPrintButton
    printableRoot={rootRef}
    fontsReady={fonts}
    print={() => { prints += 1; }}
    waitForReady={(root, ready, signal) => waitForPrintableDocument(root, ready, signal, { afterPaint: () => paint })}
  /></main>);
  const button = page().getByRole('button', { name: 'Print' });
  fireEvent.click(button);
  fireEvent.click(button);
  assert.equal(button.hasAttribute('disabled'), true);
  assert.equal(prints, 0);
  await act(async () => {
    resolveFonts();
    await Promise.resolve();
  });
  fireEvent.error(page().getByAltText('pending'));
  await Promise.resolve();
  assert.equal(prints, 0);
  resolvePaint();
  await waitFor(() => assert.equal(prints, 1));
  assert.equal(button.hasAttribute('disabled'), false);
  view.unmount();
});

test('visible Print aborts pending readiness on unmount and never prints', async () => {
  const rootRef = createRef<HTMLElement>();
  let resolveFonts!: () => void;
  let prints = 0;
  const fonts = new Promise<void>((resolve) => { resolveFonts = resolve; });
  const view = render(<main ref={rootRef}><DecorationPrintButton printableRoot={rootRef} fontsReady={fonts} print={() => { prints += 1; }} /></main>);
  fireEvent.click(page().getByRole('button', { name: 'Print' }));
  view.unmount();
  resolveFonts();
  await act(async () => Promise.resolve());
  assert.equal(prints, 0);
});

test('broken company logo is omitted before readiness settles after fallback paint', async () => {
  const documentValue = {
    company: { name: 'Banquate', logoUrl: '/broken-logo.png', contactNumbers: [], address: 'Ahmedabad' },
    booking: { id: 'b1', bookingNumber: 'B-1' },
    customer: { name: 'Customer', mobile: '1' },
    event: { eventType: 'Wedding', startDate: '2026-07-17', endDate: '2026-07-17', startTime: '10:00', endTime: '11:00', timeSlot: 'Morning', location: 'Hall', hall: '', address: '' },
    categories: [],
    financials: { isPackagePriceFinalized: false, finalPackageAmount: null, totalAmountReceived: 0, pendingAmount: null },
    payments: [],
  } as any;
  const view = render(<main><DecorationCustomerDocumentView document={documentValue} /></main>);
  const root = view.container.querySelector('main')!;
  const logo = page().getByAltText('Banquate logo');
  let resolvePaint!: () => void;
  const paint = new Promise<void>((resolve) => { resolvePaint = resolve; });
  let settled = false;
  const waiting = waitForPrintableDocument(root, Promise.resolve(), new AbortController().signal, { afterPaint: () => paint }).then((ready) => { settled = ready; });
  fireEvent.error(logo);
  await waitFor(() => assert.equal(page().queryByAltText('Banquate logo'), null));
  assert.equal(view.container.querySelector('[data-company-logo]'), null);
  assert.equal(settled, false);
  resolvePaint();
  await waiting;
  assert.equal(settled, true);
});

test('print mode auto-prints once without exposing a second manual Print action', async () => {
  const rootRef = createRef<HTMLElement>();
  let prints = 0;
  render(<main ref={rootRef}><DecorationPrintControls mode="print" printableRoot={rootRef} fontsReady={Promise.resolve()} print={() => { prints += 1; }} waitForReady={async () => true} /></main>);
  await waitFor(() => assert.equal(prints, 1));
  assert.equal(page().queryByRole('button', { name: 'Print' }), null);
});

test('view mode does not auto-print and exposes the readiness-aware manual Print action', async () => {
  const rootRef = createRef<HTMLElement>();
  let prints = 0;
  render(<main ref={rootRef}><DecorationPrintControls mode="view" printableRoot={rootRef} fontsReady={Promise.resolve()} print={() => { prints += 1; }} waitForReady={async () => true} /></main>);
  await act(async () => Promise.resolve());
  assert.equal(prints, 0);
  fireEvent.click(page().getByRole('button', { name: 'Print' }));
  await waitFor(() => assert.equal(prints, 1));
});

test('PDF viewer loads one PDF artifact, enables print after load, and revokes its URL', async () => {
  const created: Blob[] = [];
  const revoked: string[] = [];
  let prints = 0;
  const view = render(<DecorationPdfViewer
    mode="view"
    returnHref="/decoration/events?date=2026-07-18&bookingId=b1"
    loadPdf={async () => ({ blob: new Blob(['%PDF-1.3'], { type: 'application/pdf' }), filename: 'proposal.pdf' })}
    objectUrls={{ create: (blob) => { created.push(blob); return 'blob:proposal'; }, revoke: (url) => revoked.push(url) }}
    printFrame={() => { prints += 1; }}
  />);
  const frame = await page().findByTitle('Decoration proposal PDF');
  assert.equal(frame.getAttribute('src'), 'blob:proposal');
  assert.equal(page().getByRole('button', { name: 'Print' }).hasAttribute('disabled'), true);
  fireEvent.load(frame);
  fireEvent.click(page().getByRole('button', { name: 'Print' }));
  assert.equal(prints, 1);
  assert.equal(created.length, 1);
  view.unmount();
  assert.deepEqual(revoked, ['blob:proposal']);
});

test('print-mode PDF viewer prints the loaded PDF once', async () => {
  let prints = 0;
  render(<DecorationPdfViewer
    mode="print"
    returnHref="/decoration/events"
    loadPdf={async () => ({ blob: new Blob(['%PDF-1.3'], { type: 'application/pdf' }), filename: 'proposal.pdf' })}
    objectUrls={{ create: () => 'blob:print-proposal', revoke: () => undefined }}
    printFrame={() => { prints += 1; }}
  />);
  const frame = await page().findByTitle('Decoration proposal PDF');
  fireEvent.load(frame);
  await waitFor(() => assert.equal(prints, 1));
  fireEvent.load(frame);
  assert.equal(prints, 1);
});
