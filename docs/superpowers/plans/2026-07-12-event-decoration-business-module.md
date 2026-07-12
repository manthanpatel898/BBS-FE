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
- Decoration import and reporting are separate from existing banquet import/report routes and services.
- Import is preview-first, idempotent and auditable; no records are written before explicit confirmation.

---

### Task 1: Business type foundation

**Files:**
- Backend modify: `apps/BBS-BE/src/modules/restaurants/schemas/restaurant.schema.ts`
- Backend modify: restaurant create/update DTOs and service
- Backend create: business-type decorator/guard under `src/common`
- Frontend modify: `apps/BBS-FE/lib/auth/types.ts`, auth context and Super Admin restaurant forms
- Tests: restaurant service and guard specs

**Produces:** `BusinessType = BANQUET | EVENT_DECORATION`, immutable-after-data validation, authenticated business type, backend guard.

- [x] Add failing tests for default banquet migration behavior, decoration creation, guarded endpoints and forbidden type changes after data exists.
- [x] Add the enum and restaurant field with `BANQUET` default.
- [x] Include business type in login/session/current-user responses.
- [x] Add Super Admin selection and read-only display after operational use.
- [x] Add and apply a reusable backend business-type guard.
- [x] Verify existing banquet auth and restaurant tests.

### Task 2: Business-aware navigation, routes and permissions

**Files:**
- Backend modify: permissions registry and seeding
- Frontend modify: app layout/navigation and route guards
- Frontend create: decoration route shell under `app/(app)/decoration`
- Tests: permission registry and route visibility

**Produces:** Decoration permission namespace and business-aware navigation.

- [x] Define view/create/update/confirm/cancel/follow-up/payment/print/report/catalog/inventory permissions.
- [x] Seed sensible Company Admin defaults without granting employee permissions implicitly.
- [x] Hide banquet-only navigation for decoration tenants and vice versa.
- [x] Reject manual navigation to the wrong module.
- [x] Verify API requests cannot cross business types.

### Task 3: Event type and venue/hall CRUD

**Files:**
- Backend create: `decoration-event-types`, `decoration-venues` modules, schemas, DTOs, controllers and specs
- Frontend create: configuration pages and API types/client

**Produces:** Tenant-scoped event type, venue and hall APIs with active/deactivated lifecycle.

- [x] Test tenant isolation, duplicate normalization, referenced-record deactivation and hall filtering.
- [x] Implement event type CRUD and ordering.
- [x] Implement venue CRUD with embedded hall records and safe uniqueness.
- [x] Add searchable responsive configuration pages.
- [x] Add permission-controlled reusable create APIs and clients for the inquiry form.

### Task 4: Decoration catalog, images and inventory units

**Files:**
- Backend create: decoration categories/items/images/inventory schemas and module
- Backend reuse/extend: S3 upload service with decoration object prefixes
- Frontend create: categories and catalog pages, image uploader/gallery
- Tests: validation, tenant isolation, S3 key isolation, quantity and maintenance invariants

**Produces:** Category/item CRUD, image lifecycle, bulk/tagged inventory and logistics defaults.

- [x] Test image type/size restrictions and company-isolated keys.
- [x] Implement category CRUD/reorder/deactivate.
- [x] Implement item CRUD with multiple images, cover image and quantity.
- [x] Implement bulk and individually tagged unit modes.
- [x] Implement logistics modes and default buffers.
- [x] Implement maintenance quantity/unit state and prevent negative availability.
- [x] Add responsive mobile camera/gallery upload with progress and retry.

### Task 5: Decoration booking CRUD and lifecycle

**Files:**
- Backend create: `decoration-bookings` module, schema, DTOs, controller, service and specs
- Frontend create: booking/calendar route, form, list and API client/types

**Produces:** Separate `decoration_bookings` collection and lifecycle APIs.

- [x] Test required fields, multi-day validation, venue/hall consistency, package rate and tenant scoping.
- [x] Implement inquiry create/read/update/list and date-range queries.
- [x] Store customer, venue, hall, event type and creator snapshots.
- [x] Implement confirm, cancel, close inquiry and complete transitions.
- [x] Reuse payment/follow-up behavior through decoration-specific service adapters and audit actions.
- [x] Build the responsive inquiry form with default slots and reusable inline configuration APIs.

### Task 6: Calendar, date sidebar and dashboard

**Files:**
- Frontend create: DecorationCalendar, DecorationDaySidebar and DecorationDashboard components/pages
- Backend create: decoration calendar/dashboard query endpoints and specs

**Produces:** Decoration-specific calendar/day panel/dashboard without banquet hall matrix.

- [x] Test multi-day calendar coverage and status counts.
- [x] Add inquiry, confirmed, completed, cancelled and selection-state indicators.
- [x] Build date sidebar cards with venue/hall, slot and payment state.
- [x] Confirm Hall Slot Status, pax and menu data never render.
- [x] Build dashboard cards and actionable operational lists.
- [x] Verify mobile sheet, tablet and desktop layouts.

### Task 7: Atomic inventory reservations

**Files:**
- Backend create: decoration reservation schema/service and concurrency specs
- Backend modify: decoration booking confirm/cancel/complete behavior

**Produces:** Availability query and atomic reservation replacement.

- [x] Write concurrency-domain tests for final-unit overlap protection.
- [x] Calculate effective ranges from setup start through removal completion.
- [x] Support per-item slot-only, setup-required and mobile-turnaround rules.
- [x] Include multi-day overlaps and maintenance quantities.
- [x] Create reservations only for confirmed bookings.
- [x] Replace selection reservations transactionally; release on cancellation.
- [x] Keep inventory unavailable until removal/return completion.

### Task 8: Decoration selection and snapshot

**Files:**
- Backend create: selection DTOs/endpoints and snapshot schema
- Frontend create: responsive decoration chooser, custom-item uploader and selection review
- Tests: snapshots, custom items, conflicts and edits

**Produces:** Immutable `decorationSnapshot` and confirmed-event chooser.

- [x] Test selection is unavailable before confirmation.
- [x] Implement category filtering, image choice, quantity and descriptions.
- [x] Implement event-only custom uploads.
- [x] Show availability for the booking logistics range.
- [x] Save selection and reservations atomically.
- [x] Store immutable snapshot data and preserve it after catalog edits.
- [x] Add mobile sticky summary, tablet split layout and desktop grid.

### Task 9: Event Detail, view, PDF and print

**Files:**
- Frontend create: DecorationEventDetail and DecorationSnapshotGallery
- Frontend create: decoration print route/view
- Backend create/extend: print-detail endpoint if required
- Tests: permissions, snapshot rendering and print completeness

**Produces:** Event Detail with full snapshot plus View, Download PDF and Print.

- [x] Render event, customer, venue, package/payment, follow-up and activity sections.
- [x] Render category-grouped snapshot cards with images, quantities and descriptions.
- [x] Add full-screen mobile gallery and responsive actions.
- [x] Create customer visual output and internal operational output.
- [x] Verify historical output remains unchanged after catalog edits.
- [x] Verify pagination, image loading failure states and print CSS.

### Task 10: Excel/CSV templates and import pipeline

**Files:**
- Backend create: `apps/BBS-BE/src/modules/decoration-imports/` module, schemas, DTOs, parser, validator, controller, service and specs
- Backend create: import job/error schemas in dedicated collections
- Frontend create: `apps/BBS-FE/app/(app)/decoration/import/page.tsx`
- Frontend create: decoration import API client/types and preview components
- Assets create: generated XLSX and CSV template endpoints

**Produces:** Downloadable templates and a preview/confirm import workflow for legacy Excel records.

- [ ] Define versioned template columns: `Date`, `Name`, `Mobile No`, `Hotel Name`, `Hall Name`, `Time`, `Notes`, `Function Name`, `Budget`, `Status`, `Follow-up Date`, `Next Follow-up Date`, `Follow-up Notes`.
- [ ] Generate an XLSX template with Instructions, Data and Example sheets, formats, accepted statuses and sample values.
- [ ] Generate a UTF-8 CSV template with stable headers and documented encoding/date rules.
- [ ] Add template download endpoints protected by decoration import permission.
- [ ] Write parser tests for `.xlsx`, `.csv`, empty files, renamed/missing/duplicate columns, large files, formulas, invalid encodings and malicious content.
- [ ] Normalize dates, 10-digit mobile numbers, whitespace, time-slot aliases, budget values and statuses without silently changing ambiguous values.
- [ ] Validate required fields, date ranges, hall/venue relationship, status and follow-up chronology per row.
- [ ] Add optional permission-controlled creation of missing event types, venues and halls; default to previewing unresolved configuration as errors.
- [ ] Create an import job with file hash, template version, uploader and counts; store row errors separately to avoid oversized documents.
- [ ] Return a preview containing valid rows, invalid rows, warnings, normalized values and configuration actions before any write.
- [ ] Generate downloadable XLSX/CSV error results containing original row plus validation message.
- [ ] On explicit confirmation, import valid rows in bounded batches and record booking source, job ID and row number.
- [ ] Compute a stable row fingerprint and unique import constraint so retry or repeated upload cannot duplicate bookings.
- [ ] Mark confirmed imported bookings without selections as `DECORATION_SELECTION_PENDING`; do not reserve inventory during import.
- [ ] Attach imported follow-up history only when its dates/notes are valid; otherwise fail that row visibly.
- [ ] Audit template download, preview, confirmation, created configuration, created bookings and cancelled jobs.
- [ ] Build responsive drag/drop and file-picker UI with progress, preview filters, confirm dialog, result summary and retry.
- [ ] Enforce maximum file size/row count and avoid loading unbounded files entirely into application memory.

### Task 11: Decoration reports and exports

**Files:**
- Backend create: decoration report DTOs/queries/specs
- Frontend create: dedicated `app/(app)/decoration/reports` dashboard, tables and print/export views

**Produces:** Scoped operational, revenue, payment, follow-up and inventory reports.

- [ ] Keep all controllers, services, routes, permissions and exports separate from the existing banquet reports module.
- [ ] Implement monthly, single-date and custom-date-range filters with explicit restaurant timezone boundaries.
- [ ] Implement summary metrics: total events, inquiry/confirmed/completed/cancelled counts, total package value, advance received, total collected and outstanding amount.
- [ ] Implement advance, outstanding, conversion and event-status reports.
- [ ] Implement revenue by event type/venue.
- [ ] Implement usage, utilization, conflicts and maintenance reports.
- [ ] Implement employee-created booking and follow-up performance reports.
- [ ] Add event-type, venue, hall, status, creator and payment-state filters.
- [ ] Add on-screen pagination plus XLSX, CSV and print/PDF outputs generated from the same filtered query definition.
- [ ] Ensure currency totals use authoritative payment entries and do not double-count advances.
- [ ] Add empty/loading/error states, permission checks and export audit events.
- [ ] Add report reconciliation tests comparing summary totals with booking/payment source records.

### Task 12: Audit, observability and cleanup

**Files:**
- Backend modify: shared audit mapping and scheduled cleanup
- Frontend modify: audit filters/labels
- Tests: audit completeness and abandoned upload cleanup

**Produces:** Decoration action history and storage hygiene.

- [ ] Audit every configuration, booking, selection, reservation, payment and status mutation.
- [ ] Mask sensitive customer data in inappropriate audit contexts.
- [ ] Add cleanup for abandoned custom/catalog uploads.
- [ ] Add conflict/error telemetry without exposing customer or S3 secrets.

### Task 13: Migration, regression and rollout

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
- [ ] Test template downloads, import preview/confirm/retry, duplicate prevention and report/export reconciliation.
- [ ] Deploy behind a decoration-module feature flag.
- [ ] Pilot with one company, review audit/conflict data, then enable general onboarding.

## Delivery sequence

1. Foundation and isolation (Tasks 1-2)
2. Configuration and catalog (Tasks 3-4)
3. Booking/calendar/dashboard (Tasks 5-6)
4. Inventory and selection (Tasks 7-8)
5. Event Detail and legacy-data import (Tasks 9-10)
6. Reports, audit, migration and rollout (Tasks 11-13)

No phase should begin production rollout until its tenant-isolation, permission and regression checks pass.
