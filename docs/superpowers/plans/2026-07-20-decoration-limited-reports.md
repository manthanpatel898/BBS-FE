# Decoration Limited Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four banquet-style decoration reports—Event Worksheet, Booking, Advance Collected, and Pending Amount—with safe inline inquiry editing and consistent CSV/XLSX/print output.

**Architecture:** Extend the existing company-scoped decoration reports module with a single typed report-kind query contract and focused paginated endpoints. Keep calculations and row normalization in pure domain helpers, reuse the existing booking update service for authoritative validation/audit, and replace the current monolithic decoration report page with static-query-string report landing/view/print pages.

**Tech Stack:** NestJS 11, Mongoose 8, class-validator, ExcelJS, Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node/tsx tests.

## Global Constraints

- The report landing page contains exactly four reports.
- Existing banquet report APIs and screens must remain unchanged.
- Existing decoration booking and embedded payment data remain the source of truth; do not add a worksheet collection.
- Only `INQUIRY` worksheet rows are editable; the backend must recheck status at save time.
- Preview queries are company scoped and server paginated; exports are limited to 10,000 rows.
- Use query-string routes only; do not add dynamic path parameters to frontend pages.
- Desktop/tablet use tables and mobile uses equivalent stacked cards.
- Report preview, CSV, XLSX, and print must use the same filter definition and calculations.

---

### Task 1: Report contracts and pure domain rules

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-reports/dto/decoration-report.dto.ts`
- Create: `apps/BBS-BE/src/modules/decoration-reports/decoration-limited-report-domain.ts`
- Test: `apps/BBS-BE/src/modules/decoration-reports/decoration-limited-report-domain.spec.ts`

**Interfaces:**
- Produces: `DecorationLimitedReportKind`, `DecorationLimitedReportQueryDto`, `decorationPaymentTotal`, `decorationOutstanding`, `isCommittedDecorationStatus`, `assertWorksheetInquiryStatus`
- Consumes: `DecorationBookingStatus`

- [ ] **Step 1: Write failing domain tests**

```ts
assert.equal(decorationPaymentTotal([{ amount: 2000 }, { amount: 3000 }]), 5000);
assert.equal(decorationOutstanding(12000, [{ amount: 5000 }]), 7000);
assert.equal(decorationOutstanding(5000, [{ amount: 7000 }]), 0);
assert.equal(isCommittedDecorationStatus('CONFIRMED'), true);
assert.equal(isCommittedDecorationStatus('INQUIRY'), false);
assert.throws(() => assertWorksheetInquiryStatus('CONFIRMED'), /Only inquiry rows/);
```

- [ ] **Step 2: Run the domain test and confirm RED**

Run: `npx ts-node src/modules/decoration-reports/decoration-limited-report-domain.spec.ts`

Expected: module-not-found failure.

- [ ] **Step 3: Implement explicit report kinds and calculations**

```ts
export enum DecorationLimitedReportKind {
  WORKSHEET = 'worksheet', BOOKING = 'booking', ADVANCE = 'advance', PENDING = 'pending'
}
export const COMMITTED_DECORATION_STATUSES = new Set([
  'CONFIRMED', 'DECORATION_SELECTION_PENDING', 'DECORATION_SELECTED', 'IN_PROGRESS', 'COMPLETED',
]);
export const decorationPaymentTotal = (payments: Array<{ amount: number }>) =>
  payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0);
export const decorationOutstanding = (budget: number, payments: Array<{ amount: number }>) =>
  Math.max(0, Math.max(0, Number(budget) || 0) - decorationPaymentTotal(payments));
```

Add query fields `kind`, `from`, `to`, `status`, `paymentMode`, `search`, `page`, and `limit` with class-validator constraints. Reject `from > to` in range construction.

- [ ] **Step 4: Run tests and backend build**

Run: `npx ts-node src/modules/decoration-reports/decoration-limited-report-domain.spec.ts && npm run build`

Expected: pass and zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/decoration-reports/dto/decoration-report.dto.ts src/modules/decoration-reports/decoration-limited-report-domain.ts src/modules/decoration-reports/decoration-limited-report-domain.spec.ts
git commit -m "feat decoration limited report contracts"
```

### Task 2: Paginated worksheet and booking report APIs

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.service.ts`
- Test: `apps/BBS-BE/src/modules/decoration-reports/decoration-limited-report-service.spec.ts`

**Interfaces:**
- Produces: `GET /decoration/reports/worksheet`, `GET /decoration/reports/bookings`
- Response: `{ range, items, pagination, totals }`

- [ ] **Step 1: Write failing tenant/filter/pagination tests**

Test that queries include `restaurantId`, overlapping event-date range, optional status/search, deterministic `{ startDate: 1, startTime: 1, _id: 1 }` sorting, and bounded skip/limit. Assert worksheet rows contain the exact Excel replacement fields and `editable: status === 'INQUIRY'`.

- [ ] **Step 2: Confirm RED**

Run: `npx ts-node src/modules/decoration-reports/decoration-limited-report-service.spec.ts`

Expected: missing service methods.

- [ ] **Step 3: Implement shared booking-row pipeline**

Project only:

```ts
{
  bookingNumber: 1, customer: 1, eventType: 1, venue: 1, hall: 1,
  address: 1, startDate: 1, endDate: 1, startTime: 1, endTime: 1,
  notes: 1, packageRate: 1, status: 1, createdBySnapshot: 1, payments: 1,
}
```

Map worksheet rows to `date`, `customerName`, `mobile`, `venue`, `hall`, `time`, `notes`, `eventType`, `budget`, `status`, `createdBy`, and `editable`. Map booking rows with collected and pending calculations. Use `$facet` for items, count, and totals from one filter definition.

- [ ] **Step 4: Add guarded controller endpoints**

```ts
@Get('worksheet') worksheet(...) { return this.service.worksheet(...); }
@Get('bookings') bookings(...) { return this.service.bookingReport(...); }
```

Both inherit business-type, authentication, tenant, and `DECORATION_REPORTS_VIEW` guards.

- [ ] **Step 5: Run tests/build and commit**

```bash
npx ts-node src/modules/decoration-reports/decoration-limited-report-service.spec.ts
npm run build
git add src/modules/decoration-reports
git commit -m "feat decoration worksheet and booking reports"
```

### Task 3: Advance and pending report APIs

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.service.ts`
- Test: `apps/BBS-BE/src/modules/decoration-reports/decoration-financial-reports.spec.ts`

**Interfaces:**
- Produces: `GET /decoration/reports/advances`, `GET /decoration/reports/pending`

- [ ] **Step 1: Write failing payment and outstanding tests**

Cover one output row per embedded payment, payment-date range boundaries, payment mode and search filtering, committed-status pending rows, overpayment clamping, zero-pending exclusion, pagination, and filtered totals.

- [ ] **Step 2: Confirm RED**

Run: `npx ts-node src/modules/decoration-reports/decoration-financial-reports.spec.ts`

Expected: missing endpoints/service methods.

- [ ] **Step 3: Implement advance aggregation**

Use `$unwind: '$payments'`, match `payments.date` inclusively, and project payment date, booking/customer/event values, amount, mode, remark, and recordedBy. Sort by payment date descending then booking ID/payment ID.

- [ ] **Step 4: Implement pending aggregation**

Match only committed statuses, calculate `collectedAmount` from payments and `pendingAmount = max(packageRate - collectedAmount, 0)`, then match `pendingAmount > 0`. Date filtering remains event-date based.

- [ ] **Step 5: Run tests/build and commit**

```bash
npx ts-node src/modules/decoration-reports/decoration-financial-reports.spec.ts
npm run build
git add src/modules/decoration-reports
git commit -m "feat decoration financial reports"
```

### Task 4: Safe worksheet inline update API

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Test: `apps/BBS-BE/src/modules/decoration-bookings/decoration-worksheet-update.spec.ts`

**Interfaces:**
- Produces: `PATCH /decoration/bookings/:id/worksheet`
- Consumes: existing reference resolution, booking update payload, audit log, `DECORATION_BOOKINGS_UPDATE`

- [ ] **Step 1: Write failing status/reference tests**

Prove that company scoping is mandatory, `CONFIRMED` is rejected even if it changed after the page loaded, event type and venue IDs resolve from company configuration, a hall must belong to the selected banquet, outdoor venue accepts no hall, empty patches fail, and audit before/after contains only changed fields.

- [ ] **Step 2: Confirm RED**

Run: `npx ts-node src/modules/decoration-bookings/decoration-worksheet-update.spec.ts`

- [ ] **Step 3: Add allowlisted DTO**

Allow only customer name/mobile, eventTypeId, venueId, hallId/null, start/end date, start/end time, notes/null, and packageRate. Do not allow status, payments, follow-ups, decoration snapshot, creator, or restaurant fields.

- [ ] **Step 4: Implement through existing update internals**

Fetch tenant-scoped record, require `status === INQUIRY`, resolve dependent references, validate dates/times/mobile/budget, apply one atomic save, and write the standard booking audit event.

- [ ] **Step 5: Guard, test, build, and commit**

```ts
@Patch(':id/worksheet')
@Permissions(PERMISSIONS.DECORATION_BOOKINGS_UPDATE)
worksheetUpdate(...) { return this.bookings.updateWorksheet(...); }
```

Run tests and `npm run build`, then commit as `feat decoration worksheet inline editing`.

### Task 5: Bounded CSV/XLSX/print exports

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-reports.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reports/decoration-report-export.ts`
- Test: `apps/BBS-BE/src/modules/decoration-reports/decoration-limited-report-export.spec.ts`

**Interfaces:**
- Produces: `GET /decoration/reports/export/:kind/:format`
- Formats: `csv | xlsx | print`

- [ ] **Step 1: Write failing export parity tests**

Assert each kind has exact headers/order, CSV escapes commas/quotes/newlines, XLSX has report title/date range/totals, print returns the same normalized rows, 10,001 rows fail, and every export produces an audit record.

- [ ] **Step 2: Confirm RED and implement normalized export definitions**

Use one column definition per report kind for preview/export/print values. CSV includes UTF-8 BOM; XLSX uses ExcelJS and freezes the header row. Never trust client-supplied columns.

- [ ] **Step 3: Add export endpoint permissions and headers**

Require both report view and export permissions; set no-store, nosniff, correct MIME type, and sanitized filenames.

- [ ] **Step 4: Run tests/build and commit**

Run export tests and `npm run build`, then commit as `feat decoration limited report exports`.

### Task 6: Frontend API contracts and report landing page

**Files:**
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Replace: `apps/BBS-FE/app/(app)/decoration/reports/page.tsx`
- Test: `apps/BBS-FE/lib/decoration/limited-reports.test.mjs`

**Interfaces:**
- Produces typed fetch/download functions and four-card landing page

- [ ] **Step 1: Write failing query/landing tests**

Assert filters serialize without undefined values, URLs remain query-string based, and the landing definition contains exactly `worksheet`, `booking`, `advance`, and `pending`.

- [ ] **Step 2: Confirm RED and add types/API functions**

Define row, totals, pagination, and query types for all four reports. Add fetch functions for each preview, worksheet PATCH, and binary export.

- [ ] **Step 3: Build the banquet-style landing page**

Use the same card hierarchy, typography, badges, hover treatment, permission message, and `Link href="/decoration/reports/view?type=..."` navigation as banquet.

- [ ] **Step 4: Run tests/build and commit**

Commit as `feat decoration limited report navigation`.

### Task 7: Banquet-style report view and inline worksheet editor

**Files:**
- Create: `apps/BBS-FE/app/(app)/decoration/reports/view/page.tsx`
- Create: `apps/BBS-FE/components/decoration/reports/decoration-report-filter-panel.tsx`
- Create: `apps/BBS-FE/components/decoration/reports/decoration-report-table.tsx`
- Create: `apps/BBS-FE/components/decoration/reports/decoration-worksheet-editor.tsx`
- Test: `apps/BBS-FE/lib/decoration/limited-report-workspace.behavior.test.tsx`

**Interfaces:**
- Consumes: typed report APIs/configuration APIs, `?type=...`
- Produces responsive previews and row-level inquiry editing

- [ ] **Step 1: Write failing report workspace tests**

Cover invalid report type fallback, Generate Report, filters, totals, pagination, CSV/XLSX selection, download loader/error, desktop table/mobile card parity, and absence of edit controls on non-inquiry rows.

- [ ] **Step 2: Write failing inline-editor tests**

Cover Edit/Save/Cancel, retained drafts after server error, dependent hall reset when venue changes, no hall required for outdoor venue, disabled double-submit, and stale-status conflict messaging.

- [ ] **Step 3: Confirm RED and build shared filter/table components**

Mirror banquet input classes and explicit Generate/Download controls. Do not fetch until filters are valid. Preserve the current preview while a background page request runs.

- [ ] **Step 4: Implement row-draft worksheet editing**

Keep `draftByBookingId` local to the editor. Save one row atomically and replace only the returned row. On failure preserve draft values and surface the backend message.

- [ ] **Step 5: Run tests/static build and commit**

Run behavior tests, `npm run lint`, and `npm run build`; commit as `feat decoration limited report workspace`.

### Task 8: Unified printable pages and final regression

**Files:**
- Replace: `apps/BBS-FE/app/(app)/decoration/reports/print/page.tsx`
- Test: `apps/BBS-FE/lib/decoration/limited-report-print.behavior.test.tsx`

**Interfaces:**
- Consumes: `?type`, identical filters, print export data

- [ ] **Step 1: Write failing print parity tests**

Assert platform navigation/header is excluded from print, each report uses its matching columns/totals, A4 landscape styling is present, and loading/errors remain readable.

- [ ] **Step 2: Implement one print renderer driven by report kind**

Render company/report title, date basis/range, generated timestamp, row count, report-specific table, and totals. Keep Back and Print / Save PDF controls inside `.report-actions` hidden by print CSS.

- [ ] **Step 3: Run complete backend/frontend verification**

Backend: domain/service/export/worksheet tests, `npm run lint`, `npm run build`.

Frontend: limited-report tests, `npm run lint`, `npm run build` and confirm static routes `/decoration/reports`, `/decoration/reports/view`, `/decoration/reports/print`.

- [ ] **Step 4: Verify no migration and no unrelated changes**

Run `git diff --check`, inspect indexes/query plans for company/date/payment paths, and document that no schema migration is needed. Do not add a migration unless verification finds a missing production index.

- [ ] **Step 5: Commit final verification fixes**

Commit backend and frontend separately, then confirm both working trees are clean.
