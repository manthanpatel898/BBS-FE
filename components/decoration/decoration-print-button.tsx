'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { waitForPrintableDocument } from '@/lib/decoration/customer-document-print-readiness';
import type { DownloadedPdf } from '@/lib/decoration/customer-document-download';

type WaitForReady = typeof waitForPrintableDocument;
type PrintMode = 'view' | 'print';
type PrintControlProps = {
  printableRoot: RefObject<HTMLElement | null>;
  fontsReady?: Promise<unknown>;
  print?: () => void;
  waitForReady?: WaitForReady;
};
const printWindow = () => window.print();

type PdfObjectUrls = {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
};
const DEFAULT_PDF_OBJECT_URLS: PdfObjectUrls = {
  create: (blob) => window.URL.createObjectURL(blob),
  revoke: (url) => window.URL.revokeObjectURL(url),
};
const printEmbeddedPdf = (frame: HTMLIFrameElement) => frame.contentWindow?.print();

export function DecorationPdfViewer({
  mode,
  returnHref,
  loadPdf,
  objectUrls = DEFAULT_PDF_OBJECT_URLS,
  printFrame = printEmbeddedPdf,
}: {
  mode: PrintMode;
  returnHref: string;
  loadPdf: (signal: AbortSignal) => Promise<DownloadedPdf>;
  objectUrls?: PdfObjectUrls;
  printFrame?: (frame: HTMLIFrameElement) => void;
}) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [filename, setFilename] = useState('decoration-proposal.pdf');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const autoPrintedUrl = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setPdfUrl('');
    setLoaded(false);
    setError('');
    void loadPdf(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        objectUrl = objectUrls.create(result.blob);
        setFilename(result.filename);
        setPdfUrl(objectUrl);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load the decoration proposal.');
      });
    return () => {
      controller.abort();
      if (objectUrl) objectUrls.revoke(objectUrl);
    };
  }, [attempt, loadPdf, objectUrls]);

  useEffect(() => {
    if (mode !== 'print' || !loaded || !pdfUrl || autoPrintedUrl.current === pdfUrl || !frameRef.current) return;
    autoPrintedUrl.current = pdfUrl;
    printFrame(frameRef.current);
  }, [loaded, mode, pdfUrl, printFrame]);

  return <main className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100 text-slate-900">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm print:hidden sm:px-5">
      <div className="min-w-0"><p className="truncate text-sm font-bold">{filename}</p><p className="text-xs text-slate-500">Customer decoration proposal</p></div>
      <div className="flex gap-2">
        {mode === 'view' ? <button type="button" disabled={!loaded} onClick={() => { if (frameRef.current) printFrame(frameRef.current); }} className="min-h-11 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50">Print</button> : null}
        <a href={returnHref} className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Back</a>
      </div>
    </div>
    <div className="min-h-0 flex-1">
      {error ? <div className="grid h-full place-items-center p-6 text-center"><div><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 min-h-11 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Retry</button></div></div> : pdfUrl ? <iframe ref={frameRef} src={pdfUrl} title="Decoration proposal PDF" onLoad={() => setLoaded(true)} className="h-full w-full border-0 bg-white" /> : <div className="grid h-full place-items-center text-sm text-slate-600">Preparing proposal PDF…</div>}
    </div>
  </main>;
}

export function DecorationPrintButton({
  printableRoot,
  fontsReady,
  print = printWindow,
  waitForReady = waitForPrintableDocument,
}: {
  printableRoot: PrintControlProps['printableRoot'];
  fontsReady?: PrintControlProps['fontsReady'];
  print?: PrintControlProps['print'];
  waitForReady?: PrintControlProps['waitForReady'];
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

export function DecorationPrintControls({
  mode,
  printableRoot,
  fontsReady,
  print = printWindow,
  waitForReady = waitForPrintableDocument,
}: PrintControlProps & { mode: PrintMode }) {
  useEffect(() => {
    if (mode !== 'print') return;
    const root = printableRoot.current;
    if (!root) return;
    const controller = new AbortController();
    void waitForReady(root, fontsReady ?? window.document.fonts.ready, controller.signal)
      .then((ready) => { if (ready) print(); });
    return () => controller.abort();
  }, [fontsReady, mode, print, printableRoot, waitForReady]);

  return mode === 'view' ? <DecorationPrintButton printableRoot={printableRoot} fontsReady={fontsReady} print={print} waitForReady={waitForReady} /> : null;
}
