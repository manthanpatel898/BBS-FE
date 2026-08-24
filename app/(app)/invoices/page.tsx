'use client';

import { Suspense } from 'react';
import { BanquetInvoiceWorkspace } from '@/components/invoices/banquet-invoice-workspace';

export default function InvoicesPage() {
  return <Suspense fallback={<div className="p-8 text-center font-semibold text-slate-500">Loading invoices…</div>}><BanquetInvoiceWorkspace /></Suspense>;
}
