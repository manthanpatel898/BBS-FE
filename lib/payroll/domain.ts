import type { AuthUser } from "@/lib/auth/types";
export function payrollAvailable(
  user?: Pick<AuthUser, "businessType" | "canAccessStaffPayroll"> | null,
) {
  return (
    user?.businessType === "EVENT_DECORATION" &&
    user.canAccessStaffPayroll === true
  );
}
export type PayrollStaff = {
  id: string;
  name: string;
  role: string;
  phone: string;
  monthlySalary: number;
  overtimeHourlyRate: number;
  startMonth: string;
  isActive: boolean;
  revision: number;
};
export type PayrollPayment = {
  id: string;
  month: string;
  paidDate: string;
  mode: string;
  remark?: string;
  paidBy?: string;
  baseSalary: number;
  overtimeTotal: number;
  totalPayable: number;
};
export type PayrollRow = {
  staff: PayrollStaff;
  baseSalary: number;
  overtimeTotal: number;
  totalPayable: number;
  leaveDays: number;
  status: "UNPAID" | "PAID";
  payment?: PayrollPayment | null;
};
export type OvertimeEntry = {
  id: string;
  staffId: string;
  date: string;
  mode: "AMOUNT" | "HOURS";
  amount: number;
  hours?: number;
  rate?: number;
  remark?: string;
  recordedBy?: string;
};
export type LeaveEntry = {
  id: string;
  staffId: string;
  startDate: string;
  days: number;
  remark?: string;
  recordedBy?: string;
};
export type PayrollStatement = {
  row: PayrollRow;
  overtime: OvertimeEntry[];
  leaves: LeaveEntry[];
  payment?: PayrollPayment | null;
};
export type PayrollSummary = {
  baseSalary: number;
  overtime: number;
  totalPayable: number;
  paid: number;
  pending: number;
  staffCount: number;
};
export type PayrollResponse = {
  items: PayrollRow[];
  page: number;
  totalPages: number;
  count: number;
  summary: PayrollSummary;
};
export type StaffInput = {
  name: string;
  role: string;
  phone: string;
  monthlySalary: number;
  overtimeHourlyRate: number;
  startMonth: string;
};
export function payrollQuery(
  month: string,
  page = 1,
  search = "",
  includeArchived = false,
) {
  return new URLSearchParams({
    month,
    page: String(page),
    limit: "10",
    ...(includeArchived ? { includeArchived: "true" } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
}
export function overtimePreview(
  mode: "AMOUNT" | "HOURS",
  amount: string,
  hours: string,
  rate: string,
) {
  const input =
    mode === "AMOUNT" ? Number(amount) : Number(hours) * Number(rate);
  if (!Number.isFinite(input) || input <= 0 || input > 1000000000) return null;
  if (
    mode === "HOURS" &&
    (!Number.isFinite(Number(hours)) ||
      Number(hours) <= 0 ||
      Number(hours) > 24 ||
      Number(rate) <= 0)
  )
    return null;
  return Math.round((input + Number.EPSILON) * 100) / 100;
}
export function leaveEndDate(start: string, days: string) {
  const count = Number(days),
    date = new Date(`${start}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !Number.isFinite(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== start ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 31
  )
    return null;
  date.setUTCDate(date.getUTCDate() + count - 1);
  return date.toISOString().slice(0, 10);
}
