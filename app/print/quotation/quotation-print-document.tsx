import { PrintDocument, type CopyType } from '@/app/print/order/print-order-view';
import type { AppSettings, Order, Restaurant } from '@/lib/auth/types';
import type { BanquetQuotation } from '@/lib/quotations/types';

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN');
}

function moneyPaise(value: unknown) {
  const amount = typeof value === 'number' ? value / 100 : 0;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function QuotationPrintDocument({
  order,
  quotation,
  restaurant,
  settings,
  copyType,
}: {
  order: Order;
  quotation: BanquetQuotation;
  restaurant: Restaurant | null;
  settings: AppSettings | null;
  copyType: CopyType;
}) {
  const isKitchenCopy = copyType === 'kitchen';

  return (
    <PrintDocument
      order={order}
      restaurant={restaurant}
      settings={settings}
      copyType={copyType}
      documentTitle={isKitchenCopy ? 'Quotation Kitchen Print' : 'Quotation'}
      beforeContent={
        <section
          className={`break-inside-avoid overflow-hidden rounded-[10px] border border-stone-400 ${
            isKitchenCopy ? 'mt-2' : 'mt-3 print:mt-2'
          }`}
        >
          <div className="border-b border-stone-400 bg-stone-100 px-3 py-1.5">
            <p className="text-[12px] font-black uppercase text-stone-950">
              Quotation Details
            </p>
          </div>
          <div className={`grid divide-stone-400 ${isKitchenCopy ? 'grid-cols-2 divide-x' : 'grid-cols-4 divide-x'}`}>
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-700">
                Quotation No.
              </p>
              <p className="mt-0.5 text-[12px] font-black text-stone-950">
                {quotation.quotationNumber} / V{quotation.version}
              </p>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-700">
                Status
              </p>
              <p className="mt-0.5 text-[12px] font-black text-stone-950">
                {quotation.status}
              </p>
            </div>
            {!isKitchenCopy ? (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-stone-700">
                    Valid Until
                  </p>
                  <p className="mt-0.5 text-[12px] font-black text-stone-950">
                    {formatDate(quotation.validUntil)}
                  </p>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-stone-700">
                    Grand Total
                  </p>
                  <p className="mt-0.5 text-[12px] font-black text-stone-950">
                    {moneyPaise(quotation.totals.grandTotalPaise)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          {!isKitchenCopy ? (
            <div className="border-t border-stone-400 px-3 py-2 text-[12px] font-bold leading-snug text-stone-950">
              <p>Terms: {quotation.terms || settings?.inquiryQuotationSettings?.terms || 'N/A'}</p>
              <p>Payment: {quotation.paymentTerms || settings?.inquiryQuotationSettings?.paymentTerms || 'N/A'}</p>
              <p>Cancellation: {quotation.cancellationPolicy || settings?.inquiryQuotationSettings?.cancellationPolicy || 'N/A'}</p>
              <p>{quotation.footer || settings?.inquiryQuotationSettings?.footer || 'This is a quotation and not a tax invoice.'}</p>
            </div>
          ) : null}
        </section>
      }
    />
  );
}
