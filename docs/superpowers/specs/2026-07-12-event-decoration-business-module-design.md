# Event Decoration Business Module Design

## Decision

Extend the existing multi-tenant platform with a separate `EVENT_DECORATION` business module. Do not create a second application and do not extend banquet orders with decoration-only fields. Each company has exactly one business type: `BANQUET` or `EVENT_DECORATION`. Business type becomes immutable after operational data exists.

## Shared versus isolated capabilities

Shared: authentication, sessions, company and employee administration, customers, RBAC engine, audit logs, S3 infrastructure, advance-payment behavior, follow-up behavior and common UI primitives.

Isolated: dashboard, navigation, booking collection, booking form, calendar/day sidebar, Event Detail, configuration, decoration catalog, inventory reservations, print layouts and reports.

Backend APIs must enforce the company business type; hiding frontend navigation is not sufficient.

## Decoration booking

Required fields: customer name, mobile number, venue/hotel, event type, time slot, package rate, start date, end date and created-by snapshot. Hall is required when the venue has halls. Address and additional information are optional.

Default slots are Morning 06:00-12:00, Afternoon 12:00-17:00 and Evening 17:00-23:59. Setup and removal use exact datetimes. Events may span multiple days.

Lifecycle: `INQUIRY -> CONFIRMED -> DECORATION_SELECTED -> IN_PROGRESS -> COMPLETED`, with `CANCELLED` and closed-inquiry paths. Decoration selection becomes available after confirmation.

## Configuration CRUD

Event types, venues, halls and decoration categories support create, list, edit, reorder where relevant, activate and deactivate. Used records are never hard-deleted. Venue/hall/event-type snapshots preserve historical booking documents. Authorized users may create event types, venues and halls from the booking form.

## Decoration catalog and storage

Decoration items contain category, name, multiple S3 images, cover image, quantity, bulk or tagged-unit tracking, active state, maintenance quantity, logistics mode, default setup buffer, default removal buffer, turnaround buffer, storage/internal note and audit metadata. Version one excludes item-level pricing.

Uploads support phone camera/gallery, progress, retry, compression, thumbnails, company-isolated object keys, MIME/size validation and abandoned-upload cleanup.

## Selection, snapshot and inventory

Confirmed events may select catalog items by category with quantity and event-specific descriptions. Users may add event-only custom decorations with camera/gallery images. Saving creates an immutable `decorationSnapshot` containing category, item identity, item name, selected image, quantity, description, custom indicator, logistics window and reserved unit IDs.

Inquiries show availability but do not reserve inventory. Confirmed selections create hard reservations. Availability subtracts overlapping confirmed reservations and maintenance quantities from total stock. Overlap uses setup start through removal completion, including item-specific buffer rules and multi-day ranges. Mobile items may use zero or small turnaround buffers. Saving and editing reservations must be atomic to prevent concurrent overbooking. Cancellation releases reservations. Completion releases stock only after the removal/return condition.

## Decoration user experience

Decoration companies receive dedicated dashboard, calendar, day sidebar, booking form, Event Detail, selection gallery, configuration, print and report routes. Banquet Hall Slot Status, pax, food menus, categories, kitchen printing and banquet reports are never shown.

Event Detail displays event/customer/venue/payment/follow-up data and the complete decoration snapshot. It provides View Decoration, Download PDF and Print. Customer output is visual and image-rich; internal output prioritizes quantities, descriptions and setup/removal timing.

Mobile uses full-screen sheets, sticky actions, swipeable galleries, searchable selectors and camera upload. Tablet uses a two-column catalog/selection layout. Desktop uses a larger grid and side summary. No essential flow relies on wide tables.

## Dashboard and reports

Dashboard cards: today's events, upcoming events, open inquiries, confirmed events, decoration pending, follow-ups due, pending advances, outstanding balances, conflicts, low availability, maintenance and recent completions. Operational lists emphasize setup/removal windows and incomplete selection.

Decoration reports are implemented in a separate backend module, separate frontend route and separate print/export views. They do not reuse banquet report endpoints or mix banquet and decoration rows.

Reports: advance collection, outstanding payments, conversion, open inquiries, confirmed/upcoming/completed/cancelled events, follow-up performance, revenue by event type and venue, decoration usage, inventory utilization, conflict history, maintenance/unavailable inventory and employee-created bookings.

Users can select a month, a custom date range or a single date. The summary must show event count, inquiry/confirmed/completed/cancelled counts, total package amount, advance received, total collected, outstanding amount and status/venue/event-type breakdowns. Results support on-screen viewing, pagination, XLSX download, CSV download and print/PDF where applicable.

## Excel/CSV import and replacement of manual records

Decoration companies receive a separate Import Data page. Users can download both XLSX and CSV templates. The required template columns are:

`Date`, `Name`, `Mobile No`, `Hotel Name`, `Hall Name`, `Time`, `Notes`, `Function Name`, `Budget`, `Status`, `Follow-up Date`, `Next Follow-up Date`, `Follow-up Notes`.

The template includes an Instructions sheet and an Example row in XLSX; the CSV template contains headers only. Accepted status values are documented and normalized to application statuses. Date, mobile and budget formats are explicitly documented.

Import uses a preview-first workflow: upload, parse, validate, resolve configuration, preview valid/invalid rows, download error file, confirm import, then show result. No database write occurs before confirmation. Each row reports its exact validation error. Users may choose whether new event types, venues and halls found in the file are created automatically; this option requires configuration permissions.

Import is idempotent. A file hash and row fingerprint prevent accidental duplicate imports. Retrying a partially failed job does not duplicate successful bookings. Imported records store import job ID, original row number, source filename, imported-by user and timestamp. Every import and created booking is audited.

The importer supports active historical and future records without reserving decoration inventory automatically. Confirmed imported bookings are marked `DECORATION_SELECTION_PENDING` until a user selects decoration. Import never invents advances or collected amounts unless supported columns are deliberately added to a future template version.

## Version-one exclusions

Item-level pricing, automatic calculated quotation totals, team/vehicle assignment, logistics checklists, before/after photos, messaging automation, customer portal, online approval, vendor/subcontractor management, procurement, payroll and attendance.
