'use client';

import { useEffect, useState } from 'react';
import type { AppSettings, Order, Restaurant } from '@/lib/auth/types';
import { PrintDocument } from '../order/print-order-view';

type PrintSnapshot = { version: 2; order: Order; restaurant: Restaurant; settings: AppSettings };
declare global {
  interface Window { renderWhatsappPrint?: (snapshot: PrintSnapshot) => void }
}

/** Data-free shell. No booking IDs, query tokens, API calls, or browser storage. */
export function WhatsappPrint() {
  const [snapshot, setSnapshot] = useState<PrintSnapshot | null>(null);
  useEffect(() => {
    window.renderWhatsappPrint = (value) => {
      if (value.version !== 2 || !value.order?.customer || !Array.isArray(value.order.menuSelectionSnapshot)) {
        throw new Error('Unsupported print snapshot');
      }
      setSnapshot(value);
    };
    return () => { delete window.renderWhatsappPrint; };
  }, []);
  return snapshot ? (
    <main data-print-ready="true">
      <PrintDocument order={snapshot.order} restaurant={snapshot.restaurant} settings={snapshot.settings} copyType="customer" />
    </main>
  ) : null;
}
