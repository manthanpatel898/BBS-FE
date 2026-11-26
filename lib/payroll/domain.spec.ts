import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  joiningSalaryPreview,
  overtimePreview,
  leaveEndDate,
  payrollAvailable,
  payrollQuery,
} from "./domain";
test("flat and hourly overtime calculations preserve paise", () => {
  assert.equal(overtimePreview("AMOUNT", "500", "", ""), 500);
  assert.equal(overtimePreview("HOURS", "", "2.5", "125"), 312.5);
  assert.equal(overtimePreview("HOURS", "", "0", "125"), null);
  assert.equal(overtimePreview("AMOUNT", "-1", "", ""), null);
});
test("simple leave spans dates across a month without any salary deduction", () => {
  assert.equal(leaveEndDate("2026-11-30", "2"), "2026-12-01");
  assert.equal(leaveEndDate("2026-02-30", "2"), null);
  assert.equal(leaveEndDate("2026-11-30", "0"), null);
});
test("payroll entitlement is separate from expense entitlement and defaults off", () => {
  assert.equal(payrollAvailable({ businessType: "EVENT_DECORATION" }), false);
  assert.equal(
    payrollAvailable({
      businessType: "EVENT_DECORATION",
      canAccessStaffPayroll: true,
    }),
    true,
  );
  assert.equal(
    payrollAvailable({ businessType: "BANQUET", canAccessStaffPayroll: true }),
    false,
  );
  assert.equal(payrollQuery("2026-11", 2, "Sample").get("page"), "2");
});

import { getHomeRouteForUser } from "@/lib/auth/navigation";
import type { AuthUser } from "@/lib/auth/types";
test("payroll-only employees get a permitted home only when the separate add-on is enabled", () => {
  const user = {
    role: "employee",
    businessType: "EVENT_DECORATION",
    canAccessStaffPayroll: false,
    effectivePermissions: ["payroll.manage"],
  } as AuthUser;
  assert.equal(getHomeRouteForUser(user), "/access-denied");
  assert.equal(
    getHomeRouteForUser({ ...user, canAccessStaffPayroll: true }),
    "/decoration/payroll",
  );
});

test("joining salary preview uses actual calendar days and includes the start day", () => {
  assert.deepEqual(joiningSalaryPreview("20000", "2020-12-15"), {
    amount: 10967.74,
    payableDays: 17,
    daysInMonth: 31,
  });
  assert.deepEqual(joiningSalaryPreview("20000", "2020-12-01"), {
    amount: 20000,
    payableDays: 31,
    daysInMonth: 31,
  });
  assert.deepEqual(joiningSalaryPreview("29000", "2024-02-29"), {
    amount: 1000,
    payableDays: 1,
    daysInMonth: 29,
  });
  assert.equal(joiningSalaryPreview("20000", "2020-02-30"), null);
});
