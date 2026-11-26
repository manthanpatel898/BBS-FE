import { PaidExpense, money } from "@/lib/decoration/expenses/domain";

export const expenseInputClass = "finance-field";
export function financialDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
export function paymentMode(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Upi", "UPI");
}
export function ExpenseTable({
  rows,
  onEdit,
  showEvent = false,
}: {
  rows: PaidExpense[];
  onEdit?: (entry: PaidExpense) => void;
  showEvent?: boolean;
}) {
  if (!rows.length)
    return (
      <p className="finance-empty">
        No paid expenses recorded for this selection.
      </p>
    );
  return (
    <ul aria-label="Paid expenses" className="finance-ledger-list">
      {rows.map((row) => (
        <li key={row.id} className="finance-ledger-row">
          <div className="finance-row-title">{row.typeName}</div>
          <div className="finance-row-amount finance-negative">
            {money(row.amount)}
          </div>
          <div className="finance-row-details">
            {showEvent && (
              <div>
                {row.event?.bookingNumber ?? "Event unavailable"}
                {row.event?.functionName ? ` · ${row.event.functionName}` : ""}
              </div>
            )}
            {row.kind === "PERCENTAGE" && (
              <div>
                {row.value}% × {money(row.baseAmount)}
              </div>
            )}
            <div>
              {financialDate(row.paidDate)} · Recorded by {row.recordedBy}
            </div>
            {row.remark && <p className="finance-row-remark">{row.remark}</p>}
            {row.revision > 0 && <div>Edited by {row.updatedBy}</div>}
          </div>
          <div className="finance-row-actions">
            <span className="finance-mode">{paymentMode(row.mode)}</span>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="finance-edit"
                aria-label={`Edit ${row.typeName}`}
              >
                Edit
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
export function saveExpenseBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
