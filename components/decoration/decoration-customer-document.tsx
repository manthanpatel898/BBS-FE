'use client';

import { useState } from 'react';
import type { DecorationCustomerDocument } from '@/lib/auth/types';
import { printableImageAttributes } from '@/lib/decoration/customer-document-image';

type DocumentItem = DecorationCustomerDocument['categories'][number]['items'][number];

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function ImageWithFallback({ item }: { item: DocumentItem }) {
  const [failed, setFailed] = useState(false);
  const source = failed ? null : item.image?.url.trim();

  return (
    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
      {source ? (
        <img
          src={source}
          alt={item.itemName}
          className="h-full w-full object-cover"
          {...printableImageAttributes}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="grid h-full min-h-32 place-items-center px-4 text-center text-sm font-medium text-slate-400"
          role="img"
          aria-label={`Image unavailable for ${item.itemName}`}
        >
          Image unavailable
        </div>
      )}
    </div>
  );
}

function CompanyLogo({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <div data-company-logo className="flex h-16 w-16 shrink-0 items-center justify-center p-1">
    <img
      src={url}
      alt={`${name} logo`}
      className="max-h-full max-w-full object-contain"
      {...printableImageAttributes}
      onError={() => setFailed(true)}
    />
  </div>;
}

function DetailSection({
  id,
  title,
  rows,
}: {
  id: string;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <h2 id={id} className="border-b border-slate-300 pb-2 text-sm font-bold uppercase tracking-wider text-slate-900">
        {title}
      </h2>
      <dl className="mt-3 divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(6rem,35%)_1fr] gap-3 py-2 first:pt-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 break-words font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function DecorationCustomerDocumentView({
  document,
}: {
  document: DecorationCustomerDocument;
}) {
  const itemCount = document.categories.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <article className="decoration-customer-document mx-auto w-full max-w-[210mm] bg-white px-4 py-6 text-slate-900 sm:px-8 sm:py-8 print:max-w-none print:p-0">
      <header className="decoration-document-header border-b-2 border-slate-900 pb-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {document.company.logoUrl ? <CompanyLogo key={document.company.logoUrl} url={document.company.logoUrl} name={document.company.name} /> : null}
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{document.company.name}</h1>
              {document.company.contactNumbers.length ? (
                <p className="mt-1 break-words text-sm text-slate-600">
                  {document.company.contactNumbers.map((contact) => contact.trim()).filter(Boolean).join(' · ')}
                </p>
              ) : null}
              {document.company.address ? <p className="mt-1 max-w-xl whitespace-pre-line break-words text-sm text-slate-600">{document.company.address}</p> : null}
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Decoration Proposal</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">{document.booking.bookingNumber}</p>
          </div>
        </div>
      </header>

      <div className="my-6 grid gap-6 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 sm:p-5 print:grid-cols-2">
        <DetailSection
          id="decoration-customer-heading"
          title="Customer"
          rows={[
            ['Name', document.customer.name],
            ['Mobile', document.customer.mobile],
          ]}
        />
        <DetailSection
          id="decoration-event-venue-heading"
          title="Event & Venue"
          rows={[
            ['Event Type', document.event.eventType],
            ['Event Date', formatDate(document.event.startDate)],
            ['Time', `${document.event.startTime} – ${document.event.endTime}`],
            ['Time Slot', document.event.timeSlot],
            ['Venue', document.event.location],
            ['Hall', document.event.hall || 'Not applicable'],
            ['Address', document.event.address || 'Not provided'],
          ]}
        />
      </div>

      <section aria-labelledby="decoration-financial-summary-heading" className="mb-6 rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 id="decoration-financial-summary-heading" className="text-sm font-bold uppercase tracking-wider text-slate-900">Payment Summary</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Package</dt><dd className="mt-1 font-bold text-slate-900">{document.financials.isPackagePriceFinalized && document.financials.finalPackageAmount !== null ? formatMoney(document.financials.finalPackageAmount) : 'Not finalized'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advance Received</dt><dd className="mt-1 font-bold text-emerald-700">{formatMoney(document.financials.totalAmountReceived)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Amount</dt><dd className="mt-1 font-bold text-slate-900">{document.financials.pendingAmount !== null ? formatMoney(document.financials.pendingAmount) : 'Not available'}</dd></div>
        </dl>
      </section>

      {document.payments.length ? <section aria-labelledby="decoration-payment-history-heading" className="mb-6 break-inside-avoid rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 id="decoration-payment-history-heading" className="text-sm font-bold uppercase tracking-wider text-slate-900">Advance Payment History</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Mode</th><th className="py-2 pr-3">Remark</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody>{document.payments.map((payment,index)=><tr key={`${payment.date}:${payment.amount}:${index}`} className="border-b border-slate-100 last:border-0"><td className="py-2 pr-3 text-slate-700">{formatDate(payment.date)}</td><td className="py-2 pr-3 font-semibold text-slate-900">{payment.mode || 'Not specified'}</td><td className="py-2 pr-3 text-slate-600">{payment.remark || '—'}</td><td className="py-2 text-right font-bold text-slate-900">{formatMoney(payment.amount)}</td></tr>)}</tbody>
          </table>
        </div>
      </section> : null}

      <section aria-labelledby="decoration-selection-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <h2 id="decoration-selection-heading" className="text-2xl font-bold">Decoration Selection</h2>
          <p className="text-sm text-slate-500">{itemCount} selected {itemCount === 1 ? 'item' : 'items'}</p>
        </div>

        {document.categories.length ? (
          <div className="space-y-7">
            {document.categories.map((category, categoryIndex) => {
              const headingId = `decoration-category-${categoryIndex}`;
              return (
                <section key={`${category.id || category.name}:${categoryIndex}`} aria-labelledby={headingId} className="decoration-document-group">
                  <h3 id={headingId} className="mb-3 border-b border-slate-300 pb-2 text-lg font-bold">
                    {category.name}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
                    {category.items.map((item, itemIndex) => (
                      <article key={`${category.id}:${item.itemName}:${itemIndex}`} className="decoration-document-item overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <ImageWithFallback item={item} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="min-w-0 break-words font-bold">{item.itemName}</h4>
                            {item.isCustom ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Custom</span> : null}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-600">Quantity: {item.quantity}</p>
                          {item.description ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No decoration items are included in this proposal.</p>
        )}
      </section>

      {document.generalNotes?.trim() ? (
        <section aria-labelledby="decoration-general-notes-heading" className="decoration-general-notes mt-7 break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 id="decoration-general-notes-heading" className="text-lg font-bold text-slate-950">General Notes</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{document.generalNotes.trim()}</p>
        </section>
      ) : null}

      <footer className="mt-10 border-t pt-4 text-center text-xs text-slate-400">
        Generated from immutable event snapshot · {document.booking.bookingNumber}
      </footer>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: white !important; }
          nav, aside { display: none !important; }
          .decoration-customer-document { width: 100%; }
          .decoration-document-header { break-after: avoid; }
          .decoration-document-group { break-inside: avoid-page; margin-bottom: 8mm; }
          .decoration-document-item { break-inside: avoid; box-shadow: none !important; }
          .decoration-customer-document img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </article>
  );
}
