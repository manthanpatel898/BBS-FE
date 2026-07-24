# Event Confirmation, Hot Dates, and Follow-up Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add banquet-style create-and-confirm, event-owned Hot Dates, immediate inquiry follow-ups, and follow-up completion dashboard behavior exclusively to the event-decoration module while removing Event Detail Share.

**Architecture:** Event data remains in decoration-specific collections and endpoints guarded by `EVENT_DECORATION`. Pure follow-up projections define one rule for workspace and dashboard consumers; shared Hot Date presentation receives an explicit API adapter. Confirmed creation is a single idempotent MongoDB insert containing status and optional payment, avoiding partial inquiries and replica-set transaction requirements.

**Tech Stack:** NestJS 11, Mongoose 8, class-validator, Next.js 16 static export, React 19, TypeScript, Node test runner through `ts-node`/`tsx`, CSV/XLSX spreadsheet utilities.

## Global Constraints

- Modify only event-decoration behavior unless extracting a presentation-only adapter with unchanged banquet defaults.
- Keep banquet booking, Hot Dates, follow-up, dashboard, settings, and document behavior unchanged.
- Store event Hot Dates in `decoration_hot_dates`, never `hot_dates`.
- Use `/decoration/hot-dates` for every event Hot Date request.
- Preserve static routes and query-string overlay navigation.
- Use India business-date keys for event follow-up and calendar comparisons.
- Mobile is the primary layout; no page-level horizontal scrolling.
- Every production change follows a red-green test cycle and a focused commit.

---

### Task 1: Centralize event follow-up action projection

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts`
- Modify: `apps/BBS-FE/lib/decoration/followups.ts`
- Modify: `apps/BBS-FE/lib/decoration/followups.test.mjs`

**Interfaces:**
- Produces backend `buildDecorationFollowupProjection(bookings, todayKey)` returning `requiredCount`, `takenTodayCount`, `dueTotalToday`, and classified entries.
- Produces frontend `buildDecorationFollowupSchedule(bookings, todayKey)` with no-follow-up inquiries assigned to `todayKey`.
- Consumed by Tasks 7 and 8.

- [ ] **Step 1: Write failing backend projection tests**

Add cases asserting:

```ts
const result = buildDecorationFollowupProjection([
  inquiry({ id: "new", startDate: "2026-08-20", followups: [] }),
  inquiry({ id: "taken", startDate: "2026-08-20", followups: [
    followup({ date: "2026-07-24", nextDate: "2026-07-30" }),
  ] }),
  inquiry({ id: "scheduled", startDate: "2026-08-20", followups: [
    followup({ date: "2026-07-23", nextDate: "2026-07-30" }),
  ] }),
], "2026-07-24");

assert.equal(result.requiredCount, 1);
assert.equal(result.takenTodayCount, 1);
assert.equal(result.dueTotalToday, 2);
assert.deepEqual(
  result.entries.filter((entry) => entry.state !== "SCHEDULED").map((entry) => entry.booking.id),
  ["new", "taken"],
);
```

Also assert confirmed, cancelled, completed, closed, and past-event records are excluded, and a latest completed follow-up does not revive an older pending record.

- [ ] **Step 2: Run backend test and verify RED**

Run:

```bash
cd apps/BBS-BE
node -r ts-node/register src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts
```

Expected: failure because the three new count fields and finalized latest-follow-up behavior are absent.

- [ ] **Step 3: Implement the backend projection**

Use one latest-follow-up selector and return:

```ts
return {
  requiredCount: entries.filter(({ state }) =>
    state === "OVERDUE" || state === "DUE_TODAY" || state === "PENDING",
  ).length,
  takenTodayCount: entries.filter(({ state }) => state === "TAKEN_TODAY").length,
  dueTotalToday: entries.filter(({ state }) =>
    state === "OVERDUE" || state === "DUE_TODAY" || state === "PENDING" || state === "TAKEN_TODAY",
  ).length,
  entries,
};
```

The latest follow-up is selected before status evaluation; when it is `COMPLETED`, the booking produces no entry.

- [ ] **Step 4: Write failing frontend scheduling tests**

Add:

```js
test('places a new future inquiry in today’s queue immediately', () => {
  const [entry] = buildDecorationFollowupSchedule([
    booking({ status: 'INQUIRY', startDate: '2026-08-20', followups: [] }),
  ], '2026-07-24');
  assert.equal(entry.dateKey, '2026-07-24');
  assert.equal(entry.state, 'PENDING');
});
```

Retain scheduled, overdue, taken-today, closed, and past exclusions.

- [ ] **Step 5: Run frontend test and verify RED**

Run:

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/followups.test.mjs
```

Expected: new future inquiry receives its event date instead of `2026-07-24`.

- [ ] **Step 6: Implement frontend effective action dates**

Set the no-follow-up date through:

```ts
const dateKey = followup?.nextDate
  ? decorationDateKey(followup.nextDate)
  : todayKey;
```

Keep eligibility restricted to future/today inquiries.

- [ ] **Step 7: Verify and commit**

Run both focused tests, then:

```bash
git -C apps/BBS-BE add src/modules/decoration-bookings/decoration-dashboard-domain.ts src/modules/decoration-bookings/decoration-dashboard-domain.spec.ts
git -C apps/BBS-BE commit -m "fix(decoration): centralize actionable followups"
git -C apps/BBS-FE add lib/decoration/followups.ts lib/decoration/followups.test.mjs
git -C apps/BBS-FE commit -m "fix(decoration): show new inquiries in todays followups"
```

### Task 2: Add atomic idempotent create-and-confirm backend operation

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Create: `apps/BBS-BE/src/modules/decoration-bookings/decoration-create-confirmed.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-confirmed-creation-index.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces `POST /decoration/bookings/confirmed`.
- Consumes `DecorationCreateConfirmedDto`.
- Returns `{ booking: DecorationBookingView; reused: boolean }`.
- Consumed by Task 3.

- [ ] **Step 1: Write failing service tests**

Cover zero advance, positive advance, idempotent retry, duplicate race, invalid references, past date, and failed create leaving zero records. The core assertion is:

```ts
const first = await service.createConfirmed(user, {
  ...validBooking,
  requestId,
  advanceAmount: 0,
});
const retry = await service.createConfirmed(user, {
  ...validBooking,
  requestId,
  advanceAmount: 0,
});

assert.equal(first.data.booking.status, "CONFIRMED");
assert.equal(first.data.booking.totalCollected, 0);
assert.equal(retry.data.reused, true);
assert.equal(await bookingModel.countDocuments({ confirmedCreationRequestId: requestId }), 1);
```

For positive advance, assert one embedded payment, matching total, payment date/mode, and confirmation metadata.

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
cd apps/BBS-BE
node -r ts-node/register src/modules/decoration-bookings/decoration-create-confirmed.spec.ts
```

Expected: compile failure because `createConfirmed` does not exist.

- [ ] **Step 3: Add DTO and schema contract**

Add:

```ts
export class DecorationCreateConfirmedDto extends DecorationBookingDto {
  @IsUUID() requestId!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advanceAmount!: number;
  @ValidateIf((value: DecorationCreateConfirmedDto) => value.advanceAmount > 0)
  @IsDateString()
  paymentDate?: string;
  @ValidateIf((value: DecorationCreateConfirmedDto) => value.advanceAmount > 0)
  @IsString()
  @MaxLength(50)
  paymentMode?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}
```

Add nullable `confirmedCreationRequestId` and:

```ts
DecorationBookingSchema.index(
  { restaurantId: 1, confirmedCreationRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { confirmedCreationRequestId: { $type: "string" } },
  },
);
```

- [ ] **Step 4: Implement one-document confirmed creation**

Normalize dates and references through the same functions as inquiry creation. Build optional payment only when `advanceAmount > 0`, then insert one record with:

```ts
{
  ...data,
  status: DecorationBookingStatus.CONFIRMED,
  confirmedCreationRequestId: dto.requestId,
  confirmationRequestId: dto.requestId,
  totalCollected: dto.advanceAmount,
  payments,
  confirmedAt: now,
  confirmedByUserId: new Types.ObjectId(user.id),
}
```

On an `E11000` request-ID race, re-read by company + request ID and return it with `reused: true`. Do not reuse a request ID across companies.

- [ ] **Step 5: Add guarded controller endpoint**

Add:

```ts
@Post("confirmed")
@Permissions(PERMISSIONS.DECORATION_BOOKINGS_CREATE)
createConfirmed(
  @Req() request: { user: UserDocument },
  @Body() dto: DecorationCreateConfirmedDto,
) {
  return this.bookings.createConfirmed(request.user, dto);
}
```

The controller already inherits the decoration business guard; add a metadata test proving it remains `EVENT_DECORATION`.

- [ ] **Step 6: Add and verify index migration**

The migration calls `syncIndexes()` for the decoration booking model and reports the named index. Add:

```json
"migrate:decoration-confirmed-creation": "ts-node src/scripts/migrate-decoration-confirmed-creation-index.ts"
```

Run the focused service test and `npm run build`.

- [ ] **Step 7: Commit**

```bash
git -C apps/BBS-BE add package.json src/modules/decoration-bookings src/scripts/migrate-decoration-confirmed-creation-index.ts
git -C apps/BBS-BE commit -m "feat(decoration): create confirmed events atomically"
```

### Task 3: Add two-action inquiry form and advance handoff

**Files:**
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/components/decoration/decoration-inquiry-form.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-confirmation-modal.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-workspace.tsx`
- Modify: `apps/BBS-FE/lib/decoration/inquiry-form.test.mjs`
- Create: `apps/BBS-FE/lib/decoration/create-confirmed-workflow.test.mjs`

**Interfaces:**
- Produces `createConfirmedDecorationBooking(token, payload)`.
- `DecorationInquiryForm` adds `onConfirmed` behavior for create mode without changing edit mode.
- Consumes Task 2 endpoint.

- [ ] **Step 1: Write failing source and domain tests**

Assert create mode has amber Create Inquiry and green Confirm Booking, edit mode does not offer confirm, and pending payload is not sent until advance submit:

```js
assert.match(source, /Create Inquiry/);
assert.match(source, /Confirm Booking/);
assert.match(source, /bg-emerald-500/);
assert.match(source, /createConfirmedDecorationBooking/);
assert.doesNotMatch(source, /saveDecorationBooking[^]*status:\\s*'CONFIRMED'/);
```

Add a workflow helper test proving cancel clears the pending confirm request without invoking the API and retry reuses its request ID.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/inquiry-form.test.mjs lib/decoration/create-confirmed-workflow.test.mjs
```

Expected: missing confirmation workflow and green action.

- [ ] **Step 3: Add API client**

Add:

```ts
export const createConfirmedDecorationBooking = (
  token: string,
  payload: DecorationBookingPayload & DecorationConfirmationPayload,
) => authorizedRequest<{ booking: RawDecorationBooking; reused: boolean }>(
  '/decoration/bookings/confirmed',
  token,
  { method: 'POST', body: JSON.stringify(payload) },
);
```

Normalize the returned booking through the existing booking-view mapper.

- [ ] **Step 4: Implement form handoff**

Refactor validation/configuration resolution into one async function. The Create Inquiry action saves immediately; Confirm Booking stores the resolved payload and opens an advance child modal. Use a synchronous busy guard and one UUID per popup opening.

The action layout is:

```tsx
<button type="button" onClick={() => void submitIntent('INQUIRY')} className={amberAction}>
  Create Inquiry
</button>
<button type="button" onClick={() => void submitIntent('CONFIRMED')} className={greenAction}>
  Confirm Booking
</button>
```

The advance popup receives the unsaved payload and calls the new endpoint. Cancel returns to the still-populated form and performs no write.

- [ ] **Step 5: Verify responsive behavior and commit**

Run focused tests plus `lib/decoration/mobile-responsive-audit.test.mjs`, then:

```bash
git -C apps/BBS-FE add lib/auth/api.ts components/decoration/decoration-inquiry-form.tsx components/decoration/decoration-confirmation-modal.tsx components/decoration/decoration-workspace.tsx lib/decoration
git -C apps/BBS-FE commit -m "feat(decoration): confirm events from inquiry form"
```

### Task 4: Add event-owned Hot Date backend module

**Files:**
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/schemas/decoration-hot-date.schema.ts`
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/dto/decoration-hot-date.dto.ts`
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/decoration-hot-dates.service.ts`
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/decoration-hot-dates.controller.ts`
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/decoration-hot-dates.module.ts`
- Create: `apps/BBS-BE/src/modules/decoration-hot-dates/decoration-hot-dates.spec.ts`
- Create: `apps/BBS-BE/src/modules/hot-dates/hot-dates-business-guard.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-hot-date-indexes.ts`
- Modify: `apps/BBS-BE/src/app.module.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces `/decoration/hot-dates` list/CRUD/bulk endpoints.
- Produces the same view shape used by banquet `HotDate`.
- Consumed by Tasks 5 and 6.

- [ ] **Step 1: Write failing module tests**

Test valid CRUD, invalid real date such as `2026-02-30`, year mismatch, duplicate date, cross-company access, 5 MB file limit, maximum 2,000 data rows, duplicate rows, row-level errors, audit events, and `EVENT_DECORATION` guard metadata.

- [ ] **Step 2: Run test and verify RED**

```bash
cd apps/BBS-BE
node -r ts-node/register src/modules/decoration-hot-dates/decoration-hot-dates.spec.ts
```

Expected: module not found.

- [ ] **Step 3: Implement schema and strict date helper**

Use collection `decoration_hot_dates` and:

```ts
function assertRealDate(date: string, year: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException("Date must use YYYY-MM-DD.");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || parsed.getUTCFullYear() !== year) {
    throw new BadRequestException("Hot Date must be a real date in the selected year.");
  }
}
```

Add unique `{ restaurantId, year, date }`.

- [ ] **Step 4: Implement service, controller, auditing, and bounded import**

Every read/write includes `restaurantId`. Bulk import rejects more than 2,000 data rows before writes and returns:

```ts
{
  total: rows.length,
  inserted,
  skipped,
  errors: Array<{ row: number; message: string }>,
}
```

Use `@BusinessTypes(BusinessType.EVENT_DECORATION)` and company-admin/employee read with company-admin mutation, matching current event user policy.

- [ ] **Step 5: Register module and migration**

Import `DecorationHotDatesModule` in `AppModule`. Add:

```json
"migrate:decoration-hot-dates": "ts-node src/scripts/migrate-decoration-hot-date-indexes.ts"
```

- [ ] **Step 6: Verify existing banquet isolation**

Run:

```bash
node -r ts-node/register src/modules/decoration-hot-dates/decoration-hot-dates.spec.ts
node -r ts-node/register src/modules/hot-dates/hot-dates.spec.ts
npm run build
```

The new `hot-dates-business-guard.spec.ts` must prove `/hot-dates` remains `BANQUET` and the existing module still registers the `HotDate` model rather than `DecorationHotDate`.

- [ ] **Step 7: Commit**

```bash
git -C apps/BBS-BE add package.json src/app.module.ts src/modules/decoration-hot-dates src/scripts/migrate-decoration-hot-date-indexes.ts
git -C apps/BBS-BE commit -m "feat(decoration): add event hot dates"
```

### Task 5: Parameterize Hot Dates settings UI

**Files:**
- Modify: `apps/BBS-FE/components/settings/hot-dates-manager.tsx`
- Modify: `apps/BBS-FE/components/decoration/settings/decoration-settings.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/decoration-hot-dates-section.tsx`
- Modify: `apps/BBS-FE/lib/decoration/settings-view.ts`
- Modify: `apps/BBS-FE/lib/decoration/settings-view.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Create: `apps/BBS-FE/lib/decoration/hot-dates-settings.test.mjs`

**Interfaces:**
- Produces `HotDatesApi` adapter consumed by `HotDatesManager`.
- Event adapter points only to `/decoration/hot-dates`.
- Existing banquet manager defaults retain `/hot-dates`.

- [ ] **Step 1: Write failing adapter and route tests**

Assert:

```js
assert.match(settingsSource, /id:'hotDates'/);
assert.match(eventSectionSource, /DecorationHotDatesSection/);
assert.match(apiSource, /\\/decoration\\/hot-dates/);
assert.match(managerSource, /api:\\s*HotDatesApi/);
```

Also characterize the banquet settings page and assert its calls still target `/hot-dates`.

- [ ] **Step 2: Run and verify RED**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/settings-view.test.mjs lib/decoration/hot-dates-settings.test.mjs
```

- [ ] **Step 3: Extract explicit API adapter**

Define:

```ts
export type HotDatesApi = {
  list(token: string, year: number): Promise<HotDate[]>;
  create(token: string, payload: CreateHotDatePayload): Promise<HotDate>;
  update(token: string, id: string, payload: UpdateHotDatePayload): Promise<HotDate>;
  remove(token: string, id: string): Promise<void>;
  bulk(token: string, year: number, file: File): Promise<HotDateBulkResult>;
};
```

`HotDatesManager` receives `api` and keeps its visual/interaction implementation business-neutral. The banquet settings supplies the existing adapter explicitly or through an unchanged default.

- [ ] **Step 4: Add event tab and adapter**

Extend `DecorationSettingsTab` with `hotDates`, add the tab label, and render `DecorationHotDatesSection`. Event API functions use only `/decoration/hot-dates`.

- [ ] **Step 5: Verify and commit**

Run both settings tests and the banquet settings tests, then:

```bash
git -C apps/BBS-FE add components/settings/hot-dates-manager.tsx components/decoration/settings lib/auth/api.ts lib/decoration/settings-view.ts lib/decoration/settings-view.test.mjs lib/decoration/hot-dates-settings.test.mjs
git -C apps/BBS-FE commit -m "feat(decoration): configure event hot dates"
```

### Task 6: Render event Hot Dates in the calendar

**Files:**
- Modify: `apps/BBS-FE/components/decoration/decoration-workspace.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-calendar.tsx`
- Modify: `apps/BBS-FE/lib/decoration/calendar.ts`
- Modify: `apps/BBS-FE/lib/decoration/calendar.test.mjs`
- Create: `apps/BBS-FE/lib/decoration/hot-date-calendar.test.mjs`

**Interfaces:**
- Consumes Task 4 event Hot Date API.
- Produces year-keyed cache and `hotDatesByKey`.

- [ ] **Step 1: Write failing calendar tests**

Test red styling, accessible description, selected-date behavior, one request per successful year, retry after failed year, stale year rejection, and bookings remaining visible on Hot Date failure.

Core state assertion:

```js
assert.deepEqual(
  getDecorationCalendarCellState(day, bookings, new Map([['2026-07-24', hotDate]])),
  { hasBookings: true, isHotDate: true, hotDateDescription: 'Wedding season' },
);
```

- [ ] **Step 2: Run and verify RED**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/calendar.test.mjs lib/decoration/hot-date-calendar.test.mjs
```

- [ ] **Step 3: Implement cache and stale-response protection**

Maintain:

```ts
const hotDatesByYear = useRef(new Map<number, HotDate[]>());
const latestHotDateRequest = useRef(0);
```

Only cache successful results; request identity prevents an older year response from changing visible state.

- [ ] **Step 4: Add banquet-equivalent red cell treatment**

Pass Hot Date state into each calendar cell. Add a red border/background/text treatment and an accessible label containing date and description. Booking dots/counts remain present.

- [ ] **Step 5: Verify and commit**

Run focused tests and mobile responsive audit, then:

```bash
git -C apps/BBS-FE add components/decoration/decoration-workspace.tsx components/decoration/decoration-calendar.tsx lib/decoration/calendar.ts lib/decoration/calendar.test.mjs lib/decoration/hot-date-calendar.test.mjs
git -C apps/BBS-FE commit -m "feat(decoration): show hot dates in calendar"
```

### Task 7: Align dashboard follow-up totals and records

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-operations.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-dashboard-records.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-dashboard-records.spec.ts`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/decoration/dashboard-view.ts`
- Modify: `apps/BBS-FE/lib/decoration/dashboard-view.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/decoration-dashboard.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-dashboard-records-panel.tsx`
- Modify: `apps/BBS-FE/lib/decoration/dashboard-records-view.test.mjs`

**Interfaces:**
- Consumes Task 1 projection.
- Dashboard response adds `followupsPendingToday`, `followupsTakenToday`, `followupsDueTotalToday`.
- Follow-up record rows include `followupState`.

- [ ] **Step 1: Write failing backend parity tests**

Assert dashboard summary for one pending, one overdue, one taken, and one future scheduled record returns:

```ts
{
  followupsPendingToday: 2,
  followupsTakenToday: 1,
  followupsDueTotalToday: 3,
}
```

The follow-up drilldown total must be `3`, excluding scheduled-future records.

- [ ] **Step 2: Run and verify RED**

Run the two dashboard backend specs. Expected: missing total fields and taken-today drilldown entry.

- [ ] **Step 3: Implement server summary/list parity**

Use Task 1 projection for `/dashboard`. For `type=followups`, query only future/today inquiries, classify them through the same projection, filter required plus taken-today, stable-sort by priority/date/time/name/id, then paginate the classified result. Return each mapped booking with `followupState`.

- [ ] **Step 4: Write failing frontend card tests**

Assert:

```js
const card = buildDecorationDashboardCards({
  ...summary,
  followupsPendingToday: 2,
  followupsTakenToday: 1,
  followupsDueTotalToday: 3,
}).find((value) => value.id === 'followups');
assert.deepEqual(card.value, { taken: 1, total: 3 });
```

Test green `FOLLOW UP TAKEN` and amber pending/due/overdue record metadata.

- [ ] **Step 5: Implement responsive card and record states**

Represent the follow-up value as structured data or a dedicated card variant; render `1/3 completed` without horizontal overflow. Clicking retains the query-string dashboard panel flow.

- [ ] **Step 6: Verify and commit**

Run focused backend/frontend tests, then commit separately:

```bash
git -C apps/BBS-BE add src/modules/decoration-bookings
git -C apps/BBS-BE commit -m "feat(decoration): report daily followup completion"
git -C apps/BBS-FE add lib/auth/types.ts lib/decoration/dashboard-view.ts lib/decoration/dashboard-view.test.mjs components/decoration/decoration-dashboard.tsx components/decoration/decoration-dashboard-records-panel.tsx lib/decoration/dashboard-records-view.test.mjs
git -C apps/BBS-FE commit -m "feat(decoration): show followup completion dashboard"
```

### Task 8: Remove Event Detail Share and eager PDF preparation

**Files:**
- Modify: `apps/BBS-FE/lib/decoration/event-detail-view.ts`
- Modify: `apps/BBS-FE/lib/decoration/event-detail-view.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/lib/decoration/customer-document-actions.test.mjs`
- Delete: `apps/BBS-FE/lib/decoration/customer-document-share.ts`
- Delete: `apps/BBS-FE/lib/decoration/customer-document-share.test.mjs`

**Interfaces:**
- Event Detail documents expose only `view` and `download`.
- The query-string PDF viewer remains unchanged.

- [ ] **Step 1: Update tests first**

Change the confirmed-with-selection expectation to:

```js
assert.deepEqual(ids(value), [
  'edit', 'advance', 'followup', 'edit-decoration', 'view', 'download',
]);
```

Assert the modal source contains no `canSharePdf`, `createPdfShareController`, `sharePdf`, `ShareActionLabel`, or eager customer PDF call outside Download.

- [ ] **Step 2: Run and verify RED**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/event-detail-view.test.mjs lib/decoration/customer-document-actions.test.mjs
```

Expected: Share remains derived and preloaded.

- [ ] **Step 3: Remove Share implementation**

Remove `canShare` capability, Share action derivation, share controller state/effect/label, and helper/tests. Keep Download lifecycle and View query navigation unchanged.

- [ ] **Step 4: Verify and commit**

Run all customer document/action tests, then:

```bash
git -C apps/BBS-FE add -A
git -C apps/BBS-FE commit -m "refactor(decoration): remove event detail sharing"
```

### Task 9: Full regression, migration verification, and checklist

**Files:**
- Modify: `apps/BBS-FE/docs/superpowers/specs/2026-07-24-decoration-confirmation-hot-dates-followups-design.md` only if implementation reveals an approved factual correction.
- Modify: `apps/BBS-BE/docs/superpowers/specs/2026-07-24-decoration-confirmation-hot-dates-followups-design.md` only for the same correction.

**Interfaces:**
- Validates every prior task and banquet isolation.

- [ ] **Step 1: Run all backend specs**

```bash
cd apps/BBS-BE
for file in $(rg --files src | rg '\.spec\.ts$' | sort); do
  node -r ts-node/register "$file" || exit 1
done
```

Expected: every spec exits zero.

- [ ] **Step 2: Run backend lint, build, and audit**

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

Expected: zero lint errors, successful build, zero moderate-or-higher vulnerabilities.

- [ ] **Step 3: Run all frontend tests**

```bash
cd apps/BBS-FE
npx tsx --test \
  lib/decoration/*.test.mjs \
  lib/decoration/*.test.tsx \
  lib/bookings/*.test.mjs \
  lib/auth/business-routes.test.mjs \
  lib/employees/*.test.mjs
```

Expected: zero failures.

- [ ] **Step 4: Run frontend lint, static build, and audit**

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
git restore next-env.d.ts
```

Expected: zero lint errors, all routes static, zero moderate-or-higher vulnerabilities.

- [ ] **Step 5: Verify migration scripts against a development database**

```bash
cd apps/BBS-BE
npm run migrate:decoration-confirmed-creation
npm run migrate:decoration-hot-dates
```

Verify MongoDB reports:

```javascript
db.decorationbookings.getIndexes()
db.decoration_hot_dates.getIndexes()
```

Expected: company-scoped unique confirmed request-ID index and company/year/date unique Hot Date index.

- [ ] **Step 6: Inspect final scope**

```bash
git -C apps/BBS-BE diff --check
git -C apps/BBS-FE diff --check
git -C apps/BBS-BE status --short
git -C apps/BBS-FE status --short
```

Expected: no uncommitted files and no banquet production files changed except characterized shared Hot Date presentation dependencies.

- [ ] **Step 7: Record final verification commits only if documentation changed**

```bash
git -C apps/BBS-BE add docs/superpowers/specs
git -C apps/BBS-BE commit -m "docs(decoration): record workflow verification"
git -C apps/BBS-FE add docs/superpowers/specs
git -C apps/BBS-FE commit -m "docs(decoration): record workflow verification"
```

Skip these commits when documentation has no factual changes.
