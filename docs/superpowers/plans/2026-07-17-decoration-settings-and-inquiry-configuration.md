# Decoration Settings and Inquiry Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver banquet-quality decoration Settings and Company Profile pages plus reliable inquiry-time creation and cascading selection of Event Types, Hotels, Venues, and Halls.

**Architecture:** Keep decoration configuration in its existing collections and route namespace, extend locations with an explicit type, and reuse only safe branding APIs and visual patterns from banquet Settings. The backend remains the authority for tenant isolation, normalized uniqueness, snapshots, and audit records; the frontend coordinates inline configuration creation before bounded booking submission.

**Tech Stack:** NestJS, Mongoose, class-validator, Jest, Next.js static export, React, TypeScript, Node test runner, Tailwind CSS.

## Global Constraints

- One company has exactly one business type; all new endpoints remain guarded by `EVENT_DECORATION`.
- All authenticated decoration company admins and employees may manage this configuration for the current release.
- Company Profile mutation remains company-admin only; employees receive a read-only profile view.
- Existing banquet Settings, bookings, calendar, and inquiry behavior must not change.
- Halls are optional for both `HOTEL` and `VENUE`.
- Function Name is hidden in decoration forms but retained as an immutable historical snapshot.
- All routes must remain compatible with static deployment; state and identifiers use query strings.
- Every task ends with focused tests, lint/build verification, a migration check where applicable, and a commit.

---

### Task 1: Location type model, validation, and idempotent migration

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/schemas/decoration-venue.schema.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/dto/decoration-configuration.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-configuration.utils.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-configuration.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-location-types.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-location-types.spec.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces: `DecorationLocationType = 'HOTEL' | 'VENUE'` and required `type` on mapped location responses.
- Produces: `migrate:decoration-location-types` supporting `--dry-run` and idempotent reruns.

- [x] **Step 1: Write failing schema/DTO/migration tests**

```ts
it('defaults an existing untyped location to VENUE', () => {
  expect(buildLocationTypeMigration({ name: 'Party Plot' })).toEqual({ type: 'VENUE' });
});

it('accepts HOTEL and rejects arbitrary location types', async () => {
  await expect(validateDto(CreateDecorationVenueDto, { name: 'Grand', type: 'HOTEL' })).resolves.toBeDefined();
  await expect(validateDto(CreateDecorationVenueDto, { name: 'Grand', type: 'OTHER' })).rejects.toBeDefined();
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `cd apps/BBS-BE && npm test -- decoration-configuration.spec.ts migrate-decoration-location-types.spec.ts --runInBand`
Expected: FAIL because `type` and the migration helper do not exist.

- [x] **Step 3: Add the model and DTO contract**

```ts
export enum DecorationLocationType { HOTEL = 'HOTEL', VENUE = 'VENUE' }

@Prop({ type: String, enum: DecorationLocationType, required: true, default: DecorationLocationType.VENUE, index: true })
type!: DecorationLocationType;

export class CreateDecorationVenueDto {
  @IsString() @MaxLength(150) name!: string;
  @IsEnum(DecorationLocationType) type!: DecorationLocationType;
  // existing address and halls fields remain
}
```

- [x] **Step 4: Implement dry-run migration and package command**

The script updates only documents where `type` is missing, reports `matched`, `updated`, and `invalid`, and verifies no untyped records remain after a real run. Add `"migrate:decoration-location-types": "ts-node src/scripts/migrate-decoration-location-types.ts"`.

- [x] **Step 5: Verify, migrate, reconcile, and commit**

```bash
npm test -- decoration-configuration.spec.ts migrate-decoration-location-types.spec.ts --runInBand
npm run build
npm run migrate:decoration-location-types -- --dry-run
npm run migrate:decoration-location-types
npm run migrate:decoration-location-types -- --dry-run
git add src/modules/decoration-configuration src/scripts/migrate-decoration-location-types* package.json
git commit -m "Add decoration location types"
```

Expected final dry-run: `updated: 0`, `invalid: 0`.

### Task 2: Configuration access, normalized concurrency, and audit source

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-configuration.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-event-types.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-venues.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-configuration/decoration-configuration.spec.ts`

**Interfaces:**
- Consumes: authenticated `EVENT_DECORATION` user and tenant-scoped models.
- Produces: configuration mutations available to both company admins and employees without permission metadata.
- Produces: create methods accepting audit source `SETTINGS | INQUIRY_FORM` and duplicate recovery.

- [x] **Step 1: Add failing authorization, tenant, duplicate, and audit tests**

```ts
it('allows an authenticated decoration employee to create configuration', async () => {
  expect(await controller.createEventType({ user: employee }, { name: 'Wedding' }, 'INQUIRY_FORM')).toMatchObject({ data: { name: 'Wedding' } });
});

it('returns the tenant record when concurrent normalized creation loses the unique-index race', async () => {
  model.create.mockRejectedValueOnce({ code: 11000 });
  model.findOne.mockResolvedValueOnce(existingTenantRecord);
  expect((await service.create(user, { name: ' WEDDING ' }, 'INQUIRY_FORM')).id).toBe(existingTenantRecord.id);
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- decoration-configuration.spec.ts --runInBand`
Expected: FAIL on permission metadata, source metadata, and duplicate recovery.

- [x] **Step 3: Remove configuration permission decorators but retain guards**

Keep `JwtAuthGuard`, `RolesGuard`, `BusinessTypeGuard`, company-admin/employee roles, and `EVENT_DECORATION`. Remove controller-level `DECORATION_CONFIGURATION_VIEW` and mutation-level `DECORATION_CONFIGURATION_MANAGE` requirements only for this controller.

- [x] **Step 4: Implement safe create-or-resolve and audit source**

Normalize using the existing helper, attempt create, and on Mongo error `11000` re-read by `{ restaurantId, normalizedName }`. Reject a conflicting inactive record with a clear message instead of silently reactivating it. Include `{ source: 'SETTINGS' | 'INQUIRY_FORM' }` in audit metadata.

- [x] **Step 5: Verify and commit**

```bash
npm test -- decoration-configuration.spec.ts --runInBand
npm run lint
npm run build
git add src/modules/decoration-configuration
git commit -m "Open guarded decoration configuration management"
```

### Task 3: Derive Function Name from Event Type on the server

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/dto/decoration-booking.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-domain.spec.ts`

**Interfaces:**
- Booking create no longer requires `functionName`.
- Booking create/update snapshots the resolved Event Type name when `eventTypeId` changes.
- Existing `functionName` response/search/report fields remain intact.

- [x] **Step 1: Add failing snapshot compatibility tests**

```ts
it('derives functionName from the selected event type', async () => {
  eventTypeModel.findOne.mockResolvedValue(eventType({ name: 'Ring Ceremony' }));
  const result = await service.create(user, dtoWithoutFunctionName);
  expect(result.data.functionName).toBe('Ring Ceremony');
});

it('does not rewrite historical snapshots after configuration rename', async () => {
  expect(mapDecorationBookingRecord(existingBooking).functionName).toBe('Old Wedding Name');
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test -- decoration-booking-domain.spec.ts decoration-booking-view.spec.ts --runInBand`
Expected: FAIL because the DTO and payload still require client `functionName`.

- [x] **Step 3: Make the field compatibility-only and derive it in payload construction**

```ts
// Create DTO: remove functionName. Update DTO: retain optional functionName only for old deployed clients.
functionName: references.eventType.name,
```

When an update does not change `eventTypeId`, retain the stored snapshot. When it changes, snapshot the newly resolved name.

- [x] **Step 4: Run the full booking regression and commit**

```bash
npm test -- decoration-booking-domain.spec.ts decoration-booking-view.spec.ts decoration-calendar.spec.ts --runInBand
npm run lint
npm run build
git add src/modules/decoration-bookings
git commit -m "Derive decoration function name snapshots"
```

### Task 4: Decoration Settings shell and Company Profile parity

**Files:**
- Create: `apps/BBS-FE/app/(app)/decoration/settings/page.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/decoration-settings.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/company-profile-section.tsx`
- Create: `apps/BBS-FE/lib/decoration/settings-view.ts`
- Create: `apps/BBS-FE/lib/decoration/settings-view.test.mjs`
- Modify: `apps/BBS-FE/components/layouts/app-layout.tsx`
- Replace: `apps/BBS-FE/app/(app)/decoration/configuration/page.tsx`

**Interfaces:**
- Consumes: `fetchMyRestaurant`, `updateMyRestaurantBranding`, `uploadLogo`, and auth session setter.
- Produces: static `/decoration/settings?tab=profile|events|venues` and compatibility navigation from `/decoration/configuration`.

- [x] **Step 1: Add failing tab and branding normalization tests**

```js
test('unknown tab falls back to profile', () => assert.equal(normalizeDecorationSettingsTab('other'), 'profile'));
test('requires company name and at least one contact number', () => {
  assert.deepEqual(validateCompanyProfile({ name: '', contactNumbers: '' }), { name: 'Company name is required', contactNumbers: 'Add at least one contact number' });
});
```

- [x] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types lib/decoration/settings-view.test.mjs`
Expected: FAIL because the view helpers do not exist.

- [x] **Step 3: Build the Settings shell and profile card**

Match banquet Settings card spacing, eyebrow, headings, labels, upload control, preview, validation, loading button, success/error states, and responsive grid. Use decoration copy (`Company Branding`, `Company Name`). Update `restaurantLogoUrl` in the auth session after save. Render the same saved values read-only for employees; only company admins receive upload and Save controls.

- [x] **Step 4: Update navigation and compatibility route**

Replace decoration `Configuration` nav with `Settings` at `/decoration/settings`. The old page uses `router.replace('/decoration/settings')` after mount and renders a loader while redirecting, preserving static export.

- [x] **Step 5: Verify and commit**

```bash
node --test --experimental-strip-types lib/decoration/settings-view.test.mjs
npm run lint
npm run build
git add app/\(app\)/decoration/settings app/\(app\)/decoration/configuration components/decoration/settings lib/decoration/settings-view* components/layouts/app-layout.tsx
git commit -m "Add decoration settings and company profile"
```

### Task 5: Event Type and Location/Hall Settings panels

**Files:**
- Create: `apps/BBS-FE/components/decoration/settings/event-types-section.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/locations-section.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/configuration-modal.tsx`
- Modify: `apps/BBS-FE/components/decoration/settings/decoration-settings.tsx`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Extend: `apps/BBS-FE/lib/decoration/settings-view.ts`, `settings-view.test.mjs`

**Interfaces:**
- Adds `DecorationLocationType` and `type` to `DecorationVenue`.
- Settings mutations send audit query/body source `SETTINGS`.

- [x] **Step 1: Add failing filtering and duplicate-client-guard tests**

```js
test('filters halls to active children of the selected location', () => {
  assert.deepEqual(activeHalls(venues, 'hotel-1').map(x => x.id), ['hall-1']);
});
test('normalizes names before duplicate checks', () => assert.equal(hasNormalizedDuplicate([{name:'Grand Hall'}], ' grand  hall '), true));
```

- [x] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types lib/decoration/settings-view.test.mjs`
Expected: FAIL on missing helpers and location type.

- [x] **Step 3: Implement banquet-style Event Type management**

Provide search, include-inactive, add/edit modal, display order, active badge, and activate/deactivate confirmation. Show explicit empty, loading, retry, duplicate, and busy states.

- [x] **Step 4: Implement typed Location and nested Hall management**

Location form requires name and `HOTEL | VENUE`, accepts optional address and initial hall names. Location cards show type badges and nested hall chips/actions. Hall mutations always include the parent location ID.

- [x] **Step 5: Verify and commit**

```bash
node --test --experimental-strip-types lib/decoration/settings-view.test.mjs
npm run lint
npm run build
git add components/decoration/settings lib/decoration/settings-view* lib/auth
git commit -m "Build decoration configuration settings"
```

### Task 6: Cascading Other options and bounded inquiry save

**Files:**
- Modify: `apps/BBS-FE/components/decoration/decoration-inquiry-form.tsx`
- Modify: `apps/BBS-FE/lib/decoration/inquiry-form.ts`
- Modify: `apps/BBS-FE/lib/decoration/inquiry-form.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/api.ts`

**Interfaces:**
- Produces: `resolveDecorationInquiryConfiguration(token, values)` returning resolved `eventTypeId`, `venueId`, and `hallId`.
- Booking payload excludes `functionName` and contains only resolved configuration IDs.

- [ ] **Step 1: Add failing cascading and payload tests**

```js
test('changing location clears a hall from the previous location', () => {
  assert.equal(changeInquiryLocation(valuesWithHall, 'venue-2').hallId, '');
});
test('custom event and location fields are required only for Other', () => {
  const errors = validateDecorationInquiry({ ...valid, eventTypeId: OTHER_ID, customEventTypeName: '' });
  assert.equal(errors.customEventTypeName, 'Enter an event type');
});
test('booking payload never contains functionName', () => {
  assert.equal('functionName' in buildDecorationBookingPatch(null, valid), false);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test --experimental-strip-types lib/decoration/inquiry-form.test.mjs`
Expected: FAIL on missing Other fields, cascading helper, and legacy payload.

- [ ] **Step 3: Implement the form state machine**

Use sentinel `__OTHER__`. Event Type Other reveals one required name. Location Other reveals name, required type, optional address, and optional new hall. Existing locations expose only their active halls; show `Other Hall` last. Hide Hall when no active halls while showing an `Add Hall` action.

- [ ] **Step 4: Implement bounded sequential submission**

Resolve custom Event Type, then custom Location, then custom Hall, preserving every returned ID in form state. Only after all configuration resolves call `saveDecorationBooking`. If booking save fails, keep the modal open with resolved selections and all entered values. Disable every mutation control while submitting.

- [ ] **Step 5: Implement Edit Inquiry parity**

Hydrate values from the booking snapshot, preserve the existing parent sidebar/detail context, send only changed fields, and use the same cascading controls. Dirty close requires confirmation.

- [ ] **Step 6: Verify and commit**

```bash
node --test --experimental-strip-types lib/decoration/inquiry-form.test.mjs
npm run lint
npm run build
git add components/decoration/decoration-inquiry-form.tsx lib/decoration/inquiry-form* lib/auth/api.ts
git commit -m "Add cascading decoration inquiry configuration"
```

### Task 7: Audit, tenant, end-to-end, and banquet regression closure

**Files:**
- Modify: relevant backend specs under `apps/BBS-BE/src/modules/decoration-*`
- Modify: relevant frontend tests under `apps/BBS-FE/lib/decoration`
- Modify: `apps/BBS-FE/docs/superpowers/plans/2026-07-17-decoration-settings-and-inquiry-configuration.md`

**Interfaces:**
- Verifies the complete specification without adding new product behavior.

- [ ] **Step 1: Add missing integration assertions**

Cover cross-tenant ID rejection, inactive configuration rejection, concurrent normalized create, audit source, profile update, Other Event Type, Other Location with and without Hall, parent-only Hall filtering, event snapshot stability, and retry after partial workflow success.

- [ ] **Step 2: Run backend regression**

```bash
cd apps/BBS-BE
npm test -- --runInBand
npm run lint
npm run build
npm run migrate:decoration-location-types -- --dry-run
```

Expected: all tests pass; lint has no new warnings; migration reports `updated: 0`, `invalid: 0`.

- [ ] **Step 3: Run frontend regression and static build**

```bash
cd apps/BBS-FE
node --test --experimental-strip-types lib/decoration/*.test.mjs
npm run lint
npm run build
```

Expected: all tests pass and every decoration route is listed as static.

- [ ] **Step 4: Perform focused responsive manual checks**

At 390 px, 768 px, and 1440 px verify Settings tabs, profile upload, Event Type modal, Location/Hall modal, Add Inquiry Other flows, selected-date prefilling, dirty close, API error retention, and no horizontal overflow. Verify a banquet company still sees its unchanged Settings and booking form.

- [ ] **Step 5: Mark checklist complete and commit**

```bash
git add docs/superpowers/plans/2026-07-17-decoration-settings-and-inquiry-configuration.md
git commit -m "Complete decoration settings regression checklist"
```
