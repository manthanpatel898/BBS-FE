# Event Decoration Workflow Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved mobile-first dashboard, single-date booking, finalized decoration pricing, banquet-style follow-ups, document sharing, and simplified event-company users without changing banquet behavior.

**Architecture:** Keep decoration and banquet domain/data paths isolated by business type. Introduce small pure decoration policy helpers consumed consistently by backend queries and frontend presentation, reuse only banquet presentation patterns, and retain `endDate` internally as a compatibility field normalized to `startDate` for new writes.

**Tech Stack:** NestJS, Mongoose/MongoDB transactions, Next.js static export, React, TypeScript, Node test runner, `tsx`, existing PDF endpoint, Web Share API.

## Global Constraints

- Keep the compact `Upcoming events` dashboard card; remove only the large Upcoming Confirmed Events section.
- All visible event-module dates use Start Date as Event Date; banquet date behavior remains unchanged.
- No dynamic ID routes; navigation uses query parameters and remains statically buildable.
- Mobile is the primary viewport, followed by tablet and desktop; page-level horizontal scrolling is forbidden.
- Decoration snapshot, reservations, status, and Final Package Price must commit or roll back together.
- Event-company users are Company Admin only and have no ODC, Signature, or Permissions controls.
- Each task requires its focused tests to pass before commit and before the next task starts.

---

## File Map

### Backend (`../BBS-BE` from this repository)

- `src/modules/decoration-bookings/decoration-booking-domain.ts`: single-date normalization and finalized-price rules.
- `src/modules/decoration-bookings/decoration-dashboard-domain.ts`: future-count and dashboard policy.
- `src/modules/decoration-bookings/decoration-dashboard-records.ts`: policy-aligned list filters.
- `src/modules/decoration-bookings/decoration-bookings.service.ts`: create/update normalization and response projection.
- `src/modules/decoration-bookings/decoration-operations.controller.ts`: dashboard metrics and follow-up projections.
- `src/modules/decoration-bookings/dto/decoration-booking.dto.ts`: optional inquiry price and hidden compatibility date contract.
- `src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`: price-finalization state.
- `src/modules/decoration-imports/decoration-import-template.ts`: single-date import template contract.
- `src/modules/decoration-reservations/decoration-reservations.service.ts`: atomic selection and final-price save.
- `src/modules/decoration-reservations/dto/decoration-reservation.dto.ts`: required final price on selection save.
- `src/modules/decoration-reports/*`: remove visible End Date and represent unfinalized price correctly.
- `src/modules/employees/employees.service.ts`: server-enforced event-company user policy.
- `src/modules/employees/employees.controller.ts`: reject event-company signature/permission endpoints.

### Frontend

- `lib/decoration/dashboard-view.ts`: dashboard card definitions and future-calendar card projection.
- `components/decoration/decoration-dashboard.tsx`: mobile Calendar card and section removals.
- `components/decoration/decoration-dashboard-charts.tsx`: remove Booking Status while retaining the seven-day chart.
- `lib/decoration/inquiry-form.ts` and `components/decoration/decoration-inquiry-form.tsx`: single Event Date and optional initial price.
- `components/decoration/decoration-selection-modal.tsx`: required Final Package Price and atomic submission.
- `lib/decoration/followups.ts` and `components/decoration/decoration-followup-workspace.tsx`: banquet-style actionable follow-ups.
- `lib/decoration/event-detail-view.ts` and `components/decoration/decoration-event-detail-modal.tsx`: remove Print and add capable-device Share.
- `lib/decoration/customer-document-download.ts`: reusable PDF blob/file lifecycle.
- `components/decoration/decoration-customer-document.tsx`: one date and finalized price presentation.
- `app/(app)/employees/page.tsx` and `lib/employees/employee-payload.ts`: fixed event Company Admin UI/payload.

---

### Task 1: Centralize backend event policies

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts`

**Interfaces:**
- Produces: `normalizeDecorationEventDate(startDate: string): { startDate: string; endDate: string }`.
- Produces: `validateFinalPackagePrice(input: { finalPackagePrice: number; totalCollected: number }): number`.
- Produces: `isFutureDecorationBooking(input: { eventDate: Date; status: string }, today: Date): boolean`.
- Produces: `isDecorationSelectionPending(input: { status: string; hasSnapshot: boolean }): boolean`.

- [ ] Write failing tests asserting Start Date is copied to End Date; NaN, negative, and below-collected final prices throw `BadRequestException`; today/future active bookings count; completed/cancelled/closed bookings do not; and only confirmed records without snapshots are selection-pending.
- [ ] Run `cd ../BBS-BE && npx tsx --test src/modules/decoration-bookings/decoration-booking-domain.spec.ts src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts` and confirm the new exports are missing.
- [ ] Implement the four pure helpers with explicit status sets and no database access.
- [ ] Run the same command and require zero failures.
- [ ] Commit in BBS-BE with `git commit -am "feat(decoration): centralize booking workflow policies"`.

### Task 2: Implement single Event Date and optional inquiry price contract

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-view.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-view.spec.ts`
- Modify: `lib/decoration/inquiry-form.ts`
- Modify: `lib/decoration/inquiry-form.test.mjs`
- Modify: `components/decoration/decoration-inquiry-form.tsx`
- Modify: `lib/decoration/booking-view.ts`
- Modify: `lib/decoration/booking-view.test.mjs`
- Modify: `lib/decoration/calendar.ts`
- Modify: `lib/decoration/calendar.test.mjs`
- Modify: `../BBS-BE/src/modules/decoration-imports/decoration-import-template.ts`
- Modify: `../BBS-BE/src/modules/decoration-imports/decoration-import-template.spec.ts`

**Interfaces:**
- Booking response adds `isPackagePriceFinalized: boolean` and represents unfinalized price without deriving a pending amount.
- Create/update accepts omitted `packageRate`; the server stores a safe numeric value plus `isPackagePriceFinalized: false`.
- The server ignores/overwrites a decoration client `endDate` with the normalized Event Date.

- [ ] Add backend failing tests for omitted package price, forged different End Date, legacy record projection, and explicit unfinalized outstanding state.
- [ ] Add frontend failing tests showing no End Date field/value, optional blank Package Price, and payload omission for an unfinalized price.
- [ ] Run `cd ../BBS-BE && npx tsx --test src/modules/decoration-bookings/decoration-booking-domain.spec.ts src/modules/decoration-bookings/decoration-booking-view.spec.ts` and `node --test --experimental-strip-types lib/decoration/inquiry-form.test.mjs`; confirm failures.
- [ ] Update DTO/schema/service normalization and view projection; do not remove the stored End Date field or its compatibility index.
- [ ] Remove End Date controls and validation from the event inquiry form; label Start Date as Event Date; make Package Price optional and display `Not finalized` when absent.
- [ ] Update event calendar/detail formatters and the import template contract to expose one Date column while continuing to normalize imported rows to equal stored start/end dates.
- [ ] Re-run both focused test commands and require zero failures.
- [ ] Commit backend as `feat(decoration): support single event date and deferred price`; commit frontend with the same message.

### Task 3: Save decoration and final price atomically

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-reservations/dto/decoration-reservation.dto.ts`
- Modify: `../BBS-BE/src/modules/decoration-reservations/decoration-reservations.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-reservations/decoration-reservation-domain.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-reservations/mongo-transaction-support.spec.ts`
- Modify: `components/decoration/decoration-selection-modal.tsx`
- Modify/Create: `lib/decoration/selection-price.ts`
- Modify/Create: `lib/decoration/selection-price.test.mjs`

**Interfaces:**
- Selection save request requires `finalPackagePrice: number`.
- Successful save updates reservations, immutable snapshot, booking status, `packageRate`, and `isPackagePriceFinalized` in the existing Mongo session.
- Failed validation or transaction abort leaves all five values unchanged.

- [ ] Write backend failing tests for missing/invalid final price, price below collected advances, successful atomic update, and rollback after a simulated reservation/snapshot failure.
- [ ] Write frontend failing tests for a default blank price, required positive-or-zero numeric validation, collected-amount floor, and payload inclusion.
- [ ] Run focused backend `npx tsx --test` specs and `node --test --experimental-strip-types lib/decoration/selection-price.test.mjs`; confirm failures.
- [ ] Extend the DTO and transaction; call `validateFinalPackagePrice` before writes and update the booking inside the same session.
- [ ] Add Final Package Price to the modal, preserve form state on failure, and disable duplicate saves.
- [ ] Run focused tests, backend build, and frontend decoration tests.
- [ ] Commit backend and frontend as `feat(decoration): finalize price with selection`.

### Task 4: Simplify dashboard and add mobile Calendar card

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-operations.controller.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-records.ts`
- Modify: backend dashboard/records specs
- Modify: `lib/decoration/dashboard-view.ts`
- Modify: `lib/decoration/dashboard-view.test.mjs`
- Modify: `components/decoration/decoration-dashboard.tsx`
- Modify: `components/decoration/decoration-dashboard-charts.tsx`
- Modify/Create: `lib/decoration/dashboard-responsive.behavior.test.tsx`

**Interfaces:**
- Dashboard response adds `futureBookings: number` using today-inclusive active future policy.
- Mobile Calendar card routes to `/decoration/events/` and is not an inline record card.
- Selection-pending count and list both use `isDecorationSelectionPending` semantics.

- [ ] Write failing backend tests for the future count and selection-pending count/list agreement.
- [ ] Write failing frontend assertions that Upcoming remains, Booking Status/large Upcoming Confirmed/Follow-up Priority are absent, the Calendar card is mobile-only, and selection-pending opens its filtered panel.
- [ ] Run focused tests and confirm failures.
- [ ] Add the server metric and align record filters, using Start Date for event-date comparisons.
- [ ] Render the mobile card with `sm:hidden`, remove only the approved sections, and retain the seven-day chart without the status chart.
- [ ] Run focused tests plus `npm run build` in both repositories.
- [ ] Commit backend and frontend as `feat(decoration): simplify mobile dashboard`.

### Task 5: Align event follow-ups with banquet presentation

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-records.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-dashboard-records.spec.ts`
- Modify: `lib/decoration/followups.ts`
- Modify: `lib/decoration/followups.test.mjs`
- Modify: `components/decoration/decoration-followup-workspace.tsx`
- Reference/extract presentation from: `app/(app)/followups/page.tsx`
- Modify: `lib/decoration/followup-workspace.behavior.test.tsx`

**Interfaces:**
- Actionable set: future/today `INQUIRY` only.
- Visible date: scheduled `nextDate` when present; otherwise the eligible inquiry Event Date according to the established banquet rule.
- Completed/taken follow-ups and all non-inquiry/past bookings are excluded.

- [ ] Add characterization tests for banquet yellow/green dots and date-card/sidebar behavior before extracting any presentational primitive.
- [ ] Add event failing tests for scheduled-date placement, taken exclusion, confirmed exclusion, future inquiry inclusion, phone icon, and no page horizontal overflow.
- [ ] Run the banquet and event focused tests; require banquet characterization tests to pass and new event tests to fail.
- [ ] Extract only view primitives needed by both flows, passing data/actions through adapters; do not move booking eligibility into shared UI.
- [ ] Update backend projections and event workspace to the approved actionable rules and icon-only `tel:` control with accessible text.
- [ ] Run all banquet follow-up tests, event follow-up tests, and both builds.
- [ ] Commit backend and frontend as `feat(decoration): align actionable followups with banquet`.

### Task 6: Remove End Date from documents/reports and add native Share

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `../BBS-BE/src/modules/decoration-reports/decoration-reports.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-reports/decoration-report-export.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-customer-document.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-reports/decoration-limited-report-export.spec.ts`
- Modify: `../BBS-BE/src/modules/decoration-reports/decoration-report-export.spec.ts`
- Modify: `lib/decoration/event-detail-view.ts`
- Modify: `lib/decoration/event-detail-view.test.mjs`
- Modify: `lib/decoration/customer-document-download.ts`
- Create: `lib/decoration/customer-document-share.ts`
- Create: `lib/decoration/customer-document-share.test.mjs`
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-customer-document.tsx`
- Modify: `app/(app)/decoration/reports/view/page.tsx`

**Interfaces:**
- `canSharePdf(): boolean` feature-detects `navigator.share`, `navigator.canShare`, and PDF file support.
- `sharePdf(blob: Blob, filename: string, title: string): Promise<void>` creates an `application/pdf` File and invokes native share.
- Event Detail actions contain View, Download, and conditionally Share; never Print.

- [ ] Add failing backend tests that customer documents and exports expose Event Date only and unfinalized prices do not become zero pending balances.
- [ ] Add failing frontend tests for no Print, Share capability detection, correct PDF File metadata, unsupported hiding, cancellation handling, and request de-duplication.
- [ ] Run focused tests and confirm failures.
- [ ] Remove End Date columns/labels from event reports/documents while leaving filtering backward compatible for legacy records.
- [ ] Update the event report table/view to render Event Date only and display `Not finalized` for unresolved package/pending values.
- [ ] Implement blob reuse and native sharing; treat `AbortError` as user cancellation, surface other errors, and always clear action loading state.
- [ ] Run PDF/report tests, all decoration frontend tests, and builds.
- [ ] Commit backend and frontend as `feat(decoration): simplify customer document actions`.

### Task 7: Enforce Company Admin-only event users

**Files:**
- Modify: `../BBS-BE/src/modules/employees/employees.service.ts`
- Modify: `../BBS-BE/src/modules/employees/employees.controller.ts`
- Create: `../BBS-BE/src/modules/employees/employees-event-company.spec.ts`
- Modify: `app/(app)/employees/page.tsx`
- Modify: `lib/employees/employee-payload.ts`
- Modify: `lib/employees/employee-payload.test.mjs`
- Create: `lib/employees/employees-page.behavior.test.tsx`

**Interfaces:**
- `EVENT_DECORATION` create/update persists `role = company_admin`, `permissions = []`, and `canAccessOdc = false`.
- Event-company signature and permission endpoints return a forbidden business-rule response.
- Banquet payload and API behavior are unchanged.

- [ ] Write backend failing tests for normalized create/update, rejected alternate role/ODC/permissions/signature calls, skipped signature list query, and unchanged banquet behavior.
- [ ] Write frontend failing tests for fixed Company Admin presentation and absence of role, ODC, Signature, and Permissions controls/actions.
- [ ] Run focused tests and confirm failures.
- [ ] Add one server-side event-company assertion/normalizer used by create, update, permissions, and signature operations.
- [ ] Branch the shared employee UI only by authenticated `businessType`; retain existing banquet markup and handlers.
- [ ] Run employee tests, auth/business-route tests, lint, and builds.
- [ ] Commit backend and frontend as `feat(employees): simplify event company users`.

### Task 8: Full regression, responsive QA, and completion checklist

**Files:**
- Create: `docs/superpowers/specs/2026-07-21-decoration-workflow-simplification-verification.md`
- Do not change product code unless a failing test demonstrates a regression; any fix receives its own focused test.

- [ ] Run backend decoration and employee specs: `cd ../BBS-BE && npx tsx --test 'src/modules/decoration-*/**/*.spec.ts' src/modules/employees/*.spec.ts src/modules/employees/**/*.spec.ts`.
- [ ] Run backend `npm run lint && npm run build`.
- [ ] Run frontend `node --test --experimental-strip-types lib/decoration/*.test.mjs lib/employees/*.test.mjs lib/auth/business-routes.test.mjs lib/bookings/*.test.mjs`.
- [ ] Run frontend `npm run lint && npm run build` and confirm static export succeeds without dynamic-route errors.
- [ ] Manually verify at 390x844, 768x1024, and 1440x900: dashboard, calendar card, selection-pending list, Event Detail, selection/final price, follow-ups/sidebar, View/Download/Share, and employees.
- [ ] Verify there is no page-level horizontal scroll, all action bars remain reachable, text contrast is readable, and unsupported Share cleanly falls back to Download.
- [ ] Manually smoke-test banquet dashboard, calendar/create/edit/detail, simple and advanced cancellation modes, follow-ups, employee roles/permissions/signatures, reports, and customer documents.
- [ ] Review `git diff --check`, repository status, migrations (none expected for the compatibility approach), and commit any checklist-only updates as `docs: complete decoration workflow verification`.
