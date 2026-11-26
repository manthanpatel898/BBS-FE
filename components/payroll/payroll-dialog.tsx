"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { BodyPortal } from "@/components/ui/body-portal";
import {
  EXPENSE_MODES,
  indiaToday,
  money,
} from "@/lib/decoration/expenses/domain";
import {
  financialDate,
  paymentMode,
} from "@/components/decoration/expenses/shared";
import {
  addStaffLeave,
  addStaffOvertime,
  createPayrollStaff,
  payStaffSalary,
  updatePayrollStaff,
} from "@/lib/payroll/api";
import {
  PayrollRow,
  leaveEndDate,
  overtimePreview,
} from "@/lib/payroll/domain";
export type PayrollAction = "staff" | "edit" | "overtime" | "leave" | "pay";
export function PayrollDialog({
  action,
  row,
  month,
  token,
  onClose,
  onSaved,
}: {
  action: PayrollAction;
  row?: PayrollRow;
  month: string;
  token: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(row?.staff.name ?? ""),
    [role, setRole] = useState(row?.staff.role ?? ""),
    [phone, setPhone] = useState(row?.staff.phone ?? ""),
    [salary, setSalary] = useState(
      String(
        row
          ? row.baseSalary > 0
            ? row.baseSalary
            : row.staff.monthlySalary
          : "",
      ),
    ),
    [rate, setRate] = useState(String(row?.staff.overtimeHourlyRate ?? 0)),
    [effectiveMonth, setEffectiveMonth] = useState(month),
    [active, setActive] = useState(row?.staff.isActive ?? true);
  const [date, setDate] = useState(() =>
      action === "pay" || month === indiaToday().slice(0, 7)
        ? indiaToday()
        : `${month}-01`,
    ),
    [mode, setMode] = useState<"AMOUNT" | "HOURS">("AMOUNT"),
    [amount, setAmount] = useState(""),
    [hours, setHours] = useState(""),
    [days, setDays] = useState("1"),
    [remark, setRemark] = useState(""),
    [payment, setPayment] = useState("CASH"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const panel = useRef<HTMLElement>(null),
    busy = useRef(false),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLElement>("form input,form select,form button")
      ?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy.current) {
        event.preventDefault();
        close.current();
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ) ?? [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  const title = {
    staff: "Add staff",
    edit: "Edit staff",
    overtime: "Add overtime",
    leave: "Add leave",
    pay: "Mark salary paid",
  }[action];
  const preview = overtimePreview(mode, amount, hours, rate),
    endDate = leaveEndDate(date, days);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      if (action === "staff")
        await createPayrollStaff(token, {
          name,
          role,
          phone,
          monthlySalary: Number(salary),
          overtimeHourlyRate: Number(rate),
          startMonth: effectiveMonth,
        });
      if (action === "edit" && row)
        await updatePayrollStaff(token, row.staff.id, {
          name,
          role,
          phone,
          monthlySalary: Number(salary),
          overtimeHourlyRate: Number(rate),
          effectiveMonth,
          isActive: active,
          revision: row.staff.revision,
        });
      if (action === "overtime" && row) {
        if (preview === null) throw new Error("Enter valid overtime details.");
        await addStaffOvertime(token, row.staff.id, {
          date,
          mode,
          ...(mode === "AMOUNT"
            ? { amount: Number(amount) }
            : { hours: Number(hours), rate: Number(rate) }),
          remark,
        });
      }
      if (action === "leave" && row) {
        if (!endDate)
          throw new Error("Enter a valid start date and number of days.");
        await addStaffLeave(token, row.staff.id, {
          startDate: date,
          days: Number(days),
          remark,
        });
      }
      if (action === "pay" && row)
        await payStaffSalary(token, row.staff.id, {
          month,
          paidDate: date,
          mode: payment,
          remark,
          expectedTotal: row.totalPayable,
        });
      onSaved(
        action === "leave"
          ? "Leave recorded. Salary is unchanged."
          : action === "overtime"
            ? "Overtime added."
            : action === "pay"
              ? "Salary payment recorded."
              : "Staff details saved.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save. Please try again.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <BodyPortal>
      <div
        className="payroll-dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-dialog-title"
      >
        <section ref={panel} className="payroll-dialog event-finance">
          <header>
            <div>
              <p className="finance-eyebrow">Staff payroll</p>
              <h2 id="payroll-dialog-title">{title}</h2>
              {row && (
                <p className="payroll-dialog-staff">
                  {row.staff.name} · {month}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close payroll dialog"
              disabled={saving}
              onClick={onClose}
              className="payroll-close"
            >
              ×
            </button>
          </header>
          <form
            id="payroll-action-form"
            onSubmit={submit}
            className="payroll-dialog-body"
          >
            {error && (
              <p role="alert" className="payroll-error">
                {error}
              </p>
            )}
            {(action === "staff" || action === "edit") && (
              <>
                <label>
                  Staff name
                  <input
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="finance-field"
                  />
                </label>
                <div className="payroll-form-grid">
                  <label>
                    Role
                    <input
                      maxLength={100}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="finance-field"
                      placeholder="e.g. Setup team"
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      maxLength={30}
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                  <label>
                    Monthly salary (₹)
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                  <label>
                    Overtime rate / hour (₹)
                    <input
                      required
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                </div>
                <label>
                  {action === "staff"
                    ? "Salary starts from"
                    : "Salary effective from"}
                  <input
                    required
                    type="month"
                    value={effectiveMonth}
                    onChange={(e) => setEffectiveMonth(e.target.value)}
                    className="finance-field"
                  />
                </label>
                <p className="payroll-help">
                  Fixed monthly salary. Set the overtime rate to 0 if you enter
                  overtime amounts manually. Paid salary records stay unchanged.
                </p>
                {action === "edit" && (
                  <label className="payroll-check">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    Active staff member
                  </label>
                )}
              </>
            )}
            {action === "overtime" && (
              <>
                <label>
                  Overtime date
                  <input
                    required
                    type="date"
                    max={indiaToday()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="finance-field"
                  />
                </label>
                <fieldset>
                  <legend>Enter overtime as</legend>
                  <div className="payroll-mode">
                    <button
                      type="button"
                      aria-pressed={mode === "AMOUNT"}
                      onClick={() => setMode("AMOUNT")}
                    >
                      Extra amount (₹)
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === "HOURS"}
                      onClick={() => setMode("HOURS")}
                    >
                      Hours × rate
                    </button>
                  </div>
                </fieldset>
                {mode === "AMOUNT" ? (
                  <label>
                    Extra amount (₹)
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                ) : (
                  <div className="payroll-form-grid">
                    <label>
                      Overtime hours
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="24"
                        step="0.01"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="finance-field"
                      />
                    </label>
                    <label>
                      Rate per hour (₹)
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="1000000000"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="finance-field"
                      />
                    </label>
                  </div>
                )}
                <div className="payroll-calculation" aria-live="polite">
                  <span>Overtime pay</span>
                  <strong>
                    {preview === null ? "Enter amount" : money(preview)}
                  </strong>
                </div>
              </>
            )}
            {action === "leave" && (
              <>
                <div className="payroll-form-grid">
                  <label>
                    Leave starts
                    <input
                      required
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                  <label>
                    Number of days
                    <input
                      required
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                </div>
                <div className="payroll-calculation">
                  <span>
                    {endDate
                      ? `${financialDate(date)} – ${financialDate(endDate)}`
                      : "Choose leave dates"}
                  </span>
                  <strong>
                    {days || 0} day{days === "1" ? "" : "s"}
                  </strong>
                </div>
                <p className="payroll-notice">
                  For record only. Leave does not reduce salary.
                </p>
              </>
            )}
            {action === "pay" && row && (
              <>
                <div className="payroll-pay-breakdown">
                  <div>
                    <span>Monthly salary</span>
                    <strong>{money(row.baseSalary)}</strong>
                  </div>
                  <div>
                    <span>Overtime pay</span>
                    <strong>{money(row.overtimeTotal)}</strong>
                  </div>
                  <div>
                    <span>Total to record as paid</span>
                    <strong>{money(row.totalPayable)}</strong>
                  </div>
                </div>
                <p className="payroll-help">
                  Confirm you have paid this amount. This records the payment;
                  it does not transfer money.
                </p>
                <div className="payroll-form-grid">
                  <label>
                    Payment date
                    <input
                      required
                      type="date"
                      max={indiaToday()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="finance-field"
                    />
                  </label>
                  <label>
                    Payment mode
                    <select
                      value={payment}
                      onChange={(e) => setPayment(e.target.value)}
                      className="finance-field"
                    >
                      {EXPENSE_MODES.map((value) => (
                        <option key={value} value={value}>
                          {paymentMode(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {action !== "staff" && action !== "edit" && (
              <label>
                Remark (optional)
                <textarea
                  maxLength={500}
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="finance-field"
                />
              </label>
            )}
          </form>
          <footer>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="finance-button"
            >
              Cancel
            </button>
            <button
              form="payroll-action-form"
              disabled={saving}
              className="finance-button finance-button-primary"
            >
              {saving
                ? "Saving…"
                : action === "pay"
                  ? "Confirm paid"
                  : action === "leave"
                    ? "Save leave"
                    : action === "overtime"
                      ? "Save overtime"
                      : "Save staff"}
            </button>
          </footer>
        </section>
      </div>
    </BodyPortal>
  );
}
