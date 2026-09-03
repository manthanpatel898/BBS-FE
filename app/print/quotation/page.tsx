'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchMyRestaurant, fetchOrderPrint, fetchSettings } from '@/lib/auth/api';
import type { AppSettings, Order, Restaurant } from '@/lib/auth/types';
import { fetchOrderQuotation } from '@/lib/quotations/api';
import type { BanquetQuotation } from '@/lib/quotations/types';
import { quotationToPrintableOrder } from '@/lib/quotations/print-adapter';
import { QuotationPrintDocument } from './quotation-print-document';

function sanitizeTitle(value: string) {
  return value.replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ').trim();
}

function QuotationPrintContent() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const quotationId = params.get('quotationId') ?? '';
  const autoPrint = params.get('print') === '1';
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [quotation, setQuotation] = useState<BanquetQuotation | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const printableOrder = useMemo(
    () => (order && quotation ? quotationToPrintableOrder(order, quotation) : null),
    [order, quotation],
  );

  useEffect(() => {
    if (!accessToken || !orderId || !quotationId) {
      setError(!accessToken ? 'Missing session token.' : 'Missing quotation details.');
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [orderResponse, quotationResponse, settingsResponse, restaurantResponse] =
          await Promise.all([
            fetchOrderPrint(accessToken!, orderId),
            fetchOrderQuotation(accessToken!, orderId, quotationId),
            fetchSettings(accessToken!).catch(() => null),
            fetchMyRestaurant(accessToken!).catch(() => null),
          ]);
        if (!active) return;
        setOrder(orderResponse);
        setQuotation(quotationResponse);
        setSettings(settingsResponse);
        setRestaurant(restaurantResponse);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load quotation print.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [accessToken, orderId, quotationId]);

  useEffect(() => {
    if (!quotation || !printableOrder) return;
    document.title = sanitizeTitle(
      `Quotation ${quotation.quotationNumber} V${quotation.version} - ${printableOrder.customer.firstName} ${printableOrder.customer.lastName}`,
    );
    if (autoPrint) window.setTimeout(() => window.print(), 500);
  }, [autoPrint, printableOrder, quotation]);

  return (
    <BookingsRoute>
      <section className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[220mm] space-y-6">
          <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm print:hidden md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Print View</p>
              <h1 className="mt-2 text-3xl font-semibold">Quotation Print</h1>
              {quotation ? (
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  {quotation.quotationNumber} · Version {quotation.version}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={() => window.print()} className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white">
              Print / Save PDF
            </button>
          </div>
          {loading ? (
            <div className="rounded-[28px] bg-white p-10 text-center text-stone-500 shadow-sm">Loading printable quotation...</div>
          ) : error ? (
            <div className="rounded-[28px] bg-white p-10 text-center text-red-600 shadow-sm">{error}</div>
          ) : printableOrder && quotation ? (
            <QuotationPrintDocument
              order={printableOrder}
              quotation={quotation}
              restaurant={restaurant}
              settings={settings}
            />
          ) : null}
        </div>
      </section>
    </BookingsRoute>
  );
}

export default function QuotationPrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <QuotationPrintContent />
    </Suspense>
  );
}
