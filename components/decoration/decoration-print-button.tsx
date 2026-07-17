'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { waitForPrintableDocument } from '@/lib/decoration/customer-document-print-readiness';

type WaitForReady = typeof waitForPrintableDocument;

export function DecorationPrintButton({
  printableRoot,
  fontsReady,
  print = () => window.print(),
  waitForReady = waitForPrintableDocument,
}: {
  printableRoot: RefObject<HTMLElement | null>;
  fontsReady?: Promise<unknown>;
  print?: () => void;
  waitForReady?: WaitForReady;
}) {
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  async function startPrint() {
    const root = printableRoot.current;
    if (!root || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    try {
      if (await waitForReady(root, fontsReady ?? window.document.fonts.ready, controller.signal)) print();
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mountedRef.current) setBusy(false);
    }
  }

  return <button type="button" disabled={busy} aria-busy={busy} onClick={() => void startPrint()} className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{busy ? 'Preparing…' : 'Print'}</button>;
}
