# Banquet Food Service Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independently configurable, optional Welcome Drink and Main Course start times to the banquet menu-selection workflow, booking details, and print output.

**Architecture:** Store two feature toggles in the tenant-scoped banquet settings document and two normalized `HH:mm` snapshot values on each banquet order. Keep time validation in a focused backend domain helper, persist values only through explicit order updates, and expose historical values independently of current toggle state. The frontend adds a dedicated Food Schedule settings tab and reuses the existing banquet time-selector pattern inside the menu popup.

**Tech Stack:** NestJS, Mongoose, class-validator, MongoDB migrations, Next.js/React, TypeScript, Node test scripts, Tailwind CSS.

## Global Constraints

- Banquet companies only; event-decoration and ODC behavior must not change.
- `enableWelcomeDrinkStartTime` and `enableMainCourseStartTime` are independent and default to `false`.
- `welcomeDrinkStartTime` and `mainCourseStartTime` are optional booking-level snapshots stored as `HH:mm` or `null`.
- Minute choices are exactly `00`, `15`, `30`, and `45`.
- Entered schedule times must fall inside the event range, including overnight ranges.
- When both values exist, Welcome Drink Start Time must be earlier than or equal to Main Course Start Time.
- Disabling configuration must preserve and continue displaying historical values.
- Existing clients that omit all four new properties must continue working unchanged.
- UI must be mobile-first and responsive on tablet and desktop.

---

### Task 1: Backend settings contract and guarded mutation

**Files:**
- Create: `apps/BBS-BE/src/modules/settings/dto/update-food-service-schedule-settings.dto.ts`
- Create: `apps/BBS-BE/src/modules/settings/food-service-schedule-settings.spec.ts`
- Modify: `apps/BBS-BE/src/modules/settings/schemas/setting.schema.ts`
- Modify: `apps/BBS-BE/src/modules/settings/settings.service.ts`
- Modify: `apps/BBS-BE/src/modules/settings/settings.controller.ts`

**Interfaces:**
- Produces: `UpdateFoodServiceScheduleSettingsDto` with two required booleans.
- Produces: `SettingsService.updateFoodServiceScheduleSettings(restaurantId, input)`.
- Produces: `PATCH /settings/food-service-schedule` returning the complete mapped settings object.

- [ ] **Step 1: Write the failing settings test**

Create a focused service test that makes `findOne()` return a settings document without the new fields, calls the public `getForRestaurant()` method, and asserts mapped defaults are false. Then update all four toggle combinations and verify one toggle never overwrites the other:

```ts
const response = await service.getForRestaurant(restaurantId);
assert.equal(response.data.enableWelcomeDrinkStartTime, false);
assert.equal(response.data.enableMainCourseStartTime, false);

await service.updateFoodServiceScheduleSettings(restaurantId, {
  enableWelcomeDrinkStartTime: true,
  enableMainCourseStartTime: false,
});
assert.equal(saved.enableWelcomeDrinkStartTime, true);
assert.equal(saved.enableMainCourseStartTime, false);
```

- [ ] **Step 2: Run the settings test and verify failure**

Run:

```bash
cd apps/BBS-BE
npx ts-node src/modules/settings/food-service-schedule-settings.spec.ts
```

Expected: FAIL because the settings properties and update method do not exist.

- [ ] **Step 3: Add schema properties and DTO validation**

Add to `Setting`:

```ts
@Prop({ type: Boolean, default: false })
enableWelcomeDrinkStartTime!: boolean;

@Prop({ type: Boolean, default: false })
enableMainCourseStartTime!: boolean;
```

Create the DTO:

```ts
export class UpdateFoodServiceScheduleSettingsDto {
  @IsBoolean()
  enableWelcomeDrinkStartTime!: boolean;

  @IsBoolean()
  enableMainCourseStartTime!: boolean;
}
```

- [ ] **Step 4: Implement service defaults, mapping, and atomic update**

Initialize both fields in new settings documents, normalize missing legacy values in `ensureSettingsForRestaurant`, and expose both through `mapSettings` using null-safe defaults. Implement:

```ts
async updateFoodServiceScheduleSettings(
  restaurantId: string,
  input: {
    enableWelcomeDrinkStartTime: boolean;
    enableMainCourseStartTime: boolean;
  },
) {
  const settings = await this.ensureSettingsForRestaurant(restaurantId);
  settings.enableWelcomeDrinkStartTime = input.enableWelcomeDrinkStartTime;
  settings.enableMainCourseStartTime = input.enableMainCourseStartTime;
  await settings.save();
  return {
    success: true,
    message: 'Food service schedule settings updated successfully',
    data: this.mapSettings(settings),
  };
}
```

- [ ] **Step 5: Add the banquet-only, company-admin endpoint**

Add the controller route under the existing controller-level banquet business guard:

```ts
@Patch('food-service-schedule')
@Roles(UserRole.COMPANY_ADMIN)
updateFoodServiceScheduleSettings(
  @Req() request: { user: UserDocument },
  @Body() dto: UpdateFoodServiceScheduleSettingsDto,
) {
  return this.logSettingsMutation(request.user, 'update food service schedule settings', () =>
    this.settingsService.updateFoodServiceScheduleSettings(
      this.getRestaurantId(request.user),
      dto,
    ),
  );
}
```

This reuses `logSettingsMutation`, preserving tenant scoping and before/after audit data.

- [ ] **Step 6: Run focused test, lint, and build**

```bash
npx ts-node src/modules/settings/food-service-schedule-settings.spec.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 7: Commit backend settings support**

```bash
git add src/modules/settings
git commit -m "feat: configure banquet food service schedule"
```

---

### Task 2: Idempotent settings migration

**Files:**
- Create: `apps/BBS-BE/src/scripts/banquet-food-service-schedule-migration.ts`
- Create: `apps/BBS-BE/src/scripts/banquet-food-service-schedule-migration.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-banquet-food-service-schedule.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces: `buildBanquetFoodServiceScheduleMigrationFilter()` and `buildBanquetFoodServiceScheduleMigrationUpdate()` for deterministic testing.
- Produces: `npm run migrate:banquet-food-service-schedule`.

- [ ] **Step 1: Write the failing migration test**

Assert that the migration targets settings missing either flag and only fills missing properties with false:

```ts
assert.deepEqual(buildBanquetFoodServiceScheduleMigrationFilter(), {
  $or: [
    { enableWelcomeDrinkStartTime: { $exists: false } },
    { enableMainCourseStartTime: { $exists: false } },
  ],
});
assert.deepEqual(buildBanquetFoodServiceScheduleMigrationPipeline(), [
  {
    $set: {
      enableWelcomeDrinkStartTime: { $ifNull: ['$enableWelcomeDrinkStartTime', false] },
      enableMainCourseStartTime: { $ifNull: ['$enableMainCourseStartTime', false] },
    },
  },
]);
```

- [ ] **Step 2: Run the migration test and verify failure**

```bash
npx ts-node src/scripts/banquet-food-service-schedule-migration.spec.ts
```

Expected: FAIL because the migration helpers do not exist.

- [ ] **Step 3: Implement the migration and executable**

Use the existing backend environment/Mongoose bootstrap pattern. Run an `updateMany` against the settings collection with the tested filter and aggregation pipeline. Print matched and modified counts, return a non-zero exit code on error, and close the connection in `finally`.

- [ ] **Step 4: Add the package command**

```json
"migrate:banquet-food-service-schedule": "ts-node src/scripts/migrate-banquet-food-service-schedule.ts"
```

- [ ] **Step 5: Verify idempotency without connecting to production**

```bash
npx ts-node src/scripts/banquet-food-service-schedule-migration.spec.ts
npm run build
```

Expected: PASS. Do not run the live migration during implementation.

- [ ] **Step 6: Commit the migration**

```bash
git add src/scripts package.json package-lock.json
git commit -m "chore: add banquet food schedule migration"
```

---

### Task 3: Focused backend schedule validation domain

**Files:**
- Create: `apps/BBS-BE/src/modules/orders/food-service-schedule.ts`
- Create: `apps/BBS-BE/src/modules/orders/food-service-schedule.spec.ts`

**Interfaces:**
- Produces: `FoodServiceScheduleInput`.
- Produces: `validateFoodServiceSchedule(input): void`.
- Produces: `normalizeOptionalScheduleTime(value): string | null`.

- [ ] **Step 1: Write failing tests for ordinary and overnight ranges**

Cover these exact cases:

```ts
assert.doesNotThrow(() => validateFoodServiceSchedule({
  eventStartTime: '18:00', eventEndTime: '23:00',
  welcomeDrinkStartTime: '18:30', mainCourseStartTime: '21:00',
}));
assert.throws(() => validateFoodServiceSchedule({
  eventStartTime: '18:00', eventEndTime: '23:00',
  welcomeDrinkStartTime: '17:45', mainCourseStartTime: null,
}), /within the event time range/);
assert.doesNotThrow(() => validateFoodServiceSchedule({
  eventStartTime: '20:00', eventEndTime: '02:00',
  welcomeDrinkStartTime: '21:00', mainCourseStartTime: '00:30',
}));
assert.throws(() => validateFoodServiceSchedule({
  eventStartTime: '18:00', eventEndTime: '23:00',
  welcomeDrinkStartTime: '21:30', mainCourseStartTime: '20:30',
}), /Welcome Drink Start Time must be earlier/);
assert.doesNotThrow(() => validateFoodServiceSchedule({
  eventStartTime: '18:00', eventEndTime: '23:00',
  welcomeDrinkStartTime: '20:00', mainCourseStartTime: '20:00',
}));
```

Also test invalid strings, null values, one-field-only input, and midnight boundaries.

- [ ] **Step 2: Run the domain test and verify failure**

```bash
npx ts-node src/modules/orders/food-service-schedule.spec.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement minute-based validation**

Parse `HH:mm` into minutes `0..1439`. Convert a schedule time to its offset from event start:

```ts
const eventDuration = endMinute > startMinute
  ? endMinute - startMinute
  : endMinute + 1440 - startMinute;
const offsetFromStart = valueMinute >= startMinute
  ? valueMinute - startMinute
  : valueMinute + 1440 - startMinute;
```

Reject offsets greater than `eventDuration`. Compare the two offsets for ordering. Throw `BadRequestException` with field-specific messages.

- [ ] **Step 4: Run domain test, lint, and commit**

```bash
npx ts-node src/modules/orders/food-service-schedule.spec.ts
npm run lint
git add src/modules/orders/food-service-schedule.ts src/modules/orders/food-service-schedule.spec.ts
git commit -m "feat: validate banquet food service times"
```

---

### Task 4: Persist schedule snapshots through order CRUD

**Files:**
- Create: `apps/BBS-BE/src/modules/orders/order-food-service-schedule.spec.ts`
- Modify: `apps/BBS-BE/src/modules/orders/schemas/order.schema.ts`
- Modify: `apps/BBS-BE/src/modules/orders/dto/create-order.dto.ts`
- Modify: `apps/BBS-BE/src/modules/orders/dto/update-order.dto.ts`
- Modify: `apps/BBS-BE/src/modules/orders/orders.service.ts`

**Interfaces:**
- Extends create/update DTOs with `welcomeDrinkStartTime?: string | null` and `mainCourseStartTime?: string | null`.
- Extends mapped Order responses with both properties as `string | null`.

- [ ] **Step 1: Write failing service tests for persistence safeguards**

Test:

- enabled field accepts a valid value;
- disabled field rejects a new non-null value;
- omitted fields preserve stored values;
- explicit `null` clears an enabled field;
- disabling configuration preserves an existing stored value;
- changing the event range revalidates stored schedule values;
- one tenant cannot influence another tenant's settings;
- mapped legacy documents return both values as `null`.

Use a minimal order fixture and stub `settingsService.getForRestaurant()` with explicit toggle combinations.

- [ ] **Step 2: Run the order schedule test and verify failure**

```bash
npx ts-node src/modules/orders/order-food-service-schedule.spec.ts
```

Expected: FAIL because order DTOs, schema, and mapping lack the schedule fields.

- [ ] **Step 3: Add order schema and DTO properties**

Schema:

```ts
@Prop({ type: String, default: null })
welcomeDrinkStartTime!: string | null;

@Prop({ type: String, default: null })
mainCourseStartTime!: string | null;
```

DTO properties use `@IsOptional()`, `@ValidateIf((_, value) => value !== null)`, and `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` so explicit null is accepted for clearing.

- [ ] **Step 4: Integrate settings-aware update semantics**

In `OrdersService.update`, compute effective values without clearing omitted fields:

```ts
const nextWelcomeDrinkStartTime =
  updateOrderDto.welcomeDrinkStartTime !== undefined
    ? normalizeOptionalScheduleTime(updateOrderDto.welcomeDrinkStartTime)
    : order.welcomeDrinkStartTime ?? null;
const nextMainCourseStartTime =
  updateOrderDto.mainCourseStartTime !== undefined
    ? normalizeOptionalScheduleTime(updateOrderDto.mainCourseStartTime)
    : order.mainCourseStartTime ?? null;
```

Fetch tenant settings only when a schedule property or event time changes. Reject a submitted non-null value when its corresponding toggle is disabled. Validate effective schedule values against the effective event start/end, then assign both fields. Do not couple them to `selectedMenus`, so partial menu updates cannot erase data.

For create, accept values only under enabled settings for API completeness, while the current UI continues creating inquiries with null values.

- [ ] **Step 5: Map fields through every order response**

Add:

```ts
welcomeDrinkStartTime: order.welcomeDrinkStartTime ?? null,
mainCourseStartTime: order.mainCourseStartTime ?? null,
```

to the central order mapper used by list, detail, update, and print-data consumers. Ensure mutation audit before/after snapshots automatically include these values through the existing `logMutation` controller wrapper.

- [ ] **Step 6: Run focused and existing order regression tests**

```bash
npx ts-node src/modules/orders/order-food-service-schedule.spec.ts
npx ts-node src/modules/orders/order-slot-rules.spec.ts
npx ts-node src/modules/orders/menu-selection-order.util.spec.ts
npx ts-node src/modules/orders/orders-permissions.spec.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 7: Commit order persistence**

```bash
git add src/modules/orders
git commit -m "feat: store banquet food service times"
```

---

### Task 5: Frontend contracts and reusable schedule helpers

**Files:**
- Create: `apps/BBS-FE/lib/bookings/food-service-schedule.ts`
- Create: `apps/BBS-FE/lib/bookings/food-service-schedule.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`

**Interfaces:**
- Extends `AppSettings` and `Order` with the four new properties.
- Extends `updateOrder` payload with nullable schedule times.
- Produces: `updateFoodServiceScheduleSettings(token, input)`.
- Produces: `validateFoodServiceScheduleForm(input): string | null` and `formatFoodServiceTime(value): string`.

- [ ] **Step 1: Write failing helper tests**

Assert ordinary ranges, overnight ranges, ordering, equality, optional values, invalid strings, and 12-hour formatting:

```js
assert.equal(formatFoodServiceTime('18:30'), '6:30 PM');
assert.equal(validateFoodServiceScheduleForm({
  eventStartTime: '18:00', eventEndTime: '23:00',
  welcomeDrinkStartTime: '18:30', mainCourseStartTime: '21:00',
}), null);
```

- [ ] **Step 2: Run helper tests and verify failure**

```bash
node --test lib/bookings/food-service-schedule.test.mjs
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement frontend types, API, and pure helpers**

Add optional booleans to `AppSettings`, nullable strings to `Order`, nullable fields to the `updateOrder` payload, and:

```ts
export function updateFoodServiceScheduleSettings(
  accessToken: string,
  input: {
    enableWelcomeDrinkStartTime: boolean;
    enableMainCourseStartTime: boolean;
  },
) {
  return authorizedRequest<AppSettings>('/settings/food-service-schedule', accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
```

Keep helper validation semantically identical to the backend domain helper.

- [ ] **Step 4: Run tests, typecheck/build, and commit**

```bash
node --test lib/bookings/food-service-schedule.test.mjs
npm run lint
npm run build
git add lib/auth lib/bookings/food-service-schedule.ts lib/bookings/food-service-schedule.test.mjs
git commit -m "feat: add banquet food schedule contracts"
```

---

### Task 6: Banquet Settings Food Schedule tab

**Files:**
- Create: `apps/BBS-FE/lib/bookings/food-service-schedule-settings-ui.test.mjs`
- Modify: `apps/BBS-FE/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `AppSettings.enableWelcomeDrinkStartTime`, `AppSettings.enableMainCourseStartTime`, and `updateFoodServiceScheduleSettings()` from Task 5.

- [ ] **Step 1: Write a failing settings UI behavior test**

Read the settings page source and assert the dedicated `foodSchedule` tab, both labels, independent checked values, company-admin visibility, and API mutation are present. Also assert the existing event-decoration settings component is untouched.

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test lib/bookings/food-service-schedule-settings-ui.test.mjs
```

Expected: FAIL because the tab does not exist.

- [ ] **Step 3: Add the dedicated settings tab**

Extend `SettingsTabKey` and the admin tabs with `foodSchedule` labelled **Food Schedule**. Render one responsive card containing two `ToggleSettingCard` controls:

- Enable Welcome Drink Start Time
- Enable Main Course Start Time

Each `onChange` sends both values, changing only the selected property:

```ts
await mutateSettings(
  () => updateFoodServiceScheduleSettings(token, {
    enableWelcomeDrinkStartTime: nextWelcomeEnabled,
    enableMainCourseStartTime: Boolean(settings.enableMainCourseStartTime),
  }),
  'Food schedule settings updated successfully.',
);
```

Disable both controls during `isSaving`, use visible slate text, and stack controls on mobile.

- [ ] **Step 4: Run behavior test and frontend build**

```bash
node --test lib/bookings/food-service-schedule-settings-ui.test.mjs
npm run lint
npm run build
```

Expected: all PASS and every static route still exports.

- [ ] **Step 5: Commit settings UI**

```bash
git add 'app/(app)/settings/page.tsx' lib/bookings/food-service-schedule-settings-ui.test.mjs
git commit -m "feat: configure banquet food schedule in settings"
```

---

### Task 7: Menu popup schedule selection and resilient state

**Files:**
- Create: `apps/BBS-FE/components/bookings/food-service-time-select.tsx`
- Create: `apps/BBS-FE/lib/bookings/food-service-menu-flow.test.mjs`
- Modify: `apps/BBS-FE/app/(app)/bookings/page.tsx`

**Interfaces:**
- Consumes: Task 5 validation helper and settings/order fields.
- Produces: `FoodServiceTimeSelect` accepting `label`, `value`, `onChange`, and `disabled`.

- [ ] **Step 1: Write a failing menu-flow behavior test**

Assert:

- form state includes both strings;
- initial state is empty;
- opening Edit Menu hydrates values from the selected order;
- fields render only for enabled settings;
- the section is absent when both flags are false;
- submit validates and sends `string | null` values;
- failed requests do not reset form state;
- minute options are exactly `00`, `15`, `30`, `45`.

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test lib/bookings/food-service-menu-flow.test.mjs
```

Expected: FAIL because menu scheduling is not implemented.

- [ ] **Step 3: Build the reusable three-part time selector**

Use controlled hour, minute, and AM/PM selects. Convert between UI parts and stored `HH:mm`. Include an explicit **Clear** action. Use minimum 44px touch targets, black/slate visible text, and a single-column mobile layout that becomes two columns for the pair of fields on wider screens.

- [ ] **Step 4: Extend booking form state and hydration**

Add:

```ts
welcomeDrinkStartTime: string;
mainCourseStartTime: string;
```

to `BookingFormState` and `initialFormState`. Populate them from `order.welcomeDrinkStartTime ?? ''` and `order.mainCourseStartTime ?? ''` in every menu-selection/edit hydration path. Do not add them to ordinary inquiry-create required fields.

- [ ] **Step 5: Render Food Service Schedule at the menu popup end**

Below menu items and comments, render the section when at least one setting is enabled. Render each control independently according to its toggle. Add concise optional-field copy and ensure the popup's existing scroll body and sticky save footer remain intact.

- [ ] **Step 6: Validate and submit without losing state**

Before `updateOrder`, call `validateFoodServiceScheduleForm` with the form's event range. On failure, show the returned field-specific message and do not submit. Send:

```ts
welcomeDrinkStartTime: settings.enableWelcomeDrinkStartTime
  ? formState.welcomeDrinkStartTime || null
  : undefined,
mainCourseStartTime: settings.enableMainCourseStartTime
  ? formState.mainCourseStartTime || null
  : undefined,
```

Keep the existing reset only after successful save; the catch path must retain the current form.

- [ ] **Step 7: Run flow tests and responsive regression checks**

```bash
node --test lib/bookings/food-service-menu-flow.test.mjs
npm run lint
npm run build
```

Manually verify the popup at approximately 390px, 768px, and 1440px widths.

- [ ] **Step 8: Commit menu workflow**

```bash
git add components/bookings/food-service-time-select.tsx 'app/(app)/bookings/page.tsx' lib/bookings/food-service-menu-flow.test.mjs
git commit -m "feat: capture food service times with menu selection"
```

---

### Task 8: Booking details and print output

**Files:**
- Create: `apps/BBS-FE/lib/bookings/food-service-schedule-display.test.mjs`
- Modify: `apps/BBS-FE/app/(app)/bookings/page.tsx`
- Modify: `apps/BBS-FE/app/print/order/print-order-view.tsx`

**Interfaces:**
- Consumes: nullable order schedule values and `formatFoodServiceTime()` from Task 5.

- [ ] **Step 1: Write a failing conditional-display test**

Assert source behavior for:

- no block when both values are null;
- one row when only one value exists;
- two rows when both exist;
- values shown regardless of current settings flags;
- details and print use the same 12-hour formatter;
- kitchen and customer print paths do not render empty placeholders.

- [ ] **Step 2: Run the test and verify failure**

```bash
node --test lib/bookings/food-service-schedule-display.test.mjs
```

Expected: FAIL because neither display contains the schedule.

- [ ] **Step 3: Add the booking-detail block**

Near Menu Snapshot, conditionally render **Food Service Schedule** when either stored value exists. Use compact responsive rows with labels and formatted values. Do not consult current settings; historical snapshots are authoritative.

- [ ] **Step 4: Add print rows without changing existing pagination**

Create a local list:

```ts
const foodScheduleRows = [
  order.welcomeDrinkStartTime
    ? ['Welcome Drink Start Time', formatFoodServiceTime(order.welcomeDrinkStartTime)]
    : null,
  order.mainCourseStartTime
    ? ['Main Course Start Time', formatFoodServiceTime(order.mainCourseStartTime)]
    : null,
].filter((row): row is [string, string] => Boolean(row));
```

Render it as a compact block immediately before Selected Menu Snapshot. Omit the block when empty. Confirm both normal and kitchen copies remain readable and page breaks do not split a heading from both rows.

- [ ] **Step 5: Run tests, build, and static-route checks**

```bash
node --test lib/bookings/food-service-schedule-display.test.mjs
npm run lint
npm run build
```

Open `/bookings?date=<date>&bookingId=<id>` and `/print/order?id=<id>` through query strings; do not introduce dynamic route IDs.

- [ ] **Step 6: Commit display and print output**

```bash
git add 'app/(app)/bookings/page.tsx' app/print/order/print-order-view.tsx lib/bookings/food-service-schedule-display.test.mjs
git commit -m "feat: show banquet food schedule in details and print"
```

---

### Task 9: End-to-end regression, migration verification, and checklist

**Files:**
- Modify only if a discovered defect requires a scoped fix in files already listed above.

**Interfaces:**
- Consumes all completed backend and frontend behavior.

- [ ] **Step 1: Run the complete backend verification set**

```bash
cd apps/BBS-BE
npx ts-node src/modules/settings/food-service-schedule-settings.spec.ts
npx ts-node src/scripts/banquet-food-service-schedule-migration.spec.ts
npx ts-node src/modules/orders/food-service-schedule.spec.ts
npx ts-node src/modules/orders/order-food-service-schedule.spec.ts
npx ts-node src/modules/orders/order-slot-rules.spec.ts
npx ts-node src/modules/orders/menu-selection-order.util.spec.ts
npx ts-node src/modules/orders/orders-permissions.spec.ts
npx ts-node src/modules/odc/odc-orders.service.spec.ts
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Run the complete frontend verification set**

```bash
cd apps/BBS-FE
node --test lib/bookings/food-service-schedule.test.mjs
node --test lib/bookings/food-service-schedule-settings-ui.test.mjs
node --test lib/bookings/food-service-menu-flow.test.mjs
node --test lib/bookings/food-service-schedule-display.test.mjs
npm run lint
npm run build
```

Expected: all PASS and static export/build succeeds.

- [ ] **Step 3: Verify functional combinations manually**

Test all four setting combinations. For each enabled field, select and clear a time, edit it again, and confirm detail/print output. Verify ordinary and overnight bookings, equal schedule values, ordering rejection, outside-range rejection, failed-request state retention, and historical visibility after disabling a toggle.

- [ ] **Step 4: Verify unaffected flows**

Create and edit a normal banquet inquiry with both toggles disabled. Confirm an inquiry, choose a menu without schedule fields, open details, and print. Then smoke-test ODC and event-decoration login, calendar, detail, and selection routes to confirm no new fields or behavior appear.

- [ ] **Step 5: Run the migration in the intended environment and verify data**

After taking the normal database backup and confirming the target URI:

```bash
cd apps/BBS-BE
npm run migrate:banquet-food-service-schedule
```

Verify in MongoDB:

```javascript
db.settings.countDocuments({
  $or: [
    { enableWelcomeDrinkStartTime: { $exists: false } },
    { enableMainCourseStartTime: { $exists: false } },
  ],
})
```

Expected: `0`. Run the migration a second time; expected modified count is `0`.

- [ ] **Step 6: Review commits and working trees**

```bash
cd apps/BBS-BE && git status --short && git log --oneline -6
cd ../BBS-FE && git status --short && git log --oneline -6
```

Expected: both working trees clean, with scoped commits for settings, migration, domain validation, persistence, frontend contracts, settings UI, menu flow, and display/print.
