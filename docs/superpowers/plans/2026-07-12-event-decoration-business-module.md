# Event Decoration Business Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready Event Decoration business module to the existing platform while keeping banquet behavior unchanged and business data isolated.

**Architecture:** Add an immutable company business type and route each tenant into one of two bounded modules. Reuse shared authentication, RBAC, customer, audit, payment, follow-up and S3 primitives; store decoration bookings, catalog, reservations and reports in dedicated collections and APIs.

**Tech Stack:** NestJS 11, Mongoose 8, Next.js 16, React 19, TypeScript, AWS S3, existing RBAC/audit infrastructure.

## Global Constraints

- A company supports exactly one business type: `BANQUET` or `EVENT_DECORATION`.
- Existing banquet behavior and data remain backward-compatible; existing companies default to `BANQUET`.
- Business type cannot change after operational records exist.
- Decoration records use separate collections and endpoints.
- Backend business-type guards are mandatory in addition to frontend visibility.
- No hard delete for referenced configuration, catalog or booking records.
- Inventory confirmation is atomic and safe under concurrent requests.
- All new screens are mobile-first and tablet-ready.
- Version one has package pricing only, with no decoration-item pricing.

---

### Task 1: Business type foundation

**Files:**
- Backend modify: `apps/BBS-BE/src/modules/restaurants/schemas/restaurant.schema.ts`
- Backend modify: restaurant create/update DTOs and service
- Backend create: business-type decorator/guard under `src/common`
- Frontend modify: `apps/BBS-FE/lib/auth/types.ts`, auth context and Super Admin restaurant forms
- Tests: restaurant service and guard specs

**Produces:** `BusinessType = BANQUET | EVENT_DECORATION`, immutable-after-data validation, authenticated business type, backend guard.

- [ ] Add failing tests for default banquet migration behavior, decoration creation, guarded endpoints and forbidden type changes after data exists.
- [ ] Add the enum and restaurant field with `BANQUET` default.
- [ ] Include business type in login/session/current-user responses.
- [ ] Add Super Admin selection and read-only display after operational use.
- [ ] Add and apply a reusable backend business-type guard.
- [ ] Verify existing banquet auth and restaurant tests.

### Task 2: Business-aware navigation, routes and permissions

**Files:**
- Backend modify: permissions registry and seeding
- Frontend modify: app layout/navigation and route guards
- Frontend create: decoration route shell under `app/(app)/decoration`
- Tests: permission registry and route visibility

**Produces:** Decoration permission namespace and business-aware navigation.

- [ ] Define view/create/update/confirm/cancel/follow-up/payment/print/report/catalog/inventory permissions.
- [ ] Seed sensible Company Admin defaults without granting employee permissions implicitly.
- [ ] Hide banquet-only navigation for decoration tenants and vice versa.
- [ ] Reject manual navigation to the wrong module.
- [ ] Verify API requests cannot cross business types.

### Task 3: Event type and venue/hall CRUD

**Files:**
- Backend create: `decoration-event-types`, `decoration-venues` modules, schemas, DTOs, controllers and specs
- Frontend create: configuration pages and API types/client

**Produces:** Tenant-scoped event type, venue and hall APIs with active/deactivated lifecycle.

- [ ] Test tenant isolation, duplicate normalization, referenced-record deactivation and hall filtering.
- [ ] Implement event type CRUD and ordering.
- [ ] Implement venue CRUD with embedded or dedicated hall records and safe uniqueness.
- [ ] Add searchable responsive configuration pages.
- [ ] Add permission-controlled inline create flows used by the inquiry form.

### Task 4: Decoration catalog, images and inventory units

**Files:**
- Backend create: decoration categories/items/images/inventory schemas and module
- Backend reuse/extend: S3 upload service with decoration object prefixes
- Frontend create: categories and catalog pages, image uploader/gallery
- Tests: validation, tenant isolation, S3 key isolation, quantity and maintenance invariants

**Produces:** Category/item CRUD, image lifecycle, bulk/tagged inventory and logistics defaults.

- [ ] Test image type/size restrictions and company-isolated keys.
- [ ] Implement category CRUD/reorder/deactivate.
- [ ] Implement item CRUD with multiple images, cover image and quantity.
- [ ] Implement bulk and individually tagged unit modes.
- [ ] Implement logistics modes and default buffers.
- [ ] Implement maintenance quantity/unit state and prevent negative availability.
- [ ] Add responsive mobile camera/gallery upload with progress and retry.

### Task 5: Decoration booking CRUD and lifecycle

**Files:**
- Backend create: `decoration-bookings` module, schema, DTOs, controller, service and specs
- Frontend create: booking/calendar route, form, list and API client/types

**Produces:** Separate `decoration_bookings` collection and lifecycle APIs.

- [ ] Test required fields, multi-day validation, venue/hall consistency, package rate and tenant scoping.
- [ ] Implement inquiry create/read/update/list/calendar.
- [ ] Store customer, venue, hall, event type and creator snapshots.
- [ ] Implement confirm, cancel, close inquiry and complete transitions.
- [ ] Reuse payment/follow-up behavior through decoration-specific service adapters and audit actions.
- [ ] Build the responsive inquiry form with default slots and inline configuration creation.

### Task 6: Calendar, date sidebar and dashboard

**Files:**
- Frontend create: DecorationCalendar, DecorationDaySidebar and DecorationDashboard components/pages
- Backend create: decoration calendar/dashboard query endpoints and specs

**Produces:** Decoration-specific calendar/day panel/dashboard without banquet hall matrix.

- [ ] Test multi-day calendar coverage and status counts.
- [ ] Add inquiry, confirmed, completed, cancelled, selection-pending and conflict indicators.
- [ ] Build date sidebar cards with venue/hall, slot, payment and selection state.
- [ ] Confirm Hall Slot Status, pax and menu data never render.
- [ ] Build dashboard cards and actionable operational lists.
- [ ] Verify mobile sheet, tablet and desktop layouts.

### Task 7: Atomic inventory reservations

**Files:**
- Backend create: decoration reservation schema/service and concurrency specs
- Backend modify: decoration booking confirm/cancel/complete behavior

**Produces:** Availability query and atomic reservation replacement.

- [ ] Write concurrent tests where two bookings request the final available unit.
- [ ] Calculate effective ranges from setup start through removal completion.
- [ ] Support per-item slot-only, setup-required and mobile-turnaround rules.
- [ ] Include multi-day overlaps and maintenance quantities.
- [ ] Create reservations only for confirmed bookings.
- [ ] Replace selection reservations transactionally; release on cancellation.
- [ ] Keep inventory unavailable until removal/return completion.

### Task 8: Decoration selection and snapshot

**Files:**
- Backend create: selection DTOs/endpoints and snapshot schema
- Frontend create: responsive decoration chooser, custom-item uploader and selection review
- Tests: snapshots, custom items, conflicts and edits

**Produces:** Immutable `decorationSnapshot` and confirmed-event chooser.

- [ ] Test selection is unavailable before confirmation.
- [ ] Implement category filtering, image choice, quantity and descriptions.
- [ ] Implement event-only custom uploads.
- [ ] Show availability for the booking logistics range.
- [ ] Save selection and reservations atomically.
- [ ] Store immutable snapshot data and preserve it after catalog edits.
- [ ] Add mobile sticky summary, tablet split layout and desktop grid.

### Task 9: Event Detail, view, PDF and print

**Files:**
- Frontend create: DecorationEventDetail and DecorationSnapshotGallery
- Frontend create: decoration print route/view
- Backend create/extend: print-detail endpoint if required
- Tests: permissions, snapshot rendering and print completeness

**Produces:** Event Detail with full snapshot plus View, Download PDF and Print.

- [ ] Render event, customer, venue, package/payment, follow-up and activity sections.
- [ ] Render category-grouped snapshot cards with images, quantities and descriptions.
- [ ] Add full-screen mobile gallery and responsive actions.
- [ ] Create customer visual output and internal operational output.
- [ ] Verify historical output remains unchanged after catalog edits.
- [ ] Verify pagination, image loading failure states and print CSS.

### Task 10: Decoration reports

**Files:**
- Backend create: decoration report DTOs/queries/specs
- Frontend create: decoration report dashboard, tables and print/export views

**Produces:** Scoped operational, revenue, payment, follow-up and inventory reports.

- [ ] Implement advance, outstanding, conversion and event-status reports.
- [ ] Implement revenue by event type/venue.
- [ ] Implement usage, utilization, conflicts and maintenance reports.
- [ ] Implement employee-created booking and follow-up performance reports.
- [ ] Add filters, pagination, empty/loading/error states and permission checks.

### Task 11: Audit, observability and cleanup

**Files:**
- Backend modify: shared audit mapping and scheduled cleanup
- Frontend modify: audit filters/labels
- Tests: audit completeness and abandoned upload cleanup

**Produces:** Decoration action history and storage hygiene.

- [ ] Audit every configuration, booking, selection, reservation, payment and status mutation.
- [ ] Mask sensitive customer data in inappropriate audit contexts.
- [ ] Add cleanup for abandoned custom/catalog uploads.
- [ ] Add conflict/error telemetry without exposing customer or S3 secrets.

### Task 12: Migration, regression and rollout

**Files:**
- Backend create: idempotent business-type migration script
- Documentation modify: deployment, environment and operations docs
- Tests: complete backend/frontend regression suites

**Produces:** Safe production rollout with existing tenants unchanged.

- [ ] Backfill existing companies as `BANQUET` and verify counts before/after.
- [ ] Create a decoration pilot tenant and permissions.
- [ ] Run backend unit/build/lint and frontend tests/lint/build.
- [ ] Execute mobile/tablet/desktop end-to-end journeys.
- [ ] Test concurrent reservation, cancellation release, catalog changes and print snapshots.
- [ ] Deploy behind a decoration-module feature flag.
- [ ] Pilot with one company, review audit/conflict data, then enable general onboarding.

## Delivery sequence

1. Foundation and isolation (Tasks 1-2)
2. Configuration and catalog (Tasks 3-4)
3. Booking/calendar/dashboard (Tasks 5-6)
4. Inventory and selection (Tasks 7-8)
5. Event Detail/print/reports (Tasks 9-10)
6. Audit, migration and rollout (Tasks 11-12)

No phase should begin production rollout until its tenant-isolation, permission and regression checks pass.
