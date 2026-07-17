# Decoration Detail, Catalog, and Selection Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Complete and commit each task before starting the next one.

**Goal:** Finish the mobile-first decoration Event Detail, advance ledger, Settings catalog, and popup selection workflow with banquet-equivalent overlay behavior while preserving decoration/banquet data isolation.

**Architecture:** Keep the existing decoration catalog, S3 image, booking, reservation, audit, and conflict services. Extract reusable frontend catalog and selection components from their current static pages, mount them in Settings and Event Detail overlays, and leave query-string pages as refresh/direct-link hosts. Add small pure view-model modules for action visibility, advance rows, and selection state so status, permission, and responsive behavior can be tested without rendering the full Next.js application.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node test runner with `tsx`; NestJS 11, Mongoose, MongoDB transactions, class-validator, AWS S3/Sharp.

---

## Global Constraints

- Work only on the existing `feature/event-decoration-management` branches in `apps/BBS-FE` and `apps/BBS-BE`.
- Do not change banquet order, menu, hall-slot, payment, follow-up, or report code paths.
- Keep all browser URLs static-export compatible: use `?bookingId=...` and `?tab=decoration`; do not add dynamic route folders.
- Use only decoration permissions and decoration endpoints. The frontend must hide unauthorized actions, and the backend remains the authority.
- Preserve loaded Calendar → Day Sidebar → Event Detail state while opening child modals.
- Retain user input on upload, availability, conflict, and save errors.
- Do not add a migration unless a persisted schema or index changes. This plan changes response fidelity and UI composition, not collection shape.
- After each task: run the focused tests, inspect `git diff --check`, commit only that task, then continue.

## Task 1: Make Saved Decoration Snapshots Category-Accurate and Return the Updated Booking

**Files:**

- Modify: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.module.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Test: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.service.spec.ts`
- Test: `apps/BBS-BE/src/modules/decoration-selection/decoration-snapshot.spec.ts`

- [ ] **Step 1: Write failing service tests**

Create a focused mocked service test proving that:

1. two selected items in the same category are both retained;
2. each snapshot line receives the real tenant-owned category name, never the placeholder `Decoration`;
3. a selected image must belong to that item;
4. custom lines remain under `Custom Decoration`;
5. the response contains the freshly mapped booking with `DECORATION_SELECTED`, the snapshot, payment/follow-up data, and totals;
6. a category missing from the tenant-scoped category lookup fails before the transaction commits.

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```bash
cd apps/BBS-BE
npx tsx --test src/modules/decoration-reservations/decoration-reservations.service.spec.ts src/modules/decoration-selection/decoration-snapshot.spec.ts
```

Expected: failures for the hard-coded category name and reservation-only response.

- [ ] **Step 3: Load categories inside the reservation transaction**

Inject the `DecorationCategory` model through `decoration-reservations.module.ts`. In `replace`, query active/inactive category records by `restaurantId` and the category IDs referenced by the selected tenant-owned items. Build `Map<string, string>` and set:

```ts
categoryId: item.categoryId.toString(),
categoryName: categoryNames.get(item.categoryId.toString())!,
```

Keep category lookup tenant-scoped and transaction-bound. Historical item/category activation state must not prevent editing an existing booking unless the selected item itself is no longer selectable.

- [ ] **Step 4: Return the updated booking projection**

Expose or reuse a decoration-booking mapping method rather than duplicating the public response shape. Return:

```ts
data: {
  booking: mappedBooking,
  reservations: mappedReservations,
}
```

Do not refetch outside the transaction. Preserve the current audit event and ensure audit failure behavior remains consistent with the existing service contract.

- [ ] **Step 5: Verify backend behavior**

Run:

```bash
npx tsx --test src/modules/decoration-reservations/decoration-reservations.service.spec.ts src/modules/decoration-selection/decoration-snapshot.spec.ts
npm run build
git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/decoration-reservations src/modules/decoration-selection src/modules/decoration-bookings/decoration-bookings.service.ts
git commit -m "fix(decoration): preserve category names in selection snapshots"
```

## Task 2: Add Pure Event Detail Action and Advance View Models

**Files:**

- Create: `apps/BBS-FE/lib/decoration/event-detail-view.ts`
- Create: `apps/BBS-FE/lib/decoration/event-detail-view.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`

- [ ] **Step 1: Write failing policy tests**

Cover the exact action matrix:

- inquiry: edit, follow-up, confirm; no selection or customer document;
- confirmed without snapshot: edit, advance, follow-up, choose; no customer document;
- confirmed/later with snapshot: edit, advance, follow-up, edit selection, view/download/print;
- cancelled/closed: read-only permitted document actions only when a snapshot exists;
- each action is removed when its permission is absent.

Cover advance rows for empty payments, date-descending order, stable IDs, INR amounts, remarks, and recorded-by fallback.

- [ ] **Step 2: Run and confirm RED**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/event-detail-view.test.mjs
```

- [ ] **Step 3: Implement the pure helpers**

Export typed functions such as:

```ts
getDecorationDetailActions(booking, capabilities)
getDecorationAdvanceSummary(booking)
getDecorationAdvanceRows(booking)
canShowCustomerDocument(booking)
```

Use `booking.payments` as the immutable ledger source and `packageRate`, `totalCollected`, and `outstandingAmount` as the summary source.

- [ ] **Step 4: Add the payment API contract**

Add `DecorationPaymentPayload` and:

```ts
addDecorationPayment(token, bookingId, payload): Promise<DecorationBooking>
```

against `POST /decoration/bookings/:id/payments`. Keep booking IDs URL-encoded in the API path and never expose them as static route segments.

- [ ] **Step 5: Verify and commit**

```bash
npx tsx --test lib/decoration/event-detail-view.test.mjs
npx tsc --noEmit
git diff --check
git add lib/decoration/event-detail-view.ts lib/decoration/event-detail-view.test.mjs lib/auth/types.ts lib/auth/api.ts
git commit -m "feat(decoration): define event detail action and advance policies"
```

## Task 3: Implement the Banquet-Style Event Detail Body, Advance Ledger, and Bottom Actions

**Files:**

- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-advance-ledger.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-payment-modal.tsx`
- Create: `apps/BBS-FE/lib/decoration/payment-form.ts`
- Create: `apps/BBS-FE/lib/decoration/payment-form.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/decoration-workspace.tsx`

- [ ] **Step 1: Write payment-form tests first**

Test positive amount, two-decimal limit, required date/mode, outstanding-limit rejection, whitespace normalization, optional remark, and duplicate-submit blocking state.

- [ ] **Step 2: Run and confirm RED**

```bash
npx tsx --test lib/decoration/payment-form.test.mjs lib/decoration/event-detail-view.test.mjs
```

- [ ] **Step 3: Build the advance ledger**

Render package, received, and pending summary cards. Render a semantic table at `sm` and above with Date, Amount, Mode, Remark, Recorded By. Render stacked cards below `sm`. Show an explicit `No advance payments recorded` state.

- [ ] **Step 4: Build Add Advance as a child modal**

Use the existing decoration payment endpoint only. Disable submit while saving, retain entered values after an error, and return the updated `DecorationBooking` through `onSaved`. Closing returns to Event Detail.

- [ ] **Step 5: Restructure Event Detail**

Match the approved banquet hierarchy:

- identity/status header;
- customer and event information;
- venue/date/time details;
- payment summary and ledger;
- category-grouped decoration snapshot;
- follow-ups/activity;
- sticky bottom action bar at mobile, tablet, and desktop.

Remove the desktop header actions. Add bottom padding equal to the action bar height. Replace navigation links for child workflows with local modal state. Customer View/Download/Print must use `canShowCustomerDocument` and query-string URLs.

- [ ] **Step 6: Preserve overlay ancestry**

Ensure payment save calls `onUpdated`, refreshes the currently displayed booking/card, and leaves the selected-date sidebar mounted. Escape/backdrop close only the top child.

- [ ] **Step 7: Verify and commit**

```bash
npx tsx --test lib/decoration/payment-form.test.mjs lib/decoration/event-detail-view.test.mjs lib/decoration/overlay-state.test.mjs
npx tsc --noEmit
npm run build
git diff --check
git add components/decoration/decoration-event-detail-modal.tsx components/decoration/decoration-advance-ledger.tsx components/decoration/decoration-payment-modal.tsx components/decoration/decoration-workspace.tsx lib/decoration/payment-form.ts lib/decoration/payment-form.test.mjs
git commit -m "feat(decoration): complete event detail and advance workflow"
```

## Task 4: Move Decoration Catalog Management into Settings

**Files:**

- Create: `apps/BBS-FE/components/decoration/settings/decoration-catalog-section.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/decoration-category-modal.tsx`
- Create: `apps/BBS-FE/components/decoration/settings/decoration-item-modal.tsx`
- Create: `apps/BBS-FE/lib/decoration/catalog-form.ts`
- Create: `apps/BBS-FE/lib/decoration/catalog-form.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/settings/decoration-settings.tsx`
- Modify: `apps/BBS-FE/lib/decoration/settings-view.ts`
- Modify: `apps/BBS-FE/lib/decoration/settings-view.test.mjs`
- Modify: `apps/BBS-FE/app/(app)/decoration/catalog/page.tsx`

- [ ] **Step 1: Write failing tab and catalog validation tests**

Test `?tab=decoration` normalization, invalid-tab fallback, category normalization, item required fields, bulk/tagged quantity invariants, maintenance bounds, unique tagged unit codes, nonnegative timing buffers, and default mobile/logistics values.

- [ ] **Step 2: Run and confirm RED**

```bash
npx tsx --test lib/decoration/settings-view.test.mjs lib/decoration/catalog-form.test.mjs
```

- [ ] **Step 3: Add the Decoration Settings tab**

Add `{ id: 'decoration', label: 'Decoration' }`, route it via `/decoration/settings?tab=decoration`, and mount `DecorationCatalogSection`. Keep profile/events/venues unchanged.

- [ ] **Step 4: Extract category management**

Move category list/search/include-inactive/add/edit/activate/deactivate behavior from the current catalog page into reusable components. Use readable action colors, wrapped mobile action rows, loading skeleton, empty state, retry, and permission-aware controls.

- [ ] **Step 5: Extract item management**

Show type-first navigation and items within the selected type. The item form exposes name, description, quantity, and images first; tracking, tagged units, setup/removal/turnaround, and storage fields are under an `Advanced inventory and logistics` disclosure.

Do not flatten type and item records. Allow multiple items under the same category and keep normalized tenant-scoped uniqueness enforced by the API.

- [ ] **Step 6: Keep the old static route as a compatibility host**

Replace the duplicated catalog-page implementation with a thin component that navigates to or renders the Settings Decoration tab. Do not create dynamic paths.

- [ ] **Step 7: Verify and commit**

```bash
npx tsx --test lib/decoration/settings-view.test.mjs lib/decoration/catalog-form.test.mjs
npx tsc --noEmit
npm run build
git diff --check
git add components/decoration/settings lib/decoration/settings-view.ts lib/decoration/settings-view.test.mjs lib/decoration/catalog-form.ts lib/decoration/catalog-form.test.mjs 'app/(app)/decoration/catalog/page.tsx'
git commit -m "feat(decoration): manage decoration catalog from settings"
```

## Task 5: Complete Catalog Image, Quantity, and Mobile Management

**Files:**

- Modify: `apps/BBS-FE/components/decoration/settings/decoration-catalog-section.tsx`
- Modify: `apps/BBS-FE/components/decoration/settings/decoration-item-modal.tsx`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Create: `apps/BBS-FE/lib/decoration/catalog-images.ts`
- Create: `apps/BBS-FE/lib/decoration/catalog-images.test.mjs`
- Test: `apps/BBS-BE/src/modules/upload/upload-decoration.spec.ts`
- Test: `apps/BBS-BE/src/modules/decoration-catalog/decoration-inventory.spec.ts`

- [ ] **Step 1: Write image-state tests**

Cover JPEG/PNG/WebP acceptance, unsupported MIME, empty/corrupt client selection, 8 MB limit, 12-image limit, cover fallback, remove-cover fallback, upload-in-progress disabling, and failed-upload preservation of the saved item.

- [ ] **Step 2: Add typed image APIs**

Expose upload, set-cover, and delete-image functions matching the existing backend endpoints. Add `key`, MIME, and size to the frontend image type where returned by the API.

- [ ] **Step 3: Build mobile camera/gallery image controls**

Use a touch-sized file action with `accept="image/jpeg,image/png,image/webp"`; offer camera capture without preventing gallery selection. Show upload progress/busy state, retryable failure, thumbnails, cover badge, Set Cover, and Remove. Use a visual placeholder when an image fails to load.

- [ ] **Step 4: Verify storage isolation and cleanup tests**

Confirm backend tests cover generated keys under `decoration/{companyId}/catalog/{itemId}/...`, cross-company rejection, corrupt image rejection, upload-size limits, concurrent 12-image enforcement, S3 cleanup after a failed database update, and inventory bounds.

- [ ] **Step 5: Verify and commit**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/catalog-images.test.mjs lib/decoration/catalog-form.test.mjs
npx tsc --noEmit
cd ../BBS-BE
npx tsx --test src/modules/upload/upload-decoration.spec.ts src/modules/decoration-catalog/decoration-inventory.spec.ts
npm run build
git diff --check
```

Commit backend test strengthening separately if it changes, then commit the frontend catalog image work.

## Task 6: Extract a Resilient Decoration Selection State Model

**Files:**

- Create: `apps/BBS-FE/lib/decoration/selection-state.ts`
- Create: `apps/BBS-FE/lib/decoration/selection-state.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/lib/auth/types.ts`

- [ ] **Step 1: Write failing selection tests**

Test:

- multiple different items under one category;
- category switching preserves all choices;
- quantity is clamped/rejected against current availability;
- per-item image/description remains independent;
- existing snapshots hydrate choices and custom rows;
- selected summary count/quantity;
- custom name, quantity, image, and optional description validation;
- payload normalization trims text and excludes empty optional fields;
- save conflicts retain the original state;
- allowed status rules exactly match the backend.

- [ ] **Step 2: Run and confirm RED**

```bash
npx tsx --test lib/decoration/selection-state.test.mjs
```

- [ ] **Step 3: Implement immutable reducers/builders**

Represent configured choices by `itemId`, not category ID, so multiple same-type items are valid. Export hydration, toggle/update, validation, summary, and payload-building helpers. Never clear choices when a category filter changes.

- [ ] **Step 4: Type the reservation response**

Change `saveDecorationSelection` from `unknown` to:

```ts
{
  booking: DecorationBooking;
  reservations: DecorationReservationResult[];
}
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsx --test lib/decoration/selection-state.test.mjs
npx tsc --noEmit
git diff --check
git add lib/decoration/selection-state.ts lib/decoration/selection-state.test.mjs lib/auth/api.ts lib/auth/types.ts
git commit -m "feat(decoration): add resilient selection state model"
```

## Task 7: Replace Selection Navigation with a Mobile-First Popup

**Files:**

- Create: `apps/BBS-FE/components/decoration/decoration-selection-modal.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-selection-item-card.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-custom-item-editor.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/app/(app)/decoration/selection/page.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-snapshot-gallery.tsx`

- [ ] **Step 1: Build the popup shell**

Use a full-screen mobile dialog and banquet-equivalent centered tablet/desktop dialog. Include horizontally scrollable type chips, a visible selected summary, retryable loading/error states, and a sticky save bar. Lock background scrolling and restore focus to Choose/Edit Decoration on close.

- [ ] **Step 2: Render type-first item selection**

Only show active items for the selected type. Each selected item owns quantity, optional description, and selected image. Switching types must not alter hidden selections. Show current available quantity but treat it as advisory; the server transaction is final.

- [ ] **Step 3: Implement custom item capture**

Support name, quantity, optional description, and one required camera/gallery image. Upload to the existing booking-scoped endpoint before save, show progress and errors, and retain the custom row after recoverable failure. Never accept an image key from another booking/company.

- [ ] **Step 4: Save without leaving Event Detail**

On success, use the returned booking to update Event Detail and the selected-date card, then close only the selection popup. On a 409 conflict, show the item-specific server message and retain all configured/custom choices.

- [ ] **Step 5: Keep a query-string recovery host**

Refactor `selection/page.tsx` into a thin static host reading `?bookingId=` and rendering the same modal/content component. Invalid/missing IDs show an actionable state. Normal Calendar flow must never navigate here.

- [ ] **Step 6: Verify snapshot presentation**

Ensure Event Detail groups by real category, supports multiple items per category, labels custom rows, displays quantity/description, and falls back from selected image → cover/catalog image → neutral placeholder without layout shift.

- [ ] **Step 7: Verify and commit**

```bash
npx tsx --test lib/decoration/selection-state.test.mjs lib/decoration/snapshot-view.test.mjs lib/decoration/event-detail-view.test.mjs lib/decoration/overlay-state.test.mjs
npx tsc --noEmit
npm run build
git diff --check
git add components/decoration app/'(app)'/decoration/selection/page.tsx
git commit -m "feat(decoration): select decorations in event detail popup"
```

## Task 8: Customer Document Gating and Output Parity

**Files:**

- Modify: `apps/BBS-FE/app/(app)/decoration/print/page.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/lib/decoration/event-detail-view.ts`
- Modify: `apps/BBS-FE/lib/decoration/event-detail-view.test.mjs`
- Modify: `apps/BBS-BE/src/modules/decoration-print/decoration-print.controller.ts` (only if server-side authorization is not already enforced)
- Test: `apps/BBS-BE/src/modules/decoration-print/decoration-print.spec.ts`

- [ ] **Step 1: Add negative document tests**

Prove an inquiry, confirmed booking without a snapshot, cancelled booking without a snapshot, other-company booking, and banquet tenant cannot obtain a decoration customer document. Prove confirmed/later with at least one snapshot line can view/print/download.

- [ ] **Step 2: Enforce the invariant in UI and API**

UI hiding is convenience only. The print/data endpoint must reject documents unless status is confirmed-or-later and `decorationSnapshot.length > 0`. Use the immutable snapshot, not live catalog data.

- [ ] **Step 3: Align view/download/print query strings**

Use one filtered document definition and `?bookingId=...&mode=view|download|print`. Preserve static export and robust image fallback. Do not expose banquet menus or hall-slot content.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/BBS-BE
npx tsx --test src/modules/decoration-print/decoration-print.spec.ts
npm run build
cd ../BBS-FE
npx tsx --test lib/decoration/event-detail-view.test.mjs lib/decoration/snapshot-view.test.mjs
npm run build
git diff --check
```

Commit backend and frontend changes independently.

## Task 9: Full Regression, Responsive, Slow-Network, and Migration Check

**Files:**

- Modify: `apps/BBS-FE/docs/superpowers/specs/2026-07-17-decoration-workflow-parity-design.md` only to mark verified acceptance items, not to change requirements
- Modify: project implementation checklist if one exists for Features 12/13

- [ ] **Step 1: Run every decoration frontend unit test**

```bash
cd apps/BBS-FE
npx tsx --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

- [ ] **Step 2: Run every decoration backend spec and build**

```bash
cd apps/BBS-BE
npx tsx --test 'src/modules/decoration-*/**/*.spec.ts'
npm run lint
npm run build
```

If the shell glob is unsupported, enumerate files with `rg --files src/modules | rg 'decoration-.+\.spec\.ts$'` and pass the resulting paths to `npx tsx --test`.

- [ ] **Step 3: Verify banquet regression**

Run the existing booking/calendar/detail tests and build in both repositories. Confirm no banquet files were modified unintentionally:

```bash
git diff --name-only <branch-base>...HEAD
```

Any banquet modification requires explicit justification and its focused regression tests.

- [ ] **Step 4: Manual viewport matrix**

Verify at 390×844, 768×1024, and 1440×900:

1. Settings → Decoration: add type, add two sofa items, upload/select/remove cover image, quantities and advanced logistics;
2. Calendar → date sidebar → Event Detail → Add Advance → close/save returns one layer;
3. Event Detail → Choose Decoration → select two sofa items + custom camera/gallery item → save;
4. snapshot groups both sofa items, custom item, quantities, descriptions, and fallbacks;
5. bottom actions remain visible without covering content;
6. View/Download/Print are absent before snapshot and present after;
7. no horizontal overflow, clipped actions, or unreadable controls.

- [ ] **Step 5: Slow-network and failure matrix**

Throttle requests and verify loaded content remains visible during refresh, category switching never clears selections, failed upload/save retains fields, duplicate save is disabled, a reservation conflict retains the popup, and closing children preserves the date sidebar.

- [ ] **Step 6: Database and migration verification**

Confirm no schema/index file changed. Therefore no new migration is required. In MongoDB, verify new selections affect only:

- `decorationbookings` snapshot/payment fields;
- `decorationreservations` active/released reservation rows;
- `decorationcategories` and `decorationitems` catalog records;
- shared `auditlogs` with decoration module/entity names.

Confirm no `orders`, banquet menu snapshot, or banquet advance record changes.

- [ ] **Step 7: Final diff review and checklist update**

Run `git diff --check`, search for `TODO|FIXME|TBD`, verify all new exported interfaces are used, verify every async action has loading/error handling, and update the feature checklist only after all automated and manual checks pass.

- [ ] **Step 8: Final commits**

Commit verification/checklist updates separately in each repository. Do not squash the task-level commits until review is complete.

## Plan Self-Review

- Every approved requirement is mapped: bottom Event Detail actions, conditional customer documents, advance ledger and popup, Settings catalog, category → multiple items, quantities, descriptions, images, custom items, popup selection, S3 ownership, reservation conflicts, immutable snapshots, static deployment, and mobile/tablet behavior.
- Backend work is limited to response/snapshot correctness and server-side document enforcement; existing transactional inventory logic is reused.
- No placeholder steps, `TBD` decisions, or dynamic-route assumptions remain.
- No collection or index change is planned, so an unnecessary migration is explicitly avoided and database isolation is still verified.
- Each implementation task begins with a failing test, includes focused verification, and ends with a scoped commit.
