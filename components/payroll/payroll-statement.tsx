"use client";
import { useEffect, useState } from "react";
import { CommonModal } from "@/components/ui/common-modal";
import { BodyPortal } from "@/components/ui/body-portal";
import {
  financialDate,
  paymentMode,
} from "@/components/decoration/expenses/shared";
import { money } from "@/lib/decoration/expenses/domain";
import { deletePayrollEntry, fetchPayrollStatement } from "@/lib/payroll/api";
import { PayrollStatement } from "@/lib/payroll/domain";
export function StaffPayrollStatement({
  token,
  id,
  month,
  canManage,
  onClose,
  onChanged,
}: {
  token: string;
  id: string;
  month: string;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<PayrollStatement | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [removing, setRemoving] = useState(""),
    [confirm, setConfirm] = useState<{
      kind: "overtime" | "leaves";
      id: string;
    } | null>(null);
  useEffect(() => {
    let current = true;
    setData(null);
    setError("");
    void fetchPayrollStatement(token, id, month)
      .then((value) => {
        if (current) setData(value);
      })
      .catch((reason) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load statement.",
          );
      });
    return () => {
      current = false;
    };
  }, [token, id, month, reload]);
  async function remove() {
    if (!confirm) return;
    setRemoving(confirm.id);
    setError("");
    try {
      await deletePayrollEntry(token, confirm.kind, confirm.id);
      setConfirm(null);
      setReload((value) => value + 1);
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to remove entry.",
      );
    } finally {
      setRemoving("");
    }
  }
  return (
    <BodyPortal>
      <div role="dialog" aria-modal="true" aria-label="Staff salary statement">
        <CommonModal
          title={data?.row.staff.name ?? "Staff statement"}
          description={`${month} · Salary, overtime and leave history`}
          onClose={onClose}
          zIndexClassName="z-[80]"
          widthClassName="max-w-2xl"
          mobileFullScreen
        >
          <div className="event-finance payroll-statement">
            {error && (
              <p role="alert" className="payroll-error">
                {error}
                <button
                  className="finance-button"
                  onClick={() => setReload((value) => value + 1)}
                >
                  Retry
                </button>
              </p>
            )}
            {!data && !error ? (
              <p role="status">Loading staff statement…</p>
            ) : (
              data && (
                <>
                  <div className="payroll-calculation">
                    <span>
                      {data.row.status === "PAID"
                        ? "Recorded salary paid"
                        : "Salary payable"}
                    </span>
                    <strong>{money(data.row.totalPayable)}</strong>
                  </div>
                  <p className="payroll-help">
                    Base {money(data.row.baseSalary)} + overtime{" "}
                    {money(data.row.overtimeTotal)} · {data.row.leaveDays} leave
                    days (record only)
                  </p>
                  <p className="payroll-help">
                    Salary starts{" "}
                    {financialDate(
                      data.row.staff.startDate ??
                        `${data.row.staff.startMonth}-01`,
                    )}
                    {data.row.proration?.isProrated
                      ? ` · ${money(data.row.proration.monthlySalary)} × ${data.row.proration.payableDays}/${data.row.proration.daysInMonth} days`
                      : ""}
                  </p>
                  {data.payment && (
                    <p className="payroll-notice">
                      Paid on {financialDate(data.payment.paidDate)} ·{" "}
                      {paymentMode(data.payment.mode)}
                      {data.payment.remark ? ` · ${data.payment.remark}` : ""}
                    </p>
                  )}
                  <h3>
                    Overtime history{" "}
                    <span className="finance-count">
                      {data.overtime.length}
                    </span>
                  </h3>
                  {!data.overtime.length ? (
                    <p className="payroll-help">
                      No overtime recorded this month.
                    </p>
                  ) : (
                    <ul className="finance-ledger-list">
                      {data.overtime.map((entry) => (
                        <li key={entry.id} className="finance-ledger-row">
                          <div className="finance-row-title">
                            {financialDate(entry.date)}
                          </div>
                          <strong className="finance-row-amount finance-positive">
                            {money(entry.amount)}
                          </strong>
                          <div className="finance-row-details">
                            {entry.mode === "HOURS"
                              ? `${entry.hours} hours × ${money(entry.rate ?? 0)}`
                              : "Manual overtime amount"}
                            {entry.remark && <p>{entry.remark}</p>}
                            {entry.recordedBy && (
                              <p>Recorded by {entry.recordedBy}</p>
                            )}
                          </div>
                          {canManage && data.row.status !== "PAID" && (
                            <button
                              className="finance-edit"
                              onClick={() =>
                                setConfirm({ kind: "overtime", id: entry.id })
                              }
                            >
                              Remove overtime
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <h3>
                    Leave history{" "}
                    <span className="finance-count">{data.leaves.length}</span>
                  </h3>
                  {!data.leaves.length ? (
                    <p className="payroll-help">
                      No leave recorded this month.
                    </p>
                  ) : (
                    <ul className="finance-ledger-list">
                      {data.leaves.map((entry) => (
                        <li key={entry.id} className="finance-ledger-row">
                          <div className="finance-row-title">
                            {financialDate(entry.startDate)}
                          </div>
                          <strong className="finance-row-amount">
                            {entry.days} day{entry.days === 1 ? "" : "s"}
                          </strong>
                          <div className="finance-row-details">
                            Record only · No salary deduction
                            {entry.remark && <p>{entry.remark}</p>}
                          </div>
                          {canManage && (
                            <button
                              className="finance-edit"
                              onClick={() =>
                                setConfirm({ kind: "leaves", id: entry.id })
                              }
                            >
                              Remove leave
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {confirm && (
                    <div className="payroll-confirm" role="alert">
                      <p>
                        Remove this{" "}
                        {confirm.kind === "leaves" ? "leave" : "overtime"}{" "}
                        entry? The change will be recorded in audit history.
                      </p>
                      <div>
                        <button
                          disabled={Boolean(removing)}
                          onClick={() => setConfirm(null)}
                          className="finance-button"
                        >
                          Keep entry
                        </button>
                        <button
                          disabled={Boolean(removing)}
                          onClick={() => void remove()}
                          className="finance-button"
                        >
                          {removing ? "Removing…" : "Confirm removal"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </CommonModal>
      </div>
    </BodyPortal>
  );
}
