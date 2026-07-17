# Event Decoration Workflow Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decoration dashboard, Events, inquiry, Event Detail, advances, and Follow-ups scaffolds with production workflows that match the banquet module's visual and navigation quality while keeping decoration data and APIs isolated.

**Architecture:** Build focused decoration components around a small overlay-state controller, shared decoration view models, and existing common modal/loading primitives. Extend only decoration backend contracts where the approved workflow needs missing behavior; do not refactor or import the banquet booking monolith. Keep static deployment compatibility by using query-string identifiers.

**Tech Stack:** Next.js 16 static routes, React 19, TypeScript, Tailwind CSS, Node test runner, NestJS 11, Mongoose 8, class-validator, existing RBAC/audit infrastructure.

## Global Constraints

- Follow the approved specification at `apps/BBS-FE/docs/superpowers/specs/2026-07-17-decoration-workflow-parity-design.md`.
- A company has exactly one business type; decoration data never uses banquet collections or APIs.
- Existing banquet pages and behavior must not be changed by this work.
- Entity identifiers use query-string parameters, never dynamic route segments.
- Closing a child overlay returns to Event Detail; closing Event Detail returns to the originating date sidebar; closing the sidebar returns to the calendar.
- Preserve selected month, date, filters, loaded rows, scroll position, and parent overlay state.
- Send only changed fields for Edit Inquiry.
- Use Asia/Kolkata business-date boundaries consistently.
- Every task follows red-green-refactor, includes mobile/tablet/desktop behavior, and ends with a scoped commit.
- Do not mark a task complete until its targeted tests, lint, and relevant production build pass.

## File Structure

### Frontend files to create

- `lib/decoration/booking-view.ts` — formatting, status metadata, date intersection, payment/follow-up derivation.
- `lib/decoration/overlay-state.ts` — deterministic calendar/sidebar/detail/child overlay transitions.
- `components/decoration/decoration-page-state.tsx` — loading, empty, error, and retry surfaces.
- `components/decoration/decoration-status-badge.tsx` — status badge and legend presentation.
- `components/decoration/decoration-dashboard.tsx` — dashboard metrics and actionable lists.
- `components/decoration/decoration-calendar.tsx` — month calendar without banquet hall matrix.
- `components/decoration/decoration-day-sidebar.tsx` — selected-date event drawer.
- `components/decoration/decoration-inquiry-form.tsx` — add/edit form and inline configuration flows.
- `components/decoration/decoration-event-detail.tsx` — complete detail and action surface.
- `components/decoration/decoration-advance-modal.tsx` — validated advance entry.
- `components/decoration/decoration-followup-modal.tsx` — add/edit/reschedule/complete follow-ups.
- `components/decoration/decoration-followup-calendar.tsx` — follow-up month and date sidebar.
- `components/decoration/decoration-workspace.tsx` — owns overlay state and refresh reconciliation.

### Frontend files to modify

- `app/(app)/decoration/dashboard/page.tsx`
- `app/(app)/decoration/events/page.tsx`
- `app/(app)/decoration/event-detail/page.tsx`
- `app/(app)/decoration/followups/page.tsx`
- `app/(app)/decoration/selection/page.tsx`
- `app/(app)/decoration/print/page.tsx`
- `components/decoration/decoration-snapshot-gallery.tsx`
- `lib/auth/api.ts`
- `lib/auth/types.ts`

### Backend files to modify/create

- `apps/BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.controller.ts`
- `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- `apps/BBS-BE/src/modules/decoration-bookings/decoration-operations.controller.ts`
- `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.ts`
- `apps/BBS-BE/src/scripts/migrate-decoration-followups.ts`
- `apps/BBS-BE/package.json`

---

### Task 1: Decoration view models, status presentation, and overlay state

**Files:**
- Create: `apps/BBS-FE/lib/decoration/booking-view.ts`
- Create: `apps/BBS-FE/lib/decoration/booking-view.test.mjs`
- Create: `apps/BBS-FE/lib/decoration/overlay-state.ts`
- Create: `apps/BBS-FE/lib/decoration/overlay-state.test.mjs`
- Create: `apps/BBS-FE/components/decoration/decoration-status-badge.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-page-state.tsx`

**Interfaces:**
- Produces `DecorationOverlayState`, `decorationOverlayReducer`, `DecorationStatusMeta`, `getDecorationStatusMeta`, `getDecorationPaymentState`, `getLatestDecorationFollowup`, and `bookingIntersectsDate`.
- Consumed by every later frontend task.

- [x] **Step 1: Write failing booking-view tests**

```js
test('derives partial payment and the latest pending follow-up', () => {
  const booking = fixture({
    packageRate: 100000,
    totalCollected: 25000,
    followups: [
      { _id: '1', date: '2026-07-10', nextDate: '2026-07-18', note: 'Call', status: 'PENDING' },
      { _id: '2', date: '2026-07-11', nextDate: null, note: 'Done', status: 'COMPLETED' },
    ],
  });
  assert.equal(getDecorationPaymentState(booking), 'PARTIAL');
  assert.equal(getLatestDecorationFollowup(booking)?.id, '1');
});

test('uses inclusive Asia/Kolkata business dates for multi-day events', () => {
  assert.equal(bookingIntersectsDate(fixture({ startDate: '2026-07-17', endDate: '2026-07-19' }), '2026-07-18'), true);
});
```

- [x] **Step 2: Run booking-view tests and verify missing exports fail**

Run: `cd apps/BBS-FE && node --test --experimental-strip-types lib/decoration/booking-view.test.mjs`

Expected: FAIL because `booking-view.ts` does not exist.

- [x] **Step 3: Implement typed view helpers and complete status metadata**

```ts
export type DecorationPaymentState = 'PAID' | 'PARTIAL' | 'UNPAID';
export type DecorationStatusMeta = { label: string; dotClass: string; badgeClass: string };

export function getDecorationPaymentState(booking: DecorationBooking): DecorationPaymentState {
  if (booking.outstandingAmount <= 0) return 'PAID';
  return booking.totalCollected > 0 ? 'PARTIAL' : 'UNPAID';
}

export function bookingIntersectsDate(booking: DecorationBooking, date: string): boolean {
  return toDateKey(booking.startDate) <= date && toDateKey(booking.endDate) >= date;
}
```

Define explicit labels/classes for all eight `DecorationBookingStatus` values. Normalize embedded `_id` to `id` at the frontend type boundary.

- [x] **Step 4: Write failing overlay transition tests**

```js
test('closes one overlay level at a time', () => {
  let state = initialDecorationOverlayState;
  state = decorationOverlayReducer(state, { type: 'OPEN_DAY', date: '2026-07-17' });
  state = decorationOverlayReducer(state, { type: 'OPEN_DETAIL', bookingId: 'b1' });
  state = decorationOverlayReducer(state, { type: 'OPEN_CHILD', child: 'ADVANCE' });
  state = decorationOverlayReducer(state, { type: 'CLOSE_TOP' });
  assert.equal(state.child, null);
  assert.equal(state.bookingId, 'b1');
  state = decorationOverlayReducer(state, { type: 'CLOSE_TOP' });
  assert.equal(state.bookingId, null);
  assert.equal(state.date, '2026-07-17');
});
```

- [x] **Step 5: Implement the reducer without component-local boolean combinations**

```ts
export type DecorationChildOverlay = 'ADD' | 'EDIT' | 'ADVANCE' | 'FOLLOWUP' | 'SELECTION' | 'PRINT';
export type DecorationOverlayState = {
  date: string | null;
  bookingId: string | null;
  child: DecorationChildOverlay | null;
  origin: 'EVENTS' | 'FOLLOWUPS' | 'DASHBOARD';
};
```

`CLOSE_TOP` clears `child`, then `bookingId`, then `date`. `OPEN_DETAIL` never clears the parent date. `OPEN_CHILD` requires a selected booking except for `ADD`.

- [x] **Step 6: Add status, loading, empty, and retry primitives**

Match banquet border radii, slate typography, amber primary actions, readable contrast, and shared `PageLoader` behavior. No screen may render invisible white text or a blank loading region.

- [x] **Step 7: Run tests, lint, build, and commit**

```bash
cd apps/BBS-FE
node --test --experimental-strip-types lib/decoration/booking-view.test.mjs lib/decoration/overlay-state.test.mjs
npm run lint
npm run build
git add lib/decoration components/decoration/decoration-status-badge.tsx components/decoration/decoration-page-state.tsx
git commit -m "Add decoration workflow view foundation"
```

### Task 2: Backend detail contract, partial updates, follow-up lifecycle, and dashboard data

**Files:**
- Create: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.ts`
- Create: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.spec.ts`
- Modify: booking schema, DTO, controller, service, and operations controller listed above
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-followups.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces `DecorationBookingUpdateDto`, `DecorationFollowupUpdateDto`, `PATCH /decoration/bookings/:id/followups/:followupId`, and an enriched dashboard response.
- Existing endpoints remain backward compatible.

- [ ] **Step 1: Write failing domain tests for partial update merging and follow-up transitions**

```ts
assert.deepEqual(
  mergeDecorationBookingPatch(existing, { notes: 'Updated only' }),
  { ...existing, notes: 'Updated only' },
);
assert.equal(
  applyDecorationFollowupPatch(pending, { status: 'COMPLETED' }, now).completedAt,
  now,
);
assert.throws(
  () => applyDecorationFollowupPatch(completed, { status: 'PENDING' }, now),
  /Completed follow-up cannot be reopened/,
);
```

- [ ] **Step 2: Run the domain test and verify failure**

Run: `cd apps/BBS-BE && node -r ts-node/register src/modules/decoration-bookings/decoration-booking-view.spec.ts`

- [ ] **Step 3: Add backward-compatible follow-up fields**

```ts
export enum DecorationFollowupStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

class Followup {
  @Prop({ enum: DecorationFollowupStatus, default: DecorationFollowupStatus.PENDING })
  status!: DecorationFollowupStatus;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
  @Prop({ type: String, default: null }) completedBy!: string | null;
}
```

Map legacy embedded follow-ups with missing `status` as `PENDING` until migration completes.

- [ ] **Step 4: Add an optional update DTO and exact patch semantics**

`DecorationBookingUpdateDto` declares every editable booking property optional with the same validators as create. The service merges the patch with the stored booking, validates the complete merged record, resolves event type/venue/hall only when their effective IDs change, and audits before/after snapshots. Reject empty patches and immutable fields.

- [ ] **Step 5: Add follow-up update/complete API**

```ts
export class DecorationFollowupUpdateDto {
  @IsOptional() @ValidateIf((_object, value) => value !== null) @IsDateString()
  nextDate?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsEnum(DecorationFollowupStatus) status?: DecorationFollowupStatus;
}

@Patch(':id/followups/:followupId')
@Permissions(PERMISSIONS.DECORATION_FOLLOWUPS_MANAGE)
updateFollowup(/* tenant-scoped booking and embedded id */) {}
```

Use atomic tenant-scoped lookup, reject unknown IDs, prevent edits on cancelled/closed inquiries where the domain disallows them, and audit add/edit/complete separately.

- [ ] **Step 6: Enrich booking and dashboard responses**

Booking responses include `createdBySnapshot`, `createdAt`, `updatedAt`, normalized follow-up IDs/status/completion, cancellation reason, and selection timestamps. Dashboard adds bounded arrays (`limit: 8`) for upcoming events and follow-up priorities plus counts for selection pending, inventory conflicts, and maintenance. Use indexed tenant/date queries and do not return unbounded collections.

- [ ] **Step 7: Add and test the idempotent migration**

Add `migrate:decoration-followups` to `package.json`. The script supports `--dry-run`, reports before/after counts, sets missing embedded status to `PENDING`, never rewrites existing statuses, and aborts on invalid values.

Run:

```bash
cd apps/BBS-BE
npm run migrate:decoration-followups -- --dry-run
node -r ts-node/register src/modules/decoration-bookings/decoration-booking-view.spec.ts
npm run lint
npm run build
```

- [ ] **Step 8: Commit backend contract changes**

```bash
git add src/modules/decoration-bookings src/scripts/migrate-decoration-followups.ts package.json
git commit -m "Expand decoration workflow contracts"
```

### Task 3: Production decoration dashboard

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-dashboard.tsx`
- Create: `apps/BBS-FE/lib/decoration/dashboard-view.ts`
- Create: `apps/BBS-FE/lib/decoration/dashboard-view.test.mjs`
- Replace: `apps/BBS-FE/app/(app)/decoration/dashboard/page.tsx`
- Modify: `apps/BBS-FE/lib/auth/api.ts`, `apps/BBS-FE/lib/auth/types.ts`

**Interfaces:**
- Consumes the enriched `/decoration/operations/dashboard` response.
- Produces query-string links such as `/decoration/events?status=INQUIRY` and `/decoration/event-detail?id=<encoded-id>&origin=dashboard`.

- [ ] **Step 1: Test dashboard normalization and action links**

```js
test('maps open inquiries to the filtered Events route', () => {
  const cards = buildDecorationDashboardCards(fixture);
  assert.equal(cards.find((card) => card.id === 'open-inquiries').href, '/decoration/events?status=INQUIRY');
});
```

- [ ] **Step 2: Implement dashboard view models and updated API types**

Use typed metrics for today, upcoming, inquiries, follow-ups, received, outstanding, selection pending, conflicts, and maintenance. Currency uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

- [ ] **Step 3: Build the dashboard to match banquet page structure**

Use a page header, responsive metric cards, two actionable list panels, and lower summary panels. Provide skeleton, no-data, error, and retry states. Do not embed the Events calendar on Dashboard.

- [ ] **Step 4: Test slow/error/empty states and responsive breakpoints**

At 390px cards stack without horizontal overflow; at 768px use two columns; at 1440px use the full metric grid. Existing loaded data remains visible while refreshing.

- [ ] **Step 5: Verify and commit**

```bash
cd apps/BBS-FE
node --test --experimental-strip-types lib/decoration/dashboard-view.test.mjs
npm run lint
npm run build
git add app/\(app\)/decoration/dashboard components/decoration/decoration-dashboard.tsx lib/decoration/dashboard-view* lib/auth
git commit -m "Build production decoration dashboard"
```

### Task 4: Events calendar and selected-date sidebar

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-calendar.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-day-sidebar.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-workspace.tsx`
- Extend: `apps/BBS-FE/lib/decoration/calendar.ts`, `calendar.test.mjs`
- Replace: `apps/BBS-FE/app/(app)/decoration/events/page.tsx`

**Interfaces:**
- Consumes `fetchDecorationCalendar(token, year, month)` once per visible month.
- Produces `onOpenDay(date)`, `onAdd(date?)`, and `onOpenBooking(id)` callbacks.

- [ ] **Step 1: Add failing tests for inclusive multi-day grouping, sorting, status counts, and race protection**

```js
test('sorts selected-day events by slot start then customer name', () => {
  assert.deepEqual(getDecorationDayBookings(rows, '2026-07-17').map((row) => row.id), ['morning', 'evening']);
});
```

- [ ] **Step 2: Implement pure calendar/day selectors**

Never fetch separate sidebar data. Derive the selected-date rows from the month response and include multi-day bookings intersecting adjacent dates returned by the backend calendar range.

- [ ] **Step 3: Build the banquet-equivalent calendar**

Include month arrows, Today, status legend, per-date count, up to three visible event chips, overflow count, keyboard date activation, and stable calendar cell heights. Exclude Hall Slot Status entirely.

- [ ] **Step 4: Build responsive date sidebar cards**

Desktop/tablet: fixed left drawer with banquet-equivalent header and width. Mobile: full-width sheet. Cards show customer, function, venue/hall, time slot, status, package, received, and outstanding. Header contains date, count, close, and Add Inquiry.

- [ ] **Step 5: Connect overlay reducer and refresh reconciliation**

After create/edit/payment/follow-up/status/selection success, replace the updated booking in the in-memory month list by ID. Trigger background revalidation without clearing the sidebar or detail state. Ignore stale month responses using an incrementing request ID or `AbortController`.

- [ ] **Step 6: Verify and commit**

```bash
node --test --experimental-strip-types lib/decoration/calendar.test.mjs lib/decoration/overlay-state.test.mjs
npm run lint
npm run build
git add app/\(app\)/decoration/events components/decoration/decoration-calendar.tsx components/decoration/decoration-day-sidebar.tsx components/decoration/decoration-workspace.tsx lib/decoration
git commit -m "Add decoration calendar and day sidebar"
```

### Task 5: Production Add/Edit Inquiry workflow

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-inquiry-form.tsx`
- Create: `apps/BBS-FE/lib/decoration/inquiry-form.ts`
- Create: `apps/BBS-FE/lib/decoration/inquiry-form.test.mjs`
- Modify: Events workspace and `lib/auth/api.ts`

**Interfaces:**
- Produces `DecorationInquiryValues`, `validateDecorationInquiry`, and `buildDecorationBookingPatch`.
- `onSaved(booking)` updates the workspace without closing its parent date sidebar.

- [ ] **Step 1: Test validation and changed-field payloads**

```js
test('sends only changed editable values', () => {
  assert.deepEqual(
    buildDecorationBookingPatch(original, { ...original, notes: 'New note' }),
    { notes: 'New note' },
  );
});

test('rejects an end date before start date', () => {
  assert.equal(validateDecorationInquiry({ ...valid, startDate: '2026-07-18', endDate: '2026-07-17' }).endDate, 'End date cannot be before start date');
});
```

- [ ] **Step 2: Build the responsive form**

Use labelled controls for customer, mobile, event type, venue, conditional hall, address, function, slot, start/end dates, package rate, and notes. Default end date to start date only until the user edits end date. Preserve entered values when configuration requests fail.

- [ ] **Step 3: Add permission-controlled inline configuration**

Use existing `createDecorationEventType`, `createDecorationVenue`, and `addDecorationHall`. Normalize and validate names, show duplicate API errors inline, refresh only the affected options, and select the created value. Users lacking `decoration.configuration.manage` never see add controls.

- [ ] **Step 4: Prevent duplicate submission and unsafe close**

Disable Save while pending. On dirty close, show the existing confirmation modal. API field errors remain visible; successful save resets only after the parent workspace accepts the returned booking.

- [ ] **Step 5: Verify add from header and selected-date sidebar**

When opened from a date, prefill both dates with that date. On success, keep the day sidebar open and show the new inquiry immediately.

- [ ] **Step 6: Test, build, and commit**

```bash
node --test --experimental-strip-types lib/decoration/inquiry-form.test.mjs
npm run lint
npm run build
git add components/decoration/decoration-inquiry-form.tsx lib/decoration/inquiry-form* app/\(app\)/decoration/events lib/auth/api.ts
git commit -m "Build decoration inquiry workflow"
```

### Task 6: Complete Event Detail and status workflow

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-event-detail.tsx`
- Create: `apps/BBS-FE/lib/decoration/status-actions.ts`
- Create: `apps/BBS-FE/lib/decoration/status-actions.test.mjs`
- Replace: `apps/BBS-FE/app/(app)/decoration/event-detail/page.tsx`
- Integrate: `decoration-workspace.tsx`

**Interfaces:**
- `DecorationEventDetailProps` includes `booking`, `onClose`, `onOpenChild`, `onStatusChanged`, and permission booleans.
- Static route reads `id` and `origin` with `useSearchParams`.

- [ ] **Step 1: Test status-action visibility and permission boundaries**

```js
test('confirmed booking permits selection but not completion before selection', () => {
  const actions = getDecorationStatusActions('CONFIRMED', adminPermissions);
  assert.equal(actions.some((action) => action.id === 'selection'), true);
  assert.equal(actions.some((action) => action.nextStatus === 'COMPLETED'), false);
});
```

- [ ] **Step 2: Implement full information hierarchy**

Render customer/call action, event and venue, dates/time, status/creator, package/received/outstanding, payments, follow-ups, notes, cancellation reason, and decoration snapshot. Use explicit empty states for no payments, no follow-ups, and no selection.

- [ ] **Step 3: Add permission-aware actions and confirmation dialogs**

Actions: Edit Inquiry, Confirm, Close Inquiry, Cancel, Complete, Add Advance, Add Follow-up, Choose/Edit Decoration, View, Download, Print. Never use `prompt()`. Require reasons where the API/domain requires them.

- [ ] **Step 4: Implement query-string standalone behavior**

`/decoration/event-detail?id=<id>&origin=events&date=2026-07-17` fetches the record and closes back to `/decoration/events?date=2026-07-17`. Within workspace overlays, it calls `CLOSE_TOP` and preserves the sidebar.

- [ ] **Step 5: Verify and commit**

```bash
node --test --experimental-strip-types lib/decoration/status-actions.test.mjs lib/decoration/overlay-state.test.mjs
npm run lint
npm run build
git add components/decoration/decoration-event-detail.tsx lib/decoration/status-actions* app/\(app\)/decoration/event-detail components/decoration/decoration-workspace.tsx
git commit -m "Build complete decoration event detail"
```

### Task 7: Advance-payment workflow

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-advance-modal.tsx`
- Create: `apps/BBS-FE/lib/decoration/advance-form.ts`
- Create: `apps/BBS-FE/lib/decoration/advance-form.test.mjs`
- Modify: Event Detail and workspace

**Interfaces:**
- Consumes `addDecorationPayment`.
- Produces a validated `{ amount, mode, date, remark? }` payload and returns the updated booking.

- [ ] **Step 1: Test amount/date/mode validation**

```js
test('rejects payment greater than outstanding amount', () => {
  assert.equal(validateDecorationAdvance({ amount: '75001', mode: 'Cash', date: '2026-07-17' }, 75000).amount, 'Amount cannot exceed ₹75,000');
});
```

- [ ] **Step 2: Build banquet-equivalent advance modal**

Show package, already received, outstanding, amount, payment mode, date, reference/remark, and payment history. Default date to the current India business date. Disable submit while saving.

- [ ] **Step 3: Reconcile all visible totals without losing overlay state**

Replace the returned booking in Event Detail and month data, close only Advance, retain Event Detail, then revalidate dashboard/report data in the background.

- [ ] **Step 4: Verify error and double-click behavior**

Network/backend rejection retains entered values and Event Detail. Two rapid clicks cause one request.

- [ ] **Step 5: Test, build, and commit**

```bash
node --test --experimental-strip-types lib/decoration/advance-form.test.mjs
npm run lint
npm run build
git add components/decoration/decoration-advance-modal.tsx components/decoration/decoration-event-detail.tsx components/decoration/decoration-workspace.tsx lib/decoration/advance-form*
git commit -m "Add decoration advance workflow"
```

### Task 8: Follow-up calendar and management

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-followup-modal.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-followup-calendar.tsx`
- Create: `apps/BBS-FE/lib/decoration/followup-view.ts`
- Create: `apps/BBS-FE/lib/decoration/followup-view.test.mjs`
- Replace: `apps/BBS-FE/app/(app)/decoration/followups/page.tsx`
- Modify: `apps/BBS-FE/lib/auth/api.ts`, `types.ts`, Event Detail, workspace

**Interfaces:**
- Adds frontend client `updateDecorationFollowup(token, bookingId, followupId, patch)`.
- Produces calendar groups `DUE`, `OVERDUE`, `UPCOMING`, and `COMPLETED`.

- [ ] **Step 1: Test India-date grouping and status filters**

```js
test('groups an unfinished past nextDate as overdue', () => {
  const groups = groupDecorationFollowups([fixture], '2026-07-17');
  assert.equal(groups.OVERDUE[0].followupId, 'f1');
});
```

- [ ] **Step 2: Implement typed follow-up API and normalized types**

Include ID, recorded date, next date, note, recorder, status, completedAt, and completedBy. Never infer completed status solely from a null next date.

- [ ] **Step 3: Build the monthly follow-up calendar and date sidebar**

Match banquet calendar and left drawer behavior. Cards show customer/call, function, event date, venue, booking status, due state, recorder, and note. Add filter controls for due/overdue/upcoming/completed.

- [ ] **Step 4: Build add/edit/reschedule/complete modal**

Use labelled date, next-date, note, and completion controls. Validate chronology. Closing returns to Event Detail or follow-up day sidebar according to origin.

- [ ] **Step 5: Verify permissions and navigation stack**

Employees lacking `decoration.followups.manage` can view only if they have booking view permission and cannot mutate. Detail close restores the exact follow-up date and filter.

- [ ] **Step 6: Test, build, and commit**

```bash
node --test --experimental-strip-types lib/decoration/followup-view.test.mjs lib/decoration/overlay-state.test.mjs
npm run lint
npm run build
git add app/\(app\)/decoration/followups components/decoration/decoration-followup-* lib/decoration/followup-view* lib/auth components/decoration/decoration-event-detail.tsx
git commit -m "Build decoration followup management"
```

### Task 9: Decoration selection, snapshot, view/download/print integration

**Files:**
- Modify: `apps/BBS-FE/app/(app)/decoration/selection/page.tsx`
- Modify: `apps/BBS-FE/app/(app)/decoration/print/page.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-snapshot-gallery.tsx`
- Modify: Event Detail and workspace
- Extend: `apps/BBS-FE/lib/decoration/snapshot-view.test.mjs`

**Interfaces:**
- Selection route uses `?bookingId=<id>&returnTo=detail`.
- Successful save returns/reloads the updated booking snapshot without discarding Event Detail.

- [ ] **Step 1: Add failing tests for grouped snapshot order and image fallback**

Assert category display ordering, custom-item grouping, quantity/description preservation, and fallback text when URL loading fails.

- [ ] **Step 2: Connect selection to overlay/query-string parent state**

Within the workspace, selection is a child overlay. Standalone static navigation encodes booking ID and return origin in query parameters. Cancel returns without mutation; save refreshes booking and returns to detail.

- [ ] **Step 3: Complete Event Detail snapshot actions**

Show Choose Decoration for confirmed/pending bookings and Edit Decoration for selected bookings. Render the full grouped snapshot inline, plus View, Download, and Print actions.

- [ ] **Step 4: Harden printable output**

Print customer/event/venue/financial information and category-grouped decoration images, quantities, and descriptions. Wait for images or render explicit fallback before invoking print. Preserve existing static `/decoration/print?bookingId=` routing.

- [ ] **Step 5: Test, build, and commit**

```bash
node --test --experimental-strip-types lib/decoration/snapshot-view.test.mjs lib/decoration/overlay-state.test.mjs
npm run lint
npm run build
git add app/\(app\)/decoration/selection app/\(app\)/decoration/print components/decoration lib/decoration/snapshot-view*
git commit -m "Integrate decoration selection and output"
```

### Task 10: End-to-end parity, accessibility, slow-network, and banquet regression

**Files:**
- Create: `apps/BBS-FE/playwright.config.ts`
- Create: `apps/BBS-FE/e2e/helpers/decoration-auth.ts`
- Create: `apps/BBS-FE/e2e/decoration-workflow.spec.ts`
- Create: `apps/BBS-FE/e2e/decoration-responsive.spec.ts`
- Create: `apps/BBS-FE/e2e/decoration-slow-network.spec.ts`
- Modify: `apps/BBS-FE/package.json`
- Modify: `apps/BBS-FE/package-lock.json`
- Update: this plan checklist as scenarios pass

**Interfaces:**
- Tests use the pilot decoration account from environment variables, never hard-coded credentials.
- Tests do not mutate banquet production-like fixtures outside their own test records.

- [ ] **Step 1: Install and configure the E2E runner**

Run:

```bash
cd apps/BBS-FE
npm install --save-dev @playwright/test
npx playwright install chromium
```

Add scripts `test:e2e:decoration` and `test:e2e:decoration:headed`. Configure `baseURL` from `E2E_BASE_URL ?? 'http://localhost:3000'`, Chromium only, trace on first retry, screenshots on failure, and no automatic reuse of production credentials. The auth helper must throw a clear startup error when either credential environment variable is absent.

- [ ] **Step 2: Write the complete happy-path E2E test**

```ts
test('calendar inquiry detail advance followup selection back-stack', async ({ page }) => {
  await loginAsDecorationAdmin(page, {
    email: requiredEnv('E2E_DECORATION_EMAIL'),
    password: requiredEnv('E2E_DECORATION_PASSWORD'),
  });
  await page.goto('/decoration/events');
  await createDecorationInquiry(page, uniqueFixture());
  await expect(page.getByRole('complementary')).toContainText(fixture.customerName);
  await openEventDetail(page, fixture.customerName);
  await addAdvance(page, 1000);
  await expect(page.getByRole('dialog', { name: 'Event Detail' })).toBeVisible();
  await addFollowup(page, indiaToday());
  await expect(page.getByRole('dialog', { name: 'Event Detail' })).toBeVisible();
});
```

- [ ] **Step 3: Cover error and worst-case scenarios**

Test invalid mobile/date/amount, duplicate inline configuration, API 401/403/409/500, offline retry, stale month response, double submit, cancel confirmation, selection conflict, failed image, empty calendar, and records spanning month boundaries.

- [ ] **Step 4: Cover overlay navigation exactly**

For Edit, Advance, Follow-up, Selection, and Print/View: close child → detail visible; close detail → original sidebar visible; close sidebar → calendar visible. Repeat from Events, Follow-ups, and Dashboard origins.

- [ ] **Step 5: Cover viewport and accessibility matrices**

Run at 390x844, 768x1024, and 1440x900. Assert no horizontal overflow, touch target visibility, topmost Escape behavior, focus restoration, labelled inputs, dialog names, and readable non-transparent text.

- [ ] **Step 6: Run backend regression**

```bash
cd apps/BBS-BE
node -r ts-node/register src/modules/decoration-bookings/decoration-booking-view.spec.ts
npm run lint
npm run build
```

Run the existing decoration reservation, import, report, audit, configuration, catalog, and guard test commands documented by their spec files.

- [ ] **Step 7: Run frontend regression and static production build**

```bash
cd apps/BBS-FE
node --test --experimental-strip-types lib/auth/business-routes.test.mjs lib/bookings/day-sidebar-orders.test.mjs lib/decoration/*.test.mjs
npm run lint
npm run build
```

- [ ] **Step 8: Run E2E and manually reconcile source data**

```bash
npm run test:e2e:decoration
```

Confirm one created inquiry appears on all covered calendar dates, Event Detail totals equal payment history, follow-up counts equal embedded records, and selected inventory matches the snapshot/reservations.

- [ ] **Step 9: Commit final regression coverage**

```bash
git add e2e playwright.config.ts package.json package-lock.json docs/superpowers/plans/2026-07-17-decoration-workflow-parity.md
git commit -m "Complete decoration workflow parity"
```

## Completion Gate

Do not mark this plan complete until:

- All ten task commits exist in the correct backend/frontend repositories.
- The follow-up migration dry-run and real migration counts reconcile.
- Backend lint/build and all relevant decoration tests pass.
- Frontend unit tests, lint, and static build pass.
- E2E passes at mobile, tablet, and desktop sizes.
- The complete overlay back-stack passes from Events and Follow-ups.
- A manual slow-network pass shows deliberate loaders and no blank/faded pages.
- The existing banquet dashboard, bookings/calendar, inquiry, Event Detail, advance, follow-up, menu, hall, print, and reports flows remain unchanged.
