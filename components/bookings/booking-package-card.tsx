'use client';

import type { ReactNode } from 'react';

type Props = {
  id: string;
  label: string;
  categoryName: string;
  pax: string;
  serviceSlot: string;
  startTime: string;
  endTime: string;
  effectiveRate: number;
  subtotal: number;
  selectedItemCount: number;
  expanded: boolean;
  error?: string;
  removable?: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  children: ReactNode;
};

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function BookingPackageCard({
  id,
  label,
  categoryName,
  pax,
  serviceSlot,
  startTime,
  endTime,
  effectiveRate,
  subtotal,
  selectedItemCount,
  expanded,
  error,
  removable = false,
  onToggle,
  onRemove,
  children,
}: Props) {
  const bodyId = `booking-package-${id}`;
  const time = startTime && endTime ? `${startTime} - ${endTime}` : 'Time pending';

  return (
    <section
      data-package-card={id}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition sm:rounded-3xl ${
        error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
            {label}
          </span>
          <span className="mt-1 block truncate text-base font-bold text-slate-950 sm:text-lg">
            {categoryName || 'Select category'}
          </span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600 sm:text-sm">
            <span>{pax ? `${pax} pax` : 'Pax pending'}</span>
            <span>{serviceSlot || 'Slot pending'}</span>
            <span>{time}</span>
          </span>
          <span className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <span>
              <span className="block text-slate-500">Rate</span>
              <strong className="text-slate-900">{currency(effectiveRate)}</strong>
            </span>
            <span>
              <span className="block text-slate-500">Subtotal</span>
              <strong className="text-slate-900">{currency(subtotal)}</strong>
            </span>
            <span>
              <span className="block text-slate-500">Menu</span>
              <strong className="text-slate-900">
                {selectedItemCount} {selectedItemCount === 1 ? 'item' : 'items'} selected
              </strong>
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {removable && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${categoryName || 'additional package'}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-lg text-red-600 transition hover:bg-red-50"
            >
              ×
            </button>
          ) : null}
          <span
            aria-hidden="true"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition ${expanded ? 'rotate-180' : ''}`}
          >
           ⌄
          </span>
        </div>
      </div>
      {error ? (
        <p role="alert" className="border-t border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:px-4">
          {error}
        </p>
      ) : null}
      {expanded ? (
        <div
          id={bodyId}
          data-package-card-body="true"
          className="border-t border-slate-200 bg-slate-50/60 p-3 sm:p-5"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
