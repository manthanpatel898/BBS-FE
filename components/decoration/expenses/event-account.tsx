"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { canAccessEventExpenses } from '@/lib/auth/event-expenses-addon';
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { fetchEventAccount } from "@/lib/decoration/expenses/api";
import { EventAccount, money } from "@/lib/decoration/expenses/domain";
import { createExcelBlobFromTable } from "@/lib/excel";
import { ExpenseEventPicker } from "./event-picker";
import {
  ExpenseTable,
  financialDate,
  paymentMode,
  saveExpenseBlob,
} from "./shared";
export function DecorationEventAccount() {
  const { accessToken, user } = useAuth(),
    params = useSearchParams();
  const allowed = canAccessEventExpenses(user) && (
    user?.role === "company_admin" ||
    hasPermission(user, PERMISSIONS.DECORATION_ACCOUNTS_VIEW));
  const canExport =
    user?.role === "company_admin" ||
    hasPermission(user, PERMISSIONS.DECORATION_REPORTS_EXPORT);
  const [id, setId] = useState(params.get("event") ?? ""),
    [account, setAccount] = useState<EventAccount | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    setId(params.get("event") ?? "");
  }, [params]);
  useEffect(() => {
    let cancelled = false;
    setAccount(null);
    setError("");
    setLoading(false);
    if (!accessToken || !allowed || !id) return;
    setLoading(true);
    void fetchEventAccount(accessToken, id)
      .then((result) => {
        if (!cancelled) setAccount(result);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load account statement.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, allowed, id, reload]);
  async function download() {
    if (!accessToken || !id) return;
    setExporting(true);
    setError("");
    try {
      const data = await fetchEventAccount(accessToken, id, true);
      const rows: Array<Array<string | number | null>> = [
        ...data.payments.map((payment) => [
          String(payment.date).slice(0, 10),
          "Customer payment",
          "",
          null,
          null,
          payment.amount,
          null,
          payment.mode,
          payment.remark,
          payment.recordedBy,
        ]),
        ...data.expenses.map((expense) => [
          expense.paidDate,
          "Paid expense",
          expense.typeName,
          expense.kind === "PERCENTAGE" ? expense.value : null,
          expense.baseAmount,
          null,
          expense.amount,
          expense.mode,
          expense.remark,
          expense.recordedBy,
        ]),
      ];
      rows.sort((left, right) =>
        String(left[0]).localeCompare(String(right[0])),
      );
      saveExpenseBlob(
        await createExcelBlobFromTable(
          "Event account",
          [
            "Date",
            "Activity",
            "Expense type",
            "Percentage",
            "Recorded price basis",
            "Customer payment",
            "Paid expense",
            "Payment mode",
            "Remark",
            "Recorded by",
          ],
          rows,
          {
            headerInfo: {
              reportName: `Event Account · ${data.event.bookingNumber} · ${data.event.customerName}`,
              dateRange: `${data.event.functionName} · ${String(data.event.eventDate).slice(0, 10)} · ${data.event.venueName} · ${data.event.status}`,
            },
            footerSections: [
              {
                title: "Event account summary",
                rows: [
                  {
                    label: "Finalized event price",
                    value: data.totals.finalizedPrice ?? "Not finalized",
                  },
                  {
                    label: "Customer payments received",
                    value: data.totals.received,
                  },
                  {
                    label: "Customer balance pending",
                    value: data.totals.outstanding ?? "Not finalized",
                  },
                  {
                    label: "Total paid expenses",
                    value: data.totals.totalExpenses,
                  },
                  {
                    label: "Event margin (price less recorded expenses)",
                    value: data.totals.margin ?? "Not finalized",
                  },
                  {
                    label: "Received minus paid expenses",
                    value: data.totals.receivedLessExpenses,
                  },
                ],
              },
            ],
          },
        ),
        `event-account-${data.event.bookingNumber}.xlsx`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to export account statement.",
      );
    } finally {
      setExporting(false);
    }
  }
  if (!canAccessEventExpenses(user)) return <p>Event Expenses &amp; Accounts add-on is not enabled for your company.</p>;
  if (!allowed)
    return <p>You do not have permission to view event account statements.</p>;
  const totals = account?.totals;
  const collectedNote =
    totals && totals.finalizedPrice && totals.finalizedPrice > 0
      ? `${Math.round((totals.received / totals.finalizedPrice) * 100)}% collected`
      : "Customer collections";
  const metrics = totals
    ? [
        {
          label: "Finalized event price",
          amount: totals.finalizedPrice,
          note: "Agreed package amount",
        },
        {
          label: "Customer payments received",
          amount: totals.received,
          note: collectedNote,
          tone: "finance-positive",
        },
        {
          label: "Customer balance pending",
          amount: totals.outstanding,
          note: "To collect from customer",
          tone: "finance-pending",
        },
        {
          label: "Total paid expenses",
          amount: totals.totalExpenses,
          note: `${account?.expenses.length ?? 0} paid entries`,
          tone: "finance-negative",
        },
        {
          label: "Event margin",
          amount: totals.margin,
          note: "Price less recorded expenses",
          tone:
            totals.margin !== null && totals.margin < 0
              ? "finance-negative"
              : "",
        },
        {
          label: "Received minus expenses",
          amount: totals.receivedLessExpenses,
          note: "Collections less paid spending",
          featured: true,
        },
      ]
    : [];
  return (
    <div className="event-finance finance-account">
      <Link href="/decoration/reports/" className="finance-back">
        ← All reports
      </Link>
      <header className="finance-page-heading">
        <p className="finance-eyebrow">Event finances</p>
        <h1>Event Account Statement</h1>
        <p>A clear view of collections, spending and your event balance.</p>
      </header>
      <section
        className="finance-panel"
        aria-label="Event selection and details"
      >
        <div className="finance-selector">
          {accessToken && (
            <ExpenseEventPicker
              token={accessToken}
              value={id}
              onChange={setId}
              inline
              selectedLabel={
                account
                  ? `${account.event.functionName} · ${account.event.customerName} · ${financialDate(account.event.eventDate)}`
                  : undefined
              }
            />
          )}
        </div>
        {account && (
          <div className="finance-event-identity">
            <div>
              <div className="finance-event-name">
                <h2>
                  {account.event.functionName} · {account.event.customerName}
                </h2>
                <span
                  className={`finance-status ${["CONFIRMED", "DECORATION_SELECTED", "DECORATION_SELECTION_PENDING", "IN_PROGRESS", "COMPLETED"].includes(account.event.status) ? "finance-status-confirmed" : ""}`}
                >
                  {account.event.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </div>
              <p className="finance-event-meta">
                {financialDate(account.event.eventDate)} ·{" "}
                {account.event.venueName}
              </p>
              <p className="finance-event-reference">
                Booking {account.event.bookingNumber}
              </p>
            </div>
            {canExport && (
              <button
                type="button"
                disabled={exporting}
                onClick={() => void download()}
                className="finance-button finance-button-primary"
              >
                <span aria-hidden="true">↓</span>
                {exporting ? "Exporting…" : "Export Excel"}
              </button>
            )}
          </div>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}{" "}
          <button
            onClick={() => setReload(reload + 1)}
            className="finance-button"
          >
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="finance-empty">
          Loading event account…
        </p>
      ) : !id ? (
        <p className="finance-empty">
          Select an event to view its account statement.
        </p>
      ) : (
        account && (
          <>
            <dl className="finance-metrics" aria-label="Event account totals">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`finance-metric ${metric.featured ? "finance-metric-featured" : ""}`}
                >
                  <dt className="finance-metric-label">{metric.label}</dt>
                  <dd className={`finance-metric-value ${metric.tone ?? ""}`}>
                    {money(metric.amount)}
                  </dd>
                  <dd className="finance-metric-note">{metric.note}</dd>
                </div>
              ))}
            </dl>
            <div className="finance-ledgers">
              <section
                className="finance-panel"
                aria-labelledby="customer-payment-history"
              >
                <div className="finance-ledger-heading">
                  <h2 id="customer-payment-history">
                    Customer Payment History{" "}
                    <span className="finance-count">
                      {account.payments.length}
                    </span>
                  </h2>
                  <span className="finance-ledger-total finance-positive">
                    {money(account.totals.received)}
                  </span>
                </div>
                {!account.payments.length ? (
                  <p className="finance-empty">
                    No customer payments recorded.
                  </p>
                ) : (
                  <ul
                    aria-label="Customer payments"
                    className="finance-ledger-list"
                  >
                    {account.payments.map((payment) => (
                      <li key={payment.id} className="finance-ledger-row">
                        <div className="finance-row-title">
                          Customer payment
                        </div>
                        <div className="finance-row-amount finance-positive">
                          {money(payment.amount)}
                        </div>
                        <div className="finance-row-details">
                          <div>
                            {financialDate(String(payment.date))} · Recorded by{" "}
                            {payment.recordedBy}
                          </div>
                          {payment.remark && (
                            <p className="finance-row-remark">
                              {payment.remark}
                            </p>
                          )}
                        </div>
                        <div className="finance-row-actions">
                          <span className="finance-mode">
                            {paymentMode(payment.mode)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="finance-ledger-footer">
                  <span>Customer balance pending</span>
                  <strong className="finance-pending">
                    {money(account.totals.outstanding)}
                  </strong>
                </div>
              </section>
              <section
                className="finance-panel"
                aria-labelledby="paid-expense-history"
              >
                <div className="finance-ledger-heading">
                  <h2 id="paid-expense-history">
                    Paid Expense History{" "}
                    <span className="finance-count">
                      {account.expenses.length}
                    </span>
                  </h2>
                  <span className="finance-ledger-total finance-negative">
                    {money(account.totals.totalExpenses)}
                  </span>
                </div>
                <ExpenseTable rows={account.expenses} />
                <div className="finance-ledger-footer">
                  <span>All recorded expenses are paid</span>
                  <strong className="finance-negative">
                    {money(account.totals.totalExpenses)}
                  </strong>
                </div>
              </section>
            </div>
            <p className="finance-explanation">
              <strong>About these totals.</strong> Event margin uses recorded
              expenses only. Received minus expenses is collections less paid
              spending; the customer’s outstanding balance remains separate.
            </p>
          </>
        )
      )}
    </div>
  );
}
