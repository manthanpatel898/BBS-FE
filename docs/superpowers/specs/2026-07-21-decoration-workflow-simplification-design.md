# Event Decoration Workflow Simplification Design

## Objective

Simplify the event-decoration workflow for mobile-first daily use while preserving the existing banquet system. The change aligns follow-ups with the banquet interaction pattern, removes unnecessary event fields and dashboard sections, finalizes pricing with decoration selection, and simplifies event-company user management.

## Isolation and Compatibility

- Event-decoration bookings, configuration, reports, and users continue to use their existing business-type guards and decoration-specific collections/APIs.
- Shared code is limited to stable presentation primitives and pure helpers; banquet domain rules are not replaced by decoration rules.
- Every shared change must be guarded by `EVENT_DECORATION` and covered by banquet regression tests.
- Static deployment remains supported through query-string navigation; no dynamic ID routes are introduced.

## Dashboard

- Add a mobile-only Calendar card that shows the number of future event bookings from today onward.
- The future count excludes `CANCELLED`, `CLOSED_INQUIRY`, and `COMPLETED` bookings and is calculated server-side using the configured business timezone.
- Clicking the card opens the decoration calendar. It is hidden at tablet and desktop breakpoints.
- Keep the compact `Upcoming events` summary card.
- Remove the Booking Status chart.
- Remove the large Upcoming Confirmed Events section.
- Remove the large Follow-up Priority section.
- Keep the Decoration Selection Pending card. Its count and list include only confirmed operational bookings that do not have a saved decoration snapshot.
- Clicking Decoration Selection Pending opens the existing filtered record panel. Clicking a record opens Event Detail with Choose Decoration available in its fixed action bar.
- Dashboard cards and panels must wrap within the viewport without page-level horizontal scrolling.

## Single Event Date

- Event users see one field named Event Date. End Date is removed from create/edit forms, Event Detail, reports, import templates, PDF view, PDF download, and other event-module presentation.
- For backward compatibility, the stored `startDate` and `endDate` fields remain during this release.
- New and edited decoration bookings write `endDate = startDate` on the server regardless of a client-supplied End Date.
- Existing records retain their stored End Date, but event workflows display and evaluate the Start Date as the Event Date.
- Reservation/inventory duration continues to be determined from Event Date plus start/end time and configured setup/removal buffers.
- Banquet date fields and multi-date behavior remain unchanged.

## Package Price Finalization

- Package Price is optional when an inquiry is created or edited.
- An unfinalized price is presented as `Not finalized`, never as a misleading zero price. Pending amount is unavailable until finalization.
- The decoration-selection popup contains a required Final Package Price field.
- Decoration snapshot/reservations and Final Package Price are committed atomically.
- Final Package Price must be finite, non-negative, and no lower than advances already collected.
- Editing a saved decoration selection may update the final price under the same validation.
- After finalization, received amount continues to be derived from advances and pending amount is `final price - received amount`.
- Reports and customer documents use the finalized price and explicitly represent an unfinalized price when applicable.

## Follow-ups

- The event follow-up workspace adopts the banquet visual structure: date groups, date cards, yellow/green state dots, and a date-specific side panel.
- Event data and APIs remain separate; reusable banquet presentation primitives may be extracted behind domain adapters.
- The workspace shows all currently actionable inquiry follow-ups rather than a month-limited subset.
- Only `INQUIRY` bookings with an Event Date today or in the future are eligible.
- A scheduled follow-up appears on its scheduled date. Taken/completed follow-ups are removed from the actionable workspace.
- Confirmed, decoration-pending, decoration-selected, completed, cancelled, closed-inquiry, and past-event bookings are excluded.
- The side panel uses the banquet phone icon with an accessible label and `tel:` action instead of a text Call button.
- Dashboard follow-up totals and the follow-up workspace consume the same centralized eligibility/state helper.
- Mobile, tablet, and desktop layouts use the available width without page-level horizontal scrolling.

## Event Detail Documents and Sharing

- Remove the Print action from Event Detail.
- Keep View and Download PDF.
- View and Download use the same document definition and consistent loading/error handling.
- Add Share PDF only when the browser supports native file sharing for PDF files.
- Sharing fetches the same generated PDF, creates a correctly named `application/pdf` file, and opens the operating-system share sheet. Destination availability, including WhatsApp and email, is controlled by the device.
- When file sharing is unsupported, Share is hidden and Download remains available.
- Duplicate requests are prevented while a document action is running, and abandoned requests are cleaned up safely.

## Event-Company Users

- Event-decoration user create/edit forms expose no role selector; Company Admin is shown as the fixed user type.
- Manager/Employee, ODC access, Signature, and Permissions controls/actions are hidden for event-decoration companies.
- The backend independently enforces Company Admin, `canAccessOdc = false`, and no custom permissions for event-company user creation and updates.
- Direct event-company API attempts to assign a different role, ODC access, permissions, or a signature are rejected.
- Event-company list queries avoid unnecessary signature-summary work and return no event-user permission/signature actions.
- There are no existing event-company users, so no user migration is required.
- Banquet employee roles, permissions, signatures, and ODC behavior remain unchanged.

## Centralized Rules

Pure, tested event-domain policies define:

- future booking eligibility;
- decoration-selection-pending eligibility;
- follow-up eligibility and visible date;
- single Event Date normalization;
- package-price finalized/unfinalized presentation; and
- final-price validation against received advances.

Dashboard counts, record lists, action visibility, and backend mutations must use equivalent definitions so users cannot see conflicting results between screens.

## Error Handling and Transactions

- Decoration selection remains authoritative on the server: status, inventory availability, tenant ownership, and final price are revalidated at save time.
- Decoration reservations, snapshot data, booking status, and final price either all commit or all roll back.
- Transaction-unavailable environments return a clear operational error and must not partially save data.
- API failures preserve entered form/selection data and present a retryable error.
- All counts and date comparisons use normalized business-timezone dates rather than device-local midnight.

## Verification

Automated coverage must include:

- mobile-only Calendar card visibility, future count, exclusions, and navigation;
- retention of the compact Upcoming card and removal of the three specified dashboard sections/charts;
- confirmed-without-selection count/list/action agreement;
- server normalization of End Date and removal of End Date from every event presentation/export path;
- optional initial package price, unfinalized presentation, atomic finalization, invalid/under-collected price rejection, and rollback;
- banquet-style follow-up grouping, dots, sidebar actions, scheduled-date behavior, and exclusion rules;
- removal of Print plus supported/unsupported native sharing behavior;
- event-company user creation/update enforcement and direct API bypass rejection;
- responsive behavior at mobile, tablet, and desktop breakpoints;
- frontend static production build and backend production build; and
- regression coverage for banquet dashboard, bookings, cancellation, follow-ups, employees, permissions, signatures, reports, and documents.

## Delivery Sequence

1. Centralize event-domain policies and add backend characterization tests.
2. Implement the single Event Date and optional/unfinalized price contract.
3. Make decoration selection and final price atomic.
4. Simplify and extend dashboard behavior.
5. Align the follow-up presentation and rules.
6. Update Event Detail document actions and native sharing.
7. Enforce simplified event-company user management.
8. Run full responsive, static-build, API, and banquet regression verification.

Each step is completed with its tests before the next step begins.

