# Decoration Limited Reports Design

## Goal

Replace the broad decoration business-report screen with four focused reports that match the banquet report experience and eliminate the customer's operational Excel worksheet.

## Navigation and presentation

The decoration report landing page contains exactly four banquet-style cards:

1. Event Worksheet
2. Booking Report
3. Advance Collected Report
4. Pending Amount Report

Each report opens through the static-export-safe route `/decoration/reports/view?type=<report-type>`. Report pages use the banquet module's header, filter panel, Generate Report and Download Report controls, responsive preview, totals, error/empty/loading states, and CSV/XLSX selection. Printable reports open at `/decoration/reports/print?type=<report-type>&...` and support browser Print / Save PDF.

## Event Worksheet

The worksheet replaces the customer's Excel fields with application data:

- Date
- Customer Name
- Mobile No.
- Banquet / Outdoor Venue
- Hall
- Time
- Notes
- Event Type
- Budget
- Status
- Created By

It supports event-date range and free-text search. Desktop and tablet use a spreadsheet-style table; mobile uses stacked cards with identical values and actions.

Only `INQUIRY` rows are editable inline. Editing is explicit at row level: Edit enters draft mode, Save submits all changed fields atomically, and Cancel discards the draft. There is no save-on-keystroke behavior. Confirmed, selection, in-progress, completed, cancelled, and closed records remain read-only and expose View Details.

Configured event types, venues, and halls are used by the editor. Hall choices are restricted to the selected banquet. Outdoor venues may have no hall. Changes update the authoritative decoration booking through backend validation, permissions, company scoping, and existing audit logging.

## Booking Report

The booking report supports event-date range, status, and customer/booking search. It includes all booking statuses and displays customer, event type, venue/hall, event date/time, status, budget, collected amount, pending amount, and creator. The preview is server-paginated and supports CSV, XLSX, and printable PDF from the same filter definition.

## Advance Collected Report

The advance report is payment-based, with one row per payment. Filters include payment-date range, customer/booking search, and payment mode. Columns include payment date, booking number, customer, mobile, event date, amount, payment mode, remark, and recorded by. The report displays the filtered collection total and supports CSV, XLSX, and printable PDF.

## Pending Amount Report

The pending report includes only committed operational statuses: `CONFIRMED`, `DECORATION_SELECTION_PENDING`, `DECORATION_SELECTED`, `IN_PROGRESS`, and `COMPLETED`. Inquiry, cancelled, and closed records are excluded. A row appears only when `packageRate - sum(payments.amount) > 0`.

Filters include event-date range, customer/booking search, and committed status. Columns include event date, booking number, customer, mobile, venue/hall, budget, collected amount, pending amount, and status. The report displays the filtered pending total and supports CSV, XLSX, and printable PDF.

## Backend boundaries

The existing `decoration_bookings` collection remains the source of bookings and embedded payments; no separate worksheet collection is created. The backend exposes focused company-scoped endpoints for worksheet/booking rows, payment rows, and pending rows, plus bounded CSV/XLSX/print exports. Preview endpoints use server-side pagination. Exports are limited to 10,000 rows and reject broader queries.

Inline worksheet updates reuse decoration booking validation and audit behavior but permit only the approved worksheet fields and only while the record remains `INQUIRY`. The server rechecks status at save time to prevent stale-screen edits after confirmation.

## Permissions and audit

- `DECORATION_REPORTS_VIEW` controls landing pages and previews.
- `DECORATION_REPORTS_EXPORT` controls CSV, XLSX, and print/PDF output.
- Existing decoration booking-update permission controls worksheet edits.
- Report exports and worksheet updates are audit logged with filters, row counts, actor, booking ID, and changed-field snapshots.

## Reliability and testing

Pure report-domain helpers define committed statuses, collected/pending calculations, export rows, and allowed worksheet changes. Automated coverage includes tenant isolation, status transitions during edit, dependent venue/hall validation, payment-level pagination, date boundaries, zero/negative outstanding exclusion, export limits, CSV escaping, XLSX generation, permission denial, mobile presentation, and static query-string routing.

No migration is expected because the required booking, payment, creator, and audit data already exist. Existing banquet report APIs and screens remain unchanged.
