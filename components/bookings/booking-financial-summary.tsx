import React from 'react';
type FinancialOrder = {
  grandTotal: number;
  advanceAmount: number;
  pendingAmount: number;
  baseTotal: number;
  additionalCategoryTotal: number;
  extrasTotal: number;
  addonServiceSnapshots?: Array<{ price: number }>;
  discountAmount: number;
  originalBillAmount?: number;
  settlementDiscountAmount?: number;
  excessPaidAmount?: number;
};
type Currency = (amount: number) => string;
export function pendingAfterPaymentDeletion(
  finalBill: number,
  received: number,
  deleted: number,
) {
  return Math.max(Math.round((finalBill - received + deleted) * 100) / 100, 0);
}
export function BookingFinancialSummary({
  order,
  formatCurrency,
}: {
  order: FinancialOrder;
  formatCurrency: Currency;
}) {
  const excess =
    order.excessPaidAmount ??
    Math.max(order.advanceAmount - order.grandTotal, 0);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Financial Summary
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ['Final Bill', order.grandTotal],
          ['Total Received', order.advanceAmount],
          ['Pending', order.pendingAmount],
        ].map(([label, amount]) => (
          <div
            key={label}
            className={`rounded-xl p-3 ${label === 'Final Bill' ? 'col-span-2 sm:col-span-1' : ''} ${label === 'Pending' && !order.pendingAmount ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-900'}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </p>
            <p className="mt-1 whitespace-nowrap text-base font-bold sm:text-xl">
              {formatCurrency(Number(amount))}
            </p>
            {label === 'Pending' && !order.pendingAmount ? (
              <p className="mt-1 text-xs font-semibold">Fully Paid</p>
            ) : null}
          </div>
        ))}
      </div>
      {excess > 0 ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">
          Excess paid: {formatCurrency(excess)}
        </p>
      ) : null}
      <details className="mt-4 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Bill breakdown
        </summary>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            ['Primary package', order.baseTotal],
            ['Additional packages', order.additionalCategoryTotal],
            [
              'Addon services',
              Math.round(
                (order.addonServiceSnapshots ?? []).reduce(
                  (sum, addon) => sum + addon.price,
                  0,
                ) * 100,
              ) / 100,
            ],
            ['Additional services', order.extrasTotal],
            ['Booking discount', order.discountAmount],
            [
              'Original bill',
              order.originalBillAmount ??
                order.grandTotal + (order.settlementDiscountAmount ?? 0),
            ],
            [
              'Cumulative settlement discount',
              order.settlementDiscountAmount ?? 0,
            ],
          ].map(([label, amount]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-600">{label}</dt>
              <dd className="font-semibold">
                {Number(amount) > 0 &&
                (label === 'Booking discount' ||
                  label === 'Cumulative settlement discount')
                  ? `−${formatCurrency(Number(amount))}`
                  : formatCurrency(Number(amount))}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
type Entry = {
  amount: number;
  reason: string;
  recordedAt: string;
  recordedByName: string;
};
export function SettlementHistory({
  entries,
  total,
  pending,
  canAdd,
  onAdd,
  formatCurrency,
}: {
  entries: Entry[];
  total: number;
  pending: number;
  canAdd: boolean;
  onAdd: () => void;
  formatCurrency: Currency;
}) {
  if (!entries.length && !canAdd) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">Settlement History</h3>
          <p className="mt-1 text-sm text-slate-600">
            Cumulative settlement discount:{' '}
            <span className="font-semibold text-slate-900">
              {formatCurrency(total)}
            </span>
          </p>
        </div>
        {canAdd ? (
          <div>
            <button
              type="button"
              onClick={onAdd}
              disabled={pending <= 0}
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Settlement Discount
            </button>
            {pending <= 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                No pending balance available to discount
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {entries.length ? (
        entries.map((entry, index) => (
          <div
            key={`${entry.recordedAt}-${index}`}
            className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-900"
          >
            <p className="font-semibold">
              {formatCurrency(entry.amount)} · {entry.recordedByName} ·{' '}
              <time dateTime={entry.recordedAt}>
                {new Date(entry.recordedAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })}
              </time>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {entry.reason}
            </p>
          </div>
        ))
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No settlement discounts recorded yet.
        </p>
      )}
    </section>
  );
}
