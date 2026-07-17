import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { DecorationPrintButton } from '../../components/decoration/decoration-print-button';
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
    company: { name: 'Banquate', logoUrl: '/broken-logo.png', contactNumbers: [] },
    booking: { id: 'b1', bookingNumber: 'B-1' },
    customer: { name: 'Customer', mobile: '1' },
    event: { eventType: 'Wedding', startDate: '2026-07-17', endDate: '2026-07-17', startTime: '10:00', endTime: '11:00', timeSlot: 'Morning', location: 'Hall', hall: '', address: '' },
    categories: [],
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
