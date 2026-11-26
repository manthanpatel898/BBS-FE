export type ExpenseKind = 'RUPEES' | 'PERCENTAGE';
export const EXPENSE_MODES = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'] as const;
export type ExpenseType = { id: string; name: string; kind: ExpenseKind; isActive: boolean };
export type PaidExpense = {
  id: string; bookingId: string; typeId: string; typeName: string; kind: ExpenseKind;
  value: number; baseAmount: number | null; amount: number; paidDate: string;
  mode: string; remark: string; recordedBy: string; updatedBy: string; revision: number;
  event?: { bookingNumber: string; functionName: string; startDate: string; customer: { name: string } };
};
export type ExpenseInput = Pick<PaidExpense, 'typeId' | 'value' | 'paidDate' | 'mode' | 'remark'>;
export type EventOption = { id: string; bookingNumber: string; functionName: string; customer: { name: string }; startDate: string; packageRate: number; isPackagePriceFinalized: boolean };
export type ExpenseFilters = { dateFrom: string; dateTo: string; bookingId: string; typeId: string; mode: string; page: number };
export type ExpenseReport = {
  items: PaidExpense[]; total: number; count: number; page: number; totalPages: number;
  daily: Array<{ _id: string; total: number; count: number }>;
  byEvent: Array<{ _id: string; total: number; count: number; event?: { bookingNumber: string; functionName: string } }>;
};
export type EventAccount = {
  event: { id: string; bookingNumber: string; functionName: string; customerName: string; eventDate: string; status: string; venueName: string };
  totals: { finalizedPrice: number | null; received: number; outstanding: number | null; totalExpenses: number; margin: number | null; receivedLessExpenses: number };
  payments: Array<{ id: string; amount: number; date: string; mode: string; remark: string | null; recordedBy: string }>;
  expenses: PaidExpense[];
};
export const money = (value: number | null) => value === null ? 'Not finalized' : `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const indiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function previewExpense(kind: ExpenseKind, input: string, price: number, finalized: boolean, savedBasis?: number | null) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000 || !/^\d+(\.\d{1,2})?$/.test(input)) return null;
  if (kind === 'RUPEES') return value;
  const basis = savedBasis ?? (finalized ? price : null);
  return value <= 100 && basis !== null && basis > 0 ? Math.round((basis * value / 100 + Number.EPSILON) * 100) / 100 : null;
}
export function reportQuery(filters: ExpenseFilters, exporting = false) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== '') query.set(key, String(value)); });
  if (exporting) query.set('export', 'true');
  return query;
}
