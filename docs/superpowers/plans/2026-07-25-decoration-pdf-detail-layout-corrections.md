# Decoration PDF and Event Detail Layout Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every decoration proposal page identifiable and space-efficient,
present advances like the banquet ledger, and make the Event Detail Customer
card consume its available width.

**Architecture:** Keep the existing normalized customer document. Change only
the PDFKit renderer geometry and the decoration Event Detail presentation. Add
source/behavior regressions before production edits.

**Tech Stack:** NestJS, TypeScript, PDFKit, Next.js, React, Tailwind CSS,
Node test runner.

## Global Constraints

- Do not modify banquet behavior or banquet components.
- No schema or data migration.
- Preserve static frontend routes.
- Every continuation PDF page must include company name, contacts, address,
  proposal title, and booking number.

---

### Task 1: Repeated PDF Header and Compact Geometry

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`

**Interfaces:**
- Consumes: `DecorationCustomerDocument.company`
- Produces: exported PDF header/page geometry constants and complete repeated
  headers through `drawHeader`

- [ ] **Step 1: Write the failing test**

Assert compact margins are below 42 points and a continuation header includes
the configured contact and address strings in extracted page text.

- [ ] **Step 2: Run test to verify it fails**

Run:
`npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

Expected: FAIL because continuation headers currently omit contacts/address.

- [ ] **Step 3: Implement the compact complete header**

Use a 28-point page margin. Render company name, contacts, and address at
smaller sizes on continuation pages. Calculate the rule and content start from
the header variant so text cannot overlap.

- [ ] **Step 4: Run test to verify it passes**

Run:
`npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

Expected: PASS.

### Task 2: Banquet-Style Advance Ledger

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`

**Interfaces:**
- Consumes: `DecorationCustomerDocument.payments` and
  `financials.totalAmountReceived`
- Produces: one compact four-column ledger plus a total row

- [ ] **Step 1: Write the failing test**

Assert the rendered PDF includes `Date`, `Payment Mode`, `Remark`, `Amount`,
and `Total Advance Received`.

- [ ] **Step 2: Run test to verify it fails**

Run the PDF spec and expect the missing total/header assertion to fail.

- [ ] **Step 3: Implement the ledger**

Draw one header row, one row per payment, and one bold total row. Use the same
black/slate palette as the proposal and call `ensureSpace` for every row.

- [ ] **Step 4: Run test to verify it passes**

Run the PDF spec and expect PASS.

### Task 3: Responsive Customer Card

**Files:**
- Modify: `apps/BBS-FE/lib/decoration/event-detail-layout.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`

**Interfaces:**
- Produces: a configurable `Grid` column mode used by the Customer card

- [ ] **Step 1: Write the failing test**

Assert the Customer card uses the customer grid mode and that mode includes
single-column narrow/mobile and desktop-sidebar rules instead of four columns.

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --import tsx --test lib/decoration/event-detail-layout.test.mjs`

Expected: FAIL because Customer uses the generic four-column grid.

- [ ] **Step 3: Implement the customer grid mode**

Add `variant="customer"` to `Grid`. Use one column at the narrowest width, two
equal columns from 420px, and one full-width column in the narrow `lg`
supporting sidebar.

- [ ] **Step 4: Run test to verify it passes**

Run the layout test and expect PASS.

### Task 4: Regression and Production Verification

**Files:**
- Verify all files above

- [ ] **Step 1: Run backend verification**

Run the decoration PDF/customer-document specs, backend lint, and backend
build.

- [ ] **Step 2: Run frontend verification**

Run all decoration tests, TypeScript, frontend lint, and static production
build.

- [ ] **Step 3: Review scope**

Confirm `git diff --name-only` contains no banquet booking or banquet print
files.

- [ ] **Step 4: Commit**

Create separate backend and frontend commits with only the layout correction
files.
