'use client';

import { useEffect, useRef } from 'react';
import type { ActiveTermsAndConditions } from '@/lib/auth/types';

interface TcModalProps {
  tc: ActiveTermsAndConditions;
  onClose: () => void;
}

function parseTcContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Main section header: "1. About Us", "2. Definitions", etc.
    if (/^\d+\.\s+[A-Z]/.test(line) && !/^\d+\.\d+/.test(line)) {
      nodes.push(
        <h3
          key={i}
          className="mt-6 mb-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1"
        >
          {line}
        </h3>,
      );
      i++;
      continue;
    }

    // Sub-section: "3.1 ...", "4.2 ..."
    if (/^\d+\.\d+\s/.test(line)) {
      nodes.push(
        <p key={i} className="mb-2 text-xs leading-6 text-slate-700">
          <span className="font-semibold text-slate-800">{line.match(/^\d+\.\d+/)?.[0]}</span>
          {line.replace(/^\d+\.\d+/, '')}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet-style definition (quoted term)
    if (line.startsWith('"')) {
      nodes.push(
        <p key={i} className="mb-1.5 ml-3 text-xs leading-6 text-slate-600 before:content-['•'] before:mr-2 before:text-amber-500">
          {line}
        </p>,
      );
      i++;
      continue;
    }

    // Document title / subtitle (first few lines)
    if (i < 3 && !line.match(/^\d/)) {
      nodes.push(
        <p key={i} className="text-xs font-semibold text-slate-500 mb-0.5">{line}</p>,
      );
      i++;
      continue;
    }

    // Default paragraph
    nodes.push(
      <p key={i} className="mb-2 text-xs leading-6 text-slate-600">{line}</p>,
    );
    i++;
  }

  return nodes;
}

export function TcModal({ tc, onClose }: TcModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  const effectiveDate = new Date(tc.effectiveDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tc-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.25)] border border-slate-200/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                {tc.version}
              </span>
              <span className="text-[10px] text-slate-400">Effective {effectiveDate}</span>
            </div>
            <h2 id="tc-modal-title" className="text-base font-bold text-white">
              Terms &amp; Conditions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">ZenBooking — A Product of Zenovel Technolab</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-5 overscroll-contain"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="prose prose-sm max-w-none">
            {parseTcContent(tc.content)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-[10px] text-slate-400 leading-5">
            By accepting, you confirm you have read and agree to be bound by these terms.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-xs font-bold text-slate-900 shadow-[0_6px_20px_rgba(246,173,28,0.35)] transition hover:from-amber-500 hover:to-amber-600"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
