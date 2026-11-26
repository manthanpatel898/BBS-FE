import { authorizedRequest } from "@/lib/auth/api";
import {
  PayrollResponse,
  PayrollStaff,
  PayrollStatement,
  StaffInput,
  payrollQuery,
} from "./domain";
const base = "/decoration/payroll";
export const fetchPayroll = (
  token: string,
  month: string,
  page = 1,
  search = "",
  includeArchived = false,
) =>
  authorizedRequest<PayrollResponse>(
    `${base}/staff?${payrollQuery(month, page, search, includeArchived)}`,
    token,
  );
export const fetchPayrollStatement = (
  token: string,
  id: string,
  month: string,
) =>
  authorizedRequest<PayrollStatement>(
    `${base}/staff/${encodeURIComponent(id)}/statement?${new URLSearchParams({ month })}`,
    token,
  );
export const createPayrollStaff = (token: string, input: StaffInput) =>
  authorizedRequest<PayrollStaff>(`${base}/staff`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePayrollStaff = (
  token: string,
  id: string,
  input: Omit<StaffInput, "startMonth"> & {
    effectiveMonth: string;
    isActive: boolean;
    revision: number;
  },
) =>
  authorizedRequest<PayrollStaff>(
    `${base}/staff/${encodeURIComponent(id)}`,
    token,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const addStaffOvertime = (
  token: string,
  id: string,
  input: {
    date: string;
    mode: "AMOUNT" | "HOURS";
    amount?: number;
    hours?: number;
    rate?: number;
    remark?: string;
  },
) =>
  authorizedRequest(`${base}/staff/${encodeURIComponent(id)}/overtime`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const addStaffLeave = (
  token: string,
  id: string,
  input: { startDate: string; days: number; remark?: string },
) =>
  authorizedRequest(`${base}/staff/${encodeURIComponent(id)}/leaves`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const payStaffSalary = (
  token: string,
  id: string,
  input: {
    month: string;
    paidDate: string;
    mode: string;
    remark?: string;
    expectedTotal: number;
  },
) =>
  authorizedRequest(`${base}/staff/${encodeURIComponent(id)}/pay`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const deletePayrollEntry = (
  token: string,
  kind: "overtime" | "leaves",
  id: string,
) =>
  authorizedRequest(`${base}/${kind}/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
export const exportPayroll = (
  token: string,
  month: string,
  search = "",
  includeArchived = false,
) =>
  authorizedRequest<PayrollResponse>(
    `${base}/export?${new URLSearchParams({ month, ...(includeArchived ? { includeArchived: "true" } : {}), ...(search.trim() ? { search: search.trim() } : {}) })}`,
    token,
  );
