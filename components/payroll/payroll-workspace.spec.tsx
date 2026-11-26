import "@/lib/decoration/image-crop-test-dom.mjs";
import React from "react";
import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  AppRouterContext,
  AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AuthProvider } from "@/components/auth/auth-provider";
import { StaffPayrollWorkspace } from "./payroll-workspace";
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  globalThis.fetch = originalFetch;
});
const router = {
  replace() {},
  push() {},
  refresh() {},
  back() {},
  forward() {},
  prefetch() {},
} as unknown as AppRouterInstance;
const row = {
  staff: {
    id: "111111111111111111111111",
    name: "Sample Staff",
    role: "Setup team",
    phone: "",
    monthlySalary: 18000,
    overtimeHourlyRate: 100,
    startMonth: "2026-01",
    isActive: true,
    revision: 0,
  },
  baseSalary: 18000,
  overtimeTotal: 500,
  totalPayable: 18500,
  leaveDays: 2,
  status: "UNPAID",
};
const result = {
  items: [row],
  count: 1,
  page: 1,
  totalPages: 1,
  summary: {
    baseSalary: 18000,
    overtime: 500,
    totalPayable: 18500,
    paid: 0,
    pending: 18500,
    staffCount: 1,
  },
};
const ok = (data: unknown) =>
  Response.json({ success: true, message: "OK", data });
function mount(
  enabled = true,
  role = "company_admin",
  permissions: string[] = [],
) {
  window.localStorage.setItem(
    "banquate_auth_session",
    JSON.stringify({
      savedAt: Date.now(),
      session: {
        accessToken: "sample-token",
        user: {
          id: "user",
          role,
          businessType: "EVENT_DECORATION",
          canAccessStaffPayroll: enabled,
          effectivePermissions: permissions,
        },
      },
    }),
  );
  return render(
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value="/decoration/payroll">
        <AuthProvider>
          <StaffPayrollWorkspace />
        </AuthProvider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>,
  );
}
test("payroll addon defaults closed without fetching salaries", () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return ok(result);
  };
  mount(false);
  assert.ok(screen.getByText(/add-on is not enabled/));
  assert.equal(calls, 0);
});
test("main screen exposes payable and quick leave/overtime actions", async () => {
  globalThis.fetch = async () => ok(result);
  mount();
  await screen.findByText("Sample Staff");
  assert.ok(screen.getByRole("button", { name: "Add leave" }));
  assert.ok(screen.getByRole("button", { name: "Add overtime" }));
  assert.ok(screen.getByText("2 leave days · No deduction"));
  assert.ok(screen.getAllByText("₹18,500.00").length > 0);
});
test("simple leave submits integer days without a salary deduction", async () => {
  let input: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "POST") input = JSON.parse(String(init.body));
    return ok(result);
  };
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Add leave" }));
  fireEvent.change(screen.getByLabelText("Number of days"), {
    target: { value: "2" },
  });
  assert.ok(screen.getByText("For record only. Leave does not reduce salary."));
  fireEvent.click(screen.getByRole("button", { name: "Save leave" }));
  await waitFor(() => assert.equal(input?.days, 2));
  assert.equal(input && "deduction" in input, false);
  await screen.findByText("Leave recorded. Salary is unchanged.");
});
test("hours overtime previews and submits the recorded rate", async () => {
  let input: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "POST") input = JSON.parse(String(init.body));
    return ok(result);
  };
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Add overtime" }));
  fireEvent.click(screen.getByRole("button", { name: "Hours × rate" }));
  fireEvent.change(screen.getByLabelText("Overtime hours"), {
    target: { value: "2.5" },
  });
  fireEvent.change(screen.getByLabelText("Rate per hour (₹)"), {
    target: { value: "125" },
  });
  assert.ok(screen.getByText("₹312.50"));
  fireEvent.click(screen.getByRole("button", { name: "Save overtime" }));
  await waitFor(() => assert.equal(input?.mode, "HOURS"));
  assert.equal((input as unknown as Record<string, unknown>).rate, 125);
  await screen.findByText("Overtime added.");
});
test("view-only employees do not get salary edit or payment actions", async () => {
  globalThis.fetch = async () => ok(result);
  mount(true, "employee", ["payroll.view"]);
  await screen.findByText("Sample Staff");
  assert.equal(screen.queryByRole("button", { name: "+ Add staff" }), null);
  assert.equal(screen.queryByRole("button", { name: "Add overtime" }), null);
  assert.equal(screen.queryByRole("button", { name: "Mark paid" }), null);
  assert.ok(screen.getByRole("button", { name: "Details" }));
});

test("editing a prorated month keeps the full monthly salary rate", async () => {
  const { PayrollDialog } = await import("./payroll-dialog");
  let input: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "PATCH") input = JSON.parse(String(init.body));
    return ok(row.staff);
  };
  render(
    <PayrollDialog
      action="edit"
      row={
        {
          ...row,
          status: "UNPAID",
          baseSalary: 10967.74,
          staff: {
            ...row.staff,
            monthlySalary: 20000,
            startDate: "2026-11-15",
          },
        } as never
      }
      month="2026-11"
      token="sample-token"
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
  assert.equal(
    (screen.getByLabelText("Monthly salary (₹)") as HTMLInputElement).value,
    "20000",
  );
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "9000000000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save staff" }));
  await waitFor(() => assert.equal(input?.monthlySalary, 20000));
  await waitFor(() => assert.equal(input?.startDate, "2026-11-15"));
});

test("new staff uses an exact salary start date and previews the joining month", async () => {
  const { PayrollDialog } = await import("./payroll-dialog");
  let input: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "POST") input = JSON.parse(String(init.body));
    return ok(row.staff);
  };
  render(
    <PayrollDialog
      action="staff"
      month="2020-12"
      token="sample-token"
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Staff name"), {
    target: { value: "Sample" },
  });
  fireEvent.change(screen.getByLabelText("Monthly salary (₹)"), {
    target: { value: "20000" },
  });
  const date = screen.getByLabelText("Salary starts from") as HTMLInputElement;
  assert.equal(date.type, "date");
  fireEvent.change(date, { target: { value: "2020-12-15" } });
  assert.ok(screen.getByText("First month · 17/31 days"));
  fireEvent.click(screen.getByRole("button", { name: "Save staff" }));
  await waitFor(() => assert.equal(input?.startDate, "2020-12-15"));
});
