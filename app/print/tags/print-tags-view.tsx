'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchOrderPrint, fetchSettings } from '@/lib/auth/api';
import { AppSettings, Order } from '@/lib/auth/types';

type PrintTagItem = {
  id: string;
  itemName: string;
};

type PrintTagRequest = {
  orderId?: string;
  selectedItemIds: string;
};

export function PrintTagsView({
  orderId,
  selectedItemIds,
}: {
  orderId?: string;
  selectedItemIds: string;
}) {
  const { accessToken } = useAuth();
  const [printRequest, setPrintRequest] = useState<PrintTagRequest>({
    orderId,
    selectedItemIds,
  });
  const [isResolvingRequest, setIsResolvingRequest] = useState(!orderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const requestedIds = useMemo(
    () =>
      printRequest.selectedItemIds
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean),
    [printRequest.selectedItemIds],
  );

  const selectedItems = useMemo(() => {
    if (!order) return [];
    const requestedIdSet = new Set(requestedIds);
    return buildPrintTagItems(order).filter((item) => requestedIdSet.has(item.id));
  }, [order, requestedIds]);

  const pages = useMemo(() => chunkItems(selectedItems, 3), [selectedItems]);

  useEffect(() => {
    if (orderId) {
      setPrintRequest({ orderId, selectedItemIds });
      setIsResolvingRequest(false);
      return;
    }

    const requestKey = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('request');
    if (!requestKey) {
      setIsResolvingRequest(false);
      return;
    }

    try {
      const storedRequest = localStorage.getItem(requestKey);
      if (!storedRequest) {
        setIsResolvingRequest(false);
        return;
      }

      const parsedRequest = JSON.parse(storedRequest) as PrintTagRequest;
      setPrintRequest({
        orderId: parsedRequest.orderId,
        selectedItemIds: parsedRequest.selectedItemIds || '',
      });
      localStorage.removeItem(requestKey);
    } catch {
      setPrintRequest({ orderId: undefined, selectedItemIds: '' });
    } finally {
      setIsResolvingRequest(false);
    }
  }, [orderId, selectedItemIds]);

  useEffect(() => {
    if (isResolvingRequest) {
      return;
    }

    if (!accessToken || !printRequest.orderId) {
      setIsLoading(false);
      setError(printRequest.orderId ? 'Missing session token.' : 'Missing order id.');
      return;
    }

    const token = accessToken;
    const requestedOrderId = printRequest.orderId;

    async function loadPrintTags() {
      try {
        setIsLoading(true);
        setError('');
        const [orderResponse, settingsResponse] = await Promise.all([
          fetchOrderPrint(token, requestedOrderId),
          fetchSettings(token),
        ]);
        setOrder(orderResponse);
        setSettings(settingsResponse);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load print tags.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPrintTags();
  }, [accessToken, isResolvingRequest, printRequest.orderId]);

  const printTagLogoUrl = settings?.printTagLogoUrl ?? '';

  useEffect(() => {
    if (!order) return;

    const titleParts = [
      'Print Tags',
      order.orderId,
      order.eventDate ? formatTitleDate(order.eventDate) : null,
      selectedItems.length ? `${selectedItems.length} Items` : null,
    ].filter(Boolean);

    document.title = sanitizeDocumentTitle(titleParts.join(' - '));
  }, [order, selectedItems.length]);

  return (
    <BookingsRoute>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-tag-wrapper {
            margin: 0 !important;
            max-width: none !important;
            padding: 0 !important;
          }

          .print-tag-page {
            break-inside: avoid;
            break-after: page;
            box-shadow: none !important;
            height: 285mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            width: 200mm !important;
          }

          .print-tag-page:last-child {
            break-after: auto;
          }
        }
      `}</style>

      <section className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 print:bg-white print:px-0 print:py-0">
        <div className="print-tag-wrapper mx-auto max-w-[220mm] space-y-6">
          <div className="no-print flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                Print View
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Serving Item Tags</h1>
              <p className="mt-2 text-sm text-stone-500">
                {selectedItems.length} selected item{selectedItems.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!selectedItems.length || !printTagLogoUrl}
              className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Print / Save PDF
            </button>
          </div>

          {isLoading ? (
            <PrintStatus message="Loading print tags..." />
          ) : error ? (
            <PrintStatus message={error} tone="error" />
          ) : order?.status !== 'CONFIRMED' ? (
            <PrintStatus message="Print tags are available only for confirmed bookings." tone="error" />
          ) : !settings?.enablePrintTag ? (
            <PrintStatus message="Print Tag is disabled in settings." tone="error" />
          ) : !printTagLogoUrl ? (
            <PrintStatus message="Upload a Print Tag logo in settings before printing tags." tone="error" />
          ) : selectedItems.length === 0 ? (
            <PrintStatus message="No selected menu items were found for this print request." tone="error" />
          ) : (
            <div className="space-y-6 print:space-y-0">
              {pages.map((pageItems, pageIndex) => (
                <section
                  key={pageIndex}
                  className="print-tag-page mx-auto grid h-[285mm] w-[200mm] grid-rows-3 bg-white shadow-sm"
                >
                  {pageItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col items-center justify-center px-10 text-center"
                    >
                      <img
                        src={printTagLogoUrl}
                        alt=""
                        className="mb-6 max-h-24 max-w-[240px] object-contain"
                      />
                      <p
                        className="font-bold"
                        style={{
                          color: '#7a0b0b',
                          fontFamily: 'Calibri, Arial, sans-serif',
                          fontSize: 26,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.itemName.toLocaleUpperCase('en-IN')}
                      </p>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </BookingsRoute>
  );
}

function PrintStatus({
  message,
  tone = 'default',
}: {
  message: string;
  tone?: 'default' | 'error';
}) {
  return (
    <div
      className={`rounded-[28px] bg-white p-10 text-center shadow-sm ${
        tone === 'error' ? 'text-red-600' : 'text-stone-500'
      }`}
    >
      {message}
    </div>
  );
}

function buildPrintTagItems(order: Order): PrintTagItem[] {
  return order.menuSelectionSnapshot.flatMap((menu, menuIndex) =>
    menu.sections.flatMap((section, sectionIndex) =>
      section.items.map((itemName, itemIndex) => ({
        id: `${menuIndex}:${sectionIndex}:${itemIndex}`,
        itemName,
      })),
    ),
  );
}

function chunkItems(items: PrintTagItem[], size: number) {
  const chunks: PrintTagItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function formatTitleDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function sanitizeDocumentTitle(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}
