# Advance Payment Print Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Print the selected advance-payment date with the actual India-local capture time instead of the UTC-midnight `05:30` artifact.

**Architecture:** Add a pure, exported formatter to the existing print-date utility that receives `payment.date` and `payment.createdAt`, formats both in `Asia/Kolkata`, and falls back to date-only output for legacy invalid capture timestamps. Replace only the two banquet advance-ledger call sites; retain the existing general timestamp formatter for signatures.

**Tech Stack:** TypeScript, React, Next.js static export, Node assertions, `Intl.DateTimeFormat`.

## Global Constraints

- The payment date must come from `payment.date`.
- The displayed time must come from `payment.createdAt`.
- Formatting must explicitly use `Asia/Kolkata` and 12-hour time.
- Missing or invalid `createdAt` must produce date-only output.
- No API, database, schema, or migration changes.

---

### Task 1: Add and adopt the advance-payment print formatter

**Files:**
- Modify: `lib/print-date.ts`
- Modify: `scripts/print-date.spec.ts`
- Modify: `app/print/order/print-order-view.tsx`

**Interfaces:**
- Produces: `formatAdvancePaymentDateTime(paymentDate: string, createdAt?: string | null): string`
- Consumes: `OrderAdvancePayment.date` and `OrderAdvancePayment.createdAt`.

- [x] **Step 1: Add failing regression assertions**

Import `formatAdvancePaymentDateTime` and assert:

```ts
assert.equal(
  formatAdvancePaymentDateTime(
    '2026-08-09T00:00:00.000Z',
    '2026-08-09T13:12:00.000Z',
  ),
  '09/08/2026, 06:42 PM',
);
assert.equal(
  formatAdvancePaymentDateTime('2026-08-09T00:00:00.000Z', null),
  '09/08/2026',
);
assert.equal(
  formatAdvancePaymentDateTime('2026-08-09T00:00:00.000Z', 'invalid'),
  '09/08/2026',
);
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npx tsx scripts/print-date.spec.ts`

Expected: FAIL because `formatAdvancePaymentDateTime` is not exported.

- [x] **Step 3: Implement the minimal pure formatter**

Use `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'` for the payment date and capture time. Validate both `Date` objects with `Number.isNaN(date.getTime())`; use `formatSlashDate` only as an existing compatibility helper outside this new function.

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `npx tsx scripts/print-date.spec.ts`

Expected: all assertions pass.

- [x] **Step 5: Update both banquet advance-ledger rows**

Import the new formatter in `print-order-view.tsx` and replace both instances of:

```tsx
formatDateTime(payment.date)
```

with:

```tsx
formatAdvancePaymentDateTime(payment.date, payment.createdAt)
```

Do not replace signature timestamp formatting.

- [x] **Step 6: Run complete frontend verification**

```bash
npx tsx scripts/print-date.spec.ts
npm run lint
npm run build
```

Expected: all commands exit `0`, including static route generation.

- [x] **Step 7: Commit the verified change**

```bash
git add lib/print-date.ts scripts/print-date.spec.ts app/print/order/print-order-view.tsx docs/superpowers/plans/2026-08-12-advance-payment-print-time.md
git commit -m "fix: print actual advance capture time"
```
