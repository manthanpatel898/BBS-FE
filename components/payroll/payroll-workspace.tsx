"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { indiaToday, money } from "@/lib/decoration/expenses/domain";
import { createExcelBlobFromTable } from "@/lib/excel";
import { saveExpenseBlob } from "@/components/decoration/expenses/shared";
import { exportPayroll, fetchPayroll } from "@/lib/payroll/api";
import {
  PayrollResponse,
  PayrollRow,
  payrollAvailable,
} from "@/lib/payroll/domain";
import { PayrollAction, PayrollDialog } from "./payroll-dialog";
import { StaffPayrollStatement } from "./payroll-statement";
export function StaffPayrollWorkspace() {
  const { accessToken, user } = useAuth();
  const enabled = payrollAvailable(user),
    manage =
      enabled &&
      (user?.role === "company_admin" ||
        hasPermission(user, PERMISSIONS.PAYROLL_MANAGE)),
    view = enabled && (manage || hasPermission(user, PERMISSIONS.PAYROLL_VIEW)),
    canExport =
      enabled &&
      (user?.role === "company_admin" ||
        hasPermission(user, PERMISSIONS.PAYROLL_EXPORT));
  const [month, setMonth] = useState(() => indiaToday().slice(0, 7)),
    [search, setSearch] = useState(""),
    [includeArchived, setIncludeArchived] = useState(false),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [data, setData] = useState<PayrollResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [exporting, setExporting] = useState(false),
    [action, setAction] = useState<{
      kind: PayrollAction;
      row?: PayrollRow;
    } | null>(null),
    [detail, setDetail] = useState<string | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    if (!accessToken || !view) return;
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await fetchPayroll(
        accessToken,
        month,
        page,
        query,
        includeArchived,
      );
      if (current === request.current) setData(result);
    } catch (reason) {
      if (current === request.current)
        setError(
          reason instanceof Error ? reason.message : "Unable to load payroll.",
        );
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [accessToken, view, month, page, query, includeArchived]);
  useEffect(() => {
    void load();
    return () => {
      request.current += 1;
    };
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  async function download() {
    if (!accessToken) return;
    setExporting(true);
    setError("");
    try {
      const all = await exportPayroll(
        accessToken,
        month,
        query,
        includeArchived,
      );
      const blob = await createExcelBlobFromTable(
        "Monthly payroll",
        [
          "Staff",
          "Role",
          "Monthly salary rate",
          "Salary start date",
          "Payable days",
          "Days in month",
          "Salary for this month",
          "Overtime pay",
          "Salary payable",
          "Leave days (record only)",
          "Payment status",
          "Paid date",
          "Payment mode",
        ],
        all.items.map((row) => [
          row.staff.name,
          row.staff.role,
          row.proration?.monthlySalary ?? row.staff.monthlySalary,
          row.staff.startDate ?? `${row.staff.startMonth}-01`,
          row.proration?.payableDays ?? "",
          row.proration?.daysInMonth ?? "",
          row.baseSalary,
          row.overtimeTotal,
          row.totalPayable,
          row.leaveDays,
          row.status,
          row.payment?.paidDate ?? "",
          row.payment?.mode ?? "",
        ]),
        {
          headerInfo: { reportName: "Staff Payroll & Leave", dateRange: month },
          footerSections: [
            {
              title: "Monthly summary",
              rows: [
                {
                  label: "Total salary payable",
                  value: all.summary.totalPayable,
                },
                { label: "Recorded paid", value: all.summary.paid },
                { label: "Pending", value: all.summary.pending },
              ],
            },
          ],
        },
      );
      saveExpenseBlob(blob, `staff-payroll-${month}.xlsx`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to export payroll.",
      );
    } finally {
      setExporting(false);
    }
  }
  if (!enabled)
    return (
      <p>Staff Payroll &amp; Leave add-on is not enabled for your company.</p>
    );
  if (!view) return <p>You do not have permission to view staff payroll.</p>;
  const summary = data?.summary;
  return (
    <div className="event-finance payroll-workspace">
      <header className="payroll-top">
        <div>
          <p className="finance-eyebrow">People &amp; pay</p>
          <h1>Staff Payroll</h1>
          <p className="payroll-subtitle">
            Salary + overtime. Leave is record only.
          </p>
        </div>
        {manage && (
          <button
            className="finance-button finance-button-primary"
            onClick={() => setAction({ kind: "staff" })}
          >
            + Add staff
          </button>
        )}
      </header>
      <section className="payroll-summary" aria-label="Monthly payroll summary">
        {[
          ["Payable", summary?.totalPayable],
          ["Paid", summary?.paid],
          ["Pending", summary?.pending],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p>{label}</p>
            <strong
              className={
                label === "Paid"
                  ? "finance-positive"
                  : label === "Pending"
                    ? "finance-pending"
                    : ""
              }
            >
              {value === undefined ? "—" : money(Number(value))}
            </strong>
          </div>
        ))}
      </section>
      <div className="payroll-toolbar">
        <label className="payroll-month">
          Month
          <input
            aria-label="Payroll month"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setPage(1);
                setData(null);
                setMessage("");
              }
            }}
            className="finance-field"
          />
        </label>
        <label className="payroll-search">
          Find staff
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or role"
            className="finance-field"
          />
        </label>
        <div className="payroll-secondary-tools">
          <label className="payroll-archived">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked);
                setPage(1);
              }}
            />
            Include archived
          </label>
          {canExport && (
            <button
              className="finance-button payroll-export"
              disabled={loading || exporting || !data?.count}
              onClick={() => void download()}
            >
              {exporting ? "Exporting…" : "Export Excel"}
            </button>
          )}
        </div>
      </div>
      {message && (
        <p role="status" className="payroll-notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="payroll-error">
          {error}
          <button className="finance-button" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      <div className="payroll-list-heading">
        <h2>
          Staff <span className="finance-count">{data?.count ?? 0}</span>
        </h2>
        <span>{loading ? "Updating…" : "Monthly salary overview"}</span>
      </div>
      {loading && !data ? (
        <p role="status" className="finance-empty">
          Loading staff payroll…
        </p>
      ) : !data?.items.length ? (
        <section className="payroll-empty">
          <h2>{query ? "No matching staff" : "Add your first staff member"}</h2>
          <p>
            {query
              ? "Try another name or role."
              : "Enter their monthly salary, then use Add leave or Add overtime whenever needed."}
          </p>
          {manage && !query && (
            <button
              className="finance-button finance-button-primary"
              onClick={() => setAction({ kind: "staff" })}
            >
              Add staff
            </button>
          )}
        </section>
      ) : (
        <ul className="payroll-staff-list" aria-label="Staff payroll">
          {data.items.map((row) => (
            <li key={row.staff.id} className="payroll-staff-card">
              <div className="payroll-staff-identity">
                <div className="payroll-avatar" aria-hidden="true">
                  {row.staff.name.trim().slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3>{row.staff.name}</h3>
                  <p>
                    {row.staff.role || "Staff member"}
                    {!row.staff.isActive ? " · Archived" : ""}
                  </p>
                </div>
                <span
                  className={`payroll-status ${row.status === "PAID" ? "is-paid" : ""}`}
                >
                  {row.status === "PAID" ? "Paid" : "Unpaid"}
                </span>
              </div>
              <dl className="payroll-staff-amounts">
                <div>
                  <dt>Salary</dt>
                  <dd>{money(row.baseSalary)}</dd>
                </div>
                <div>
                  <dt>Overtime</dt>
                  <dd className="finance-positive">
                    {money(row.overtimeTotal)}
                  </dd>
                </div>
                <div className="payroll-payable">
                  <dt>Payable</dt>
                  <dd>{money(row.totalPayable)}</dd>
                </div>
              </dl>
              {row.proration?.isProrated && (
                <p className="payroll-help">
                  {money(row.proration.monthlySalary)} ×{" "}
                  {row.proration.payableDays}/{row.proration.daysInMonth} days
                </p>
              )}
              <div className="payroll-staff-actions">
                {manage && (
                  <>
                    <button
                      disabled={loading}
                      className="payroll-quick"
                      onClick={() => setAction({ kind: "leave", row })}
                    >
                      Add leave
                    </button>
                    <button
                      disabled={
                        loading ||
                        row.status === "PAID" ||
                        !row.staff.isActive ||
                        month > indiaToday().slice(0, 7)
                      }
                      className="payroll-quick"
                      onClick={() => setAction({ kind: "overtime", row })}
                    >
                      Add overtime
                    </button>
                  </>
                )}
                <button
                  className="payroll-details"
                  onClick={() => setDetail(row.staff.id)}
                >
                  Details
                </button>
              </div>
              <div className="payroll-staff-footer">
                <span>
                  {row.leaveDays} leave day{row.leaveDays === 1 ? "" : "s"} · No
                  deduction
                </span>
                <div>
                  {manage && (
                    <button
                      disabled={loading}
                      onClick={() => setAction({ kind: "edit", row })}
                      className="payroll-small-button"
                    >
                      Edit staff
                    </button>
                  )}
                  {manage && row.status === "UNPAID" && (
                    <button
                      disabled={
                        loading ||
                        row.totalPayable <= 0 ||
                        month > indiaToday().slice(0, 7)
                      }
                      onClick={() => setAction({ kind: "pay", row })}
                      className="payroll-small-button payroll-pay-button"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && data.totalPages > 1 && (
        <nav className="payroll-pagination" aria-label="Staff pages">
          <button
            className="finance-button"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {data.totalPages}
          </span>
          <button
            className="finance-button"
            disabled={loading || page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
      {action && accessToken && (
        <PayrollDialog
          action={action.kind}
          row={action.row}
          month={month}
          token={accessToken}
          onClose={() => setAction(null)}
          onSaved={(text) => {
            setAction(null);
            setMessage(text);
            void load();
          }}
        />
      )}
      {detail && accessToken && (
        <StaffPayrollStatement
          id={detail}
          token={accessToken}
          month={month}
          canManage={manage}
          onClose={() => setDetail(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
