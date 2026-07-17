# Decoration Calendar and Confirmation Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the decoration configuration, calendar, day-sidebar, detail-popup, and inquiry-confirmation experience to banquet while preserving decoration-owned storage and APIs.

**Architecture:** Keep banquet production components unchanged. Build focused decoration components against shared presentation primitives and explicit overlay state, and add an idempotent decoration confirmation operation that updates only `decoration_bookings`. Allocate event-type ordering on the server with a tenant-scoped database invariant and migration.

**Tech Stack:** NestJS, Mongoose/MongoDB, class-validator, Next.js static export, React, TypeScript, Tailwind CSS, Node test runner.

## Global Constraints

- Static deployment must use query-string parameters; no entity ID may require a dynamic path route.
- Decoration workflows must not call or mutate banquet booking, payment, menu, hall-slot, follow-up, or report APIs/collections.
- Existing banquet behavior and styling remain unchanged.
- Calendar → day sidebar → Event Detail → child popup is a retained overlay stack; close moves back exactly one level.
- Decoration pages never render Hall Slot Status or menu snapshots.
- All behavior changes follow red-green-refactor and receive automated regression coverage.

---

### Task 1: Tenant-Safe Automatic Event-Type Ordering

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-configuration/schemas/decoration-event-type.schema.ts`
- Modify: `../BBS-BE/src/modules/decoration-configuration/dto/decoration-configuration.dto.ts`
- Modify: `../BBS-BE/src/modules/decoration-configuration/decoration-event-types.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-imports/decoration-imports.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-configuration/decoration-configuration.spec.ts`
- Create: `../BBS-BE/src/scripts/decoration-event-type-order-migration.ts`
- Create: `../BBS-BE/src/scripts/decoration-event-type-order-migration.spec.ts`
- Create: `../BBS-BE/src/scripts/migrate-decoration-event-type-orders.ts`
- Modify: `../BBS-BE/package.json`
- Modify: `components/decoration/settings/event-types-section.tsx`
- Modify: `lib/decoration/settings-view.ts`
- Modify: `lib/decoration/settings-view.test.mjs`

**Interfaces:**
- Produces: backend-created `displayOrder: number` where the first company record is `1` and all active/inactive records participate in the sequence.
- Produces: `planDecorationEventTypeOrderMigration(records)` returning deterministic positive orders without changing already-valid unique positive orders unnecessarily.
- Consumes: `createDecorationEventType(token, { name }, source)`; the frontend no longer supplies `displayOrder` during creation.

- [x] **Step 1: Write failing backend ordering and migration tests**

Add assertions that first creation resolves to `1`, subsequent creation resolves to `2`, two restaurant IDs each begin at `1`, duplicate-key retry obtains the next order, and migration converts `0`, negative, missing, and duplicate values into unique positive sequences per restaurant.

```ts
assert.equal(nextDecorationEventTypeOrder([], restaurantA), 1);
assert.equal(nextDecorationEventTypeOrder([{ restaurantId: restaurantA, displayOrder: 1 }], restaurantA), 2);
assert.equal(nextDecorationEventTypeOrder([{ restaurantId: restaurantA, displayOrder: 8 }], restaurantB), 1);
```

- [x] **Step 2: Run backend tests and verify RED**

Run: `npx ts-node src/modules/decoration-configuration/decoration-configuration.spec.ts && npx ts-node src/scripts/decoration-event-type-order-migration.spec.ts`

Expected: FAIL because automatic allocation and migration planner are not implemented.

- [x] **Step 3: Implement the database invariant and allocator**

Make `displayOrder` required with minimum `1`, add a unique index on `{ restaurantId: 1, displayOrder: 1 }`, ignore create DTO order, and allocate `max(displayOrder) + 1`. Retry bounded duplicate-key failures by recalculating the maximum; return a conflict after three collisions. Preserve order during name edits. Import-created event types must use the same allocator rather than `displayOrder: 0`.

```ts
for (let attempt = 0; attempt < 3; attempt += 1) {
  const latest = await this.eventTypes.findOne({ restaurantId }).sort({ displayOrder: -1 }).select({ displayOrder: 1 }).lean();
  try { return await this.eventTypes.create({ ...values, displayOrder: Number(latest?.displayOrder ?? 0) + 1 }); }
  catch (error) { if (!isDuplicateKey(error) || attempt === 2) throw error; }
}
```

- [x] **Step 4: Implement and dry-run the bounded migration**

Migration groups by `restaurantId`, sorts by current positive order/name/ID, assigns unique `1..n`, uses temporary negative values to avoid unique-index collisions, then applies final values. Provide `--apply`; default is dry-run. Only create the unique index after data normalization.

Run: `npm run migrate:decoration-event-type-orders`

Expected: JSON summary with companies, total records, invalid orders, duplicate orders, and proposed updates; no writes without `--apply`.

- [x] **Step 5: Write failing frontend test for hidden generated order**

```js
assert.equal(buildEventTypeCreatePayload({ name: 'Marriage', displayOrder: '99' }), { name: 'Marriage' });
```

Run: `node --test --experimental-strip-types lib/decoration/settings-view.test.mjs`

Expected: FAIL because the current form accepts and sends display order.

- [x] **Step 6: Remove Display Order from Add Event Type**

Keep the order label read-only on list cards. Do not include `displayOrder` in create payloads. Preserve edit behavior only if the existing edit contract intentionally supports ordering; otherwise show it read-only there too.

- [x] **Step 7: Run focused and configuration regression tests**

Run: `npx ts-node src/modules/decoration-configuration/decoration-configuration.spec.ts && npx ts-node src/scripts/decoration-event-type-order-migration.spec.ts`

Run: `node --test --experimental-strip-types lib/decoration/settings-view.test.mjs`

Expected: PASS.

- [x] **Step 8: Commit Task 1 in both repositories**

```bash
git add src/modules/decoration-configuration src/modules/decoration-imports/decoration-imports.service.ts src/scripts package.json
git commit -m "Generate decoration event type order"
```

```bash
git add components/decoration/settings/event-types-section.tsx lib/decoration/settings-view.ts lib/decoration/settings-view.test.mjs
git commit -m "Use generated decoration event type order"
```

---

### Task 2: Accessible Configuration Action Cards

**Files:**
- Modify: `components/decoration/settings/event-types-section.tsx`
- Modify: `components/decoration/settings/locations-section.tsx`
- Create: `lib/decoration/configuration-actions.ts`
- Create: `lib/decoration/configuration-actions.test.mjs`

**Interfaces:**
- Produces: `configurationActionClass(variant, disabled): string` for `edit | activate | deactivate | add`.
- Produces: mobile-safe action rows using `flex flex-wrap` and minimum 44px controls.

- [x] **Step 1: Write failing action-state tests**

Assert every variant contains a readable text color, non-transparent background or strong border, focus-visible ring, disabled state, and that card action rows wrap.

```js
assert.match(configurationActionClass('edit', false), /text-slate-900/);
assert.match(configurationActionClass('deactivate', false), /text-red-/);
assert.match(configurationActionClass('activate', false), /bg-emerald-/);
assert.match(configurationActionClass('add', true), /disabled:/);
```

- [x] **Step 2: Run test and verify RED**

Run: `node --test --experimental-strip-types lib/decoration/configuration-actions.test.mjs`

Expected: FAIL because the shared action-style contract does not exist.

- [x] **Step 3: Implement visible button variants and responsive rows**

Use explicit colors rather than inherited low-contrast text. Apply the same variants to event types, hotels, venues, and halls. Preserve existing loading/disabled behavior and add `aria-busy` during mutations.

- [x] **Step 4: Run focused test, lint, and commit**

Run: `node --test --experimental-strip-types lib/decoration/configuration-actions.test.mjs && npm run lint`

Expected: PASS with no new warnings.

```bash
git add components/decoration/settings lib/decoration/configuration-actions.ts lib/decoration/configuration-actions.test.mjs
git commit -m "Improve decoration configuration actions"
```

---

### Task 3: Banquet-Matched Decoration Calendar and Status Palette

**Files:**
- Modify: `components/decoration/decoration-calendar.tsx`
- Modify: `components/decoration/decoration-workspace.tsx`
- Modify: `components/decoration/decoration-status-badge.tsx`
- Modify: `lib/decoration/calendar.ts`
- Modify: `lib/decoration/calendar.test.mjs`
- Modify: `lib/decoration/booking-view.ts`
- Modify: `lib/decoration/booking-view.test.mjs`
- Reference without modifying: banquet calendar/workspace components located by `rg -n "Hall Slot Status|selectedDate|calendar" app components`

**Interfaces:**
- Produces: `decorationStatusPresentation(status)` mapped to the banquet-equivalent card, badge, dot, and calendar indicator classes.
- Produces: month view retaining `selectedDate` and already-fetched `bookings` while child overlays open.

- [x] **Step 1: Capture banquet status and calendar contracts in failing tests**

Assert inquiry, confirmed, completed, closed, cancelled, and on-hold decoration statuses resolve to the same semantic palette tokens as banquet. Assert multi-day event placement and selected-date retention.

- [x] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types lib/decoration/calendar.test.mjs lib/decoration/booking-view.test.mjs`

Expected: FAIL on parity tokens and retained selection behavior.

- [x] **Step 3: Match the calendar structure without changing banquet code**

Copy only stable layout decisions: header hierarchy, month controls, Today action, weekday row, date-cell sizing, selected date, indicators, breakpoints, loading skeleton, empty state, and error Retry. Keep decoration queries and types.

- [x] **Step 4: Apply banquet-equivalent status presentation**

Centralize card/badge/dot colors so calendar, sidebar, and Event Detail cannot drift. Do not introduce a second hard-coded palette inside components.

- [x] **Step 5: Verify and commit**

Run: `node --test --experimental-strip-types lib/decoration/calendar.test.mjs lib/decoration/booking-view.test.mjs && npm run lint`

Expected: PASS.

```bash
git add components/decoration/decoration-calendar.tsx components/decoration/decoration-workspace.tsx components/decoration/decoration-status-badge.tsx lib/decoration
git commit -m "Match decoration calendar to banquet flow"
```

---

### Task 4: Retained Day Sidebar and Event Detail Overlay

**Files:**
- Modify: `components/decoration/decoration-day-sidebar.tsx`
- Modify: `components/decoration/decoration-workspace.tsx`
- Create: `components/decoration/decoration-event-detail-modal.tsx`
- Refactor: `app/(app)/decoration/event-detail/page.tsx`
- Modify: `lib/decoration/overlay-state.ts`
- Modify: `lib/decoration/overlay-state.test.mjs`
- Modify: `lib/decoration/booking-view.test.mjs`

**Interfaces:**
- Produces: `DecorationEventDetailModal({ bookingId, initialBooking, onClose, onUpdated })`.
- Produces: overlay states `CALENDAR`, `DAY`, `DETAIL`, and later `DETAIL_CHILD`; closing pops one state.
- Consumes: static-compatible `?date=YYYY-MM-DD&bookingId=<id>` only when URL hydration is required.

- [ ] **Step 1: Write failing overlay transition tests**

```js
assert.deepEqual(openDetail(dayState, 'booking-1'), { ...dayState, layer: 'DETAIL', bookingId: 'booking-1' });
assert.deepEqual(closeTopLayer(detailState), { ...dayState, layer: 'DAY', bookingId: null });
assert.deepEqual(closeTopLayer(dayState), calendarState);
```

Also assert an already-loaded day booking remains present while detail fetch is pending or fails.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types lib/decoration/overlay-state.test.mjs lib/decoration/booking-view.test.mjs`

Expected: FAIL because cards currently navigate to the standalone page.

- [ ] **Step 3: Extract Event Detail content into a reusable modal**

Keep the static page as a thin query-parameter host for direct links/refreshes. The workspace opens the same detail component locally. The modal shows decoration fields, finance, follow-ups, snapshot, and valid actions; no Hall Slot Status or menu snapshot.

- [ ] **Step 4: Replace card navigation with overlay opening**

Click and Enter/Space open detail. Closing restores focus to the originating card, preserves selected date and scroll, and does not refetch/clear the day list. Escape closes only the top layer; background scroll is locked.

- [ ] **Step 5: Match banquet sidebar dimensions and responsive behavior**

Desktop/tablet use the banquet-equivalent left drawer. Mobile uses a full-width panel. Add Inquiry inherits the selected date. Include loading skeleton, empty state, error message, and Retry without discarding cached records.

- [ ] **Step 6: Verify static navigation, focused tests, build, and commit**

Run: `node --test --experimental-strip-types lib/decoration/overlay-state.test.mjs lib/decoration/booking-view.test.mjs && npm run lint && npm run build`

Expected: tests PASS and all decoration routes export statically without dynamic ID paths.

```bash
git add components/decoration app/'(app)'/decoration/event-detail/page.tsx lib/decoration
git commit -m "Open decoration details over day sidebar"
```

---

### Task 5: Idempotent Decoration Confirmation with Optional Advance

**Files:**
- Modify: `../BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-bookings.controller.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.ts`
- Modify: `../BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.spec.ts`
- Create: `../BBS-BE/src/modules/decoration-bookings/decoration-confirmation.spec.ts`
- Modify: `../BBS-BE/src/scripts/migrate-decoration-bookings-indexes.ts`
- Modify: `lib/auth/types.ts`
- Modify: `lib/auth/api.ts`

**Interfaces:**
- Produces: `POST /decoration/bookings/:id/confirm` with body `{ requestId: string; advanceAmount: number; paymentDate?: string; paymentMode?: string; remark?: string }`.
- Returns: the updated `DecorationBooking` and `reused: boolean`.
- Persists: `confirmationRequestId` on the decoration booking with a tenant-scoped unique partial index.

- [ ] **Step 1: Write failing domain and service tests**

Cover: inquiry + zero advance confirms; positive advance appends one decoration payment; negative/malformed/over-package values fail; non-inquiry transition fails; same request ID returns the existing result; a different request ID cannot confirm the already-confirmed inquiry; restaurant A cannot confirm restaurant B; no banquet collection is accessed.

```ts
assert.deepEqual(validateDecorationConfirmation({ packageRate: 6000, collected: 0, advanceAmount: 0 }), { advanceAmount: 0 });
assert.throws(() => validateDecorationConfirmation({ packageRate: 6000, collected: 0, advanceAmount: -1 }));
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx ts-node src/modules/decoration-bookings/decoration-booking-domain.spec.ts && npx ts-node src/modules/decoration-bookings/decoration-confirmation.spec.ts`

Expected: FAIL because the atomic confirmation contract does not exist.

- [ ] **Step 3: Implement DTO, validation, persistence, and endpoint**

Accept zero advance. Require payment date/mode only when amount is greater than zero. Use one conditional `findOneAndUpdate` scoped by `_id`, `restaurantId`, and `status: INQUIRY`, setting confirmed fields and pushing a payment only for a positive amount. On no match, read by tenant: return `reused: true` only when `confirmationRequestId` matches; otherwise return conflict/not found appropriately.

- [ ] **Step 4: Add audit and index migration**

Write one confirmation audit record containing before/after decoration snapshots and request ID metadata. Add a unique partial index on `{ restaurantId: 1, confirmationRequestId: 1 }` where the ID exists. Do not add or modify indexes in banquet collections.

- [ ] **Step 5: Add typed frontend API**

```ts
confirmDecorationBooking(token, bookingId, payload: DecorationConfirmationPayload): Promise<DecorationConfirmationResult>
```

Only call `/decoration/bookings/${encodeURIComponent(bookingId)}/confirm`.

- [ ] **Step 6: Verify backend and commit**

Run: `npx ts-node src/modules/decoration-bookings/decoration-booking-domain.spec.ts && npx ts-node src/modules/decoration-bookings/decoration-confirmation.spec.ts && npm run lint && npm run build`

Expected: PASS; only the known pre-existing lint warning is acceptable.

```bash
git add src/modules/decoration-bookings src/scripts/migrate-decoration-bookings-indexes.ts
git commit -m "Confirm decoration inquiries idempotently"
```

```bash
git add lib/auth/api.ts lib/auth/types.ts
git commit -m "Add decoration confirmation client"
```

---

### Task 6: Banquet-Matched Confirm and Advance Popup

**Files:**
- Create: `components/decoration/decoration-confirmation-modal.tsx`
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-workspace.tsx`
- Create: `lib/decoration/confirmation-form.ts`
- Create: `lib/decoration/confirmation-form.test.mjs`
- Modify: `lib/decoration/overlay-state.test.mjs`

**Interfaces:**
- Produces: `buildDecorationConfirmationPayload(form, requestId)` and `validateDecorationConfirmationForm(form, packageRate, collected)`.
- Consumes: `confirmDecorationBooking` from Task 5.
- Produces: `onConfirmed(updatedBooking)` to update modal and cached calendar/day data in place.

- [ ] **Step 1: Write failing form and overlay tests**

Cover zero advance without payment fields, positive advance requiring date/mode, over-limit rejection, stable request ID across retry, double-submit disabling, child close returning to detail, and successful confirmation updating cached detail/card.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --experimental-strip-types lib/decoration/confirmation-form.test.mjs lib/decoration/overlay-state.test.mjs`

Expected: FAIL because the confirmation UI/domain helpers do not exist.

- [ ] **Step 3: Build the banquet-matched popup**

Show package, already received, advance, pending preview, date, payment mode, and remark. Hide or disable payment-only fields when advance is zero. Generate one `crypto.randomUUID()` when the popup opens and reuse it for retries until success or explicit close.

- [ ] **Step 4: Integrate Confirm Booking into inquiry details**

Render only for `INQUIRY`. Open above Event Detail. On success replace the booking in detail and workspace cache, keep detail open, show confirmed colors, update finance, and expose Choose Decoration. On error retain values and show an actionable message.

- [ ] **Step 5: Verify and commit**

Run: `node --test --experimental-strip-types lib/decoration/confirmation-form.test.mjs lib/decoration/overlay-state.test.mjs lib/decoration/booking-view.test.mjs && npm run lint && npm run build`

Expected: PASS and static export succeeds.

```bash
git add components/decoration lib/decoration
git commit -m "Add decoration inquiry confirmation popup"
```

---

### Task 7: Full Regression, Migration Verification, and Manual Responsive Gate

**Files:**
- Modify: this plan, checking completed steps only after evidence exists.

**Interfaces:**
- Produces: release evidence for backend, frontend, migration, static export, isolation, slow-network, and responsive behavior.

- [ ] **Step 1: Run all decoration backend specifications**

Run every `src/modules/decoration*/**/*.spec.ts` and decoration migration spec with `npx ts-node`, then run `npm run lint && npm run build` in `BBS-BE`.

Expected: every spec exits `0`; backend builds; no new lint warning.

- [ ] **Step 2: Run all decoration frontend tests and static build**

Run: `node --test --experimental-strip-types lib/decoration/*.test.mjs && npm run lint && npm run build`

Expected: all tests PASS; static routes export; no new lint warning.

- [ ] **Step 3: Verify migration safely**

Run event-type order migration in dry-run, apply it to the intended environment only after reviewing counts, rerun dry-run expecting zero invalid/duplicate/pending records, and verify the tenant-scoped unique index exists.

- [ ] **Step 4: Verify banquet isolation**

Run existing banquet booking/inquiry/calendar/advance focused regression suites. Inspect confirmation logs/database changes to verify only `decoration_bookings` and shared audit logs changed. Confirm no request targets `/orders` or `/odc/orders`.

- [ ] **Step 5: Manually verify overlay and responsive flows**

At mobile, tablet, and desktop widths verify: readable settings actions; first order is 1; date opens sidebar; status colors match banquet; card opens modal; close returns one level; Confirm opens advance popup; zero and positive advance succeed; retry does not duplicate; slow detail request retains the day card; direct query-string refresh works.

- [ ] **Step 6: Commit checklist evidence**

```bash
git add docs/superpowers/plans/2026-07-17-decoration-calendar-confirmation-parity.md
git commit -m "Complete decoration calendar confirmation parity"
```
