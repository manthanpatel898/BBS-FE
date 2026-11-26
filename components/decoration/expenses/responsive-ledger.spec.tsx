import "@/lib/decoration/image-crop-test-dom.mjs";
import React from "react";
import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExpenseTable, expenseInputClass } from "./shared";
import { PaidExpense } from "@/lib/decoration/expenses/domain";
afterEach(cleanup);
const row: PaidExpense = {
  id: "expense",
  bookingId: "event",
  typeId: "commission",
  typeName: "Restaurant commission",
  kind: "PERCENTAGE",
  value: 10,
  baseAmount: 50000,
  amount: 5000,
  paidDate: "2026-11-26",
  mode: "BANK_TRANSFER",
  remark: "Paid after setup",
  recordedBy: "Company Admin",
  updatedBy: "Manager",
  revision: 1,
  event: {
    bookingNumber: "DEC-TEST",
    functionName: "Reception",
    startDate: "2026-11-26",
    customer: { name: "Customer" },
  },
};
test("expense ledger is a readable list with calculation, event context and accessible editing", () => {
  let edited: string | null = null;
  render(
    <ExpenseTable
      rows={[row]}
      showEvent
      onEdit={(entry) => {
        edited = entry.id;
      }}
    />,
  );
  assert.ok(screen.getByRole("list", { name: "Paid expenses" }));
  assert.equal(screen.getAllByRole("listitem").length, 1);
  assert.ok(screen.getByText("10% × ₹50,000.00"));
  assert.ok(screen.getByText(/DEC-TEST/));
  assert.ok(screen.getByText(/Edited by Manager/));
  fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
  assert.equal(edited, "expense");
});
test("finance fields opt into their scoped light style", () => {
  assert.match(expenseInputClass, /finance-field/);
});
