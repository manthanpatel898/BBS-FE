# Event Confirmation, Hot Dates, and Follow-up Dashboard Design

## Objective

Extend only the event-decoration module with banquet-style create-and-confirm behavior, event-owned Hot Dates, immediate inquiry follow-ups, and a follow-up completion dashboard card. Remove native Share from Event Detail while preserving View and Download. Existing banquet behavior and data must remain unchanged.

## Business Isolation

- Every new API is guarded for `EVENT_DECORATION`.
- Decoration bookings continue to use the existing decoration booking collection.
- Event Hot Dates use a new `decoration_hot_dates` collection and `/decoration/hot-dates` API namespace.
- Banquet `hot_dates`, booking confirmation, follow-up rules, dashboard queries, routes, and settings remain unchanged.
- Shared code is limited to presentation components and pure helpers whose behavior is supplied through explicit adapters.
- No dynamic routes are introduced; static deployment continues to use query-string state.

## Create Inquiry and Confirm Booking

### User flow

- The new event inquiry form has two primary actions:
  - amber **Create Inquiry**;
  - green **Confirm Booking**.
- Edit mode continues to show only the existing save action.
- Both create actions run the same form validation and resolve any custom event type, banquet/outdoor venue, or hall configuration before continuing.
- **Create Inquiry** saves through the existing inquiry endpoint.
- **Confirm Booking** keeps the validated payload in memory and opens the decoration advance popup without creating a record.
- The popup defaults Advance Amount to `0`.
- Payment date, payment mode, and remark are requested only when Advance Amount is greater than `0`.
- Cancelling the popup returns to the populated inquiry form and creates no booking.
- Submitting the popup creates one confirmed booking and returns it to the selected-date sidebar/detail flow.

### Backend contract

- Add an event-only create-and-confirm endpoint accepting:
  - the normal decoration booking fields;
  - a UUID request ID;
  - non-negative advance amount;
  - conditional payment date and mode;
  - optional payment remark.
- A successful request creates the booking directly in the confirmed state. It must not create an inquiry first and then patch it.
- The embedded payment, total collected amount, confirmation metadata, and confirmed status are constructed before persistence and inserted as one MongoDB document. This preserves atomicity without requiring replica-set transactions.
- The UUID is protected by a company-scoped unique idempotency index. Retrying the same request returns the original booking; it never creates a duplicate.
- Package price may still be unfinalized. A positive advance is valid before final price selection, and later final-price validation must continue to prevent a price below collected advances.
- Audit logs distinguish `create inquiry` from `create confirmed booking` and include the request ID and advance amount without storing secrets.

## Event Hot Dates

### Storage and API

- Create `decoration_hot_dates` with:
  - company/restaurant ID;
  - year;
  - ISO date key;
  - description;
  - created/updated timestamps.
- Enforce a unique index on company + year + date.
- Provide event-only list, create, update, delete, and bulk import endpoints under `/decoration/hot-dates`.
- Validate real dates from years 2000–2100, description length, company ownership, duplicates, object IDs, file type, file size, and a bounded row count.
- CSV/XLSX import reports inserted, skipped, and row-level errors. Duplicate rows are deterministic and do not overwrite an existing description silently.
- Add audit coverage for create, update, delete, and bulk import.
- No migration is required because the event Hot Dates collection is new.

### Settings and calendar

- Add **Hot Dates** to event Settings using the banquet manager’s layout and interactions.
- Parameterize the presentation manager with an event API adapter instead of branching business logic inside the component.
- Preserve add/edit/delete, search/year selection, sample CSV/XLSX downloads, bulk upload, loading, empty, confirmation, and error states.
- The event calendar fetches Hot Dates for each visible year and caches successful year responses.
- Stale Hot Date responses cannot overwrite the currently visible year.
- A Hot Date is rendered with the same red calendar treatment as banquet while remaining selectable.
- A Hot Date API failure shows a retryable non-blocking warning and never hides booking data.

## Event Follow-up Rules

### Eligibility

- Only bookings in `INQUIRY` state with Event Date today or later are eligible.
- Confirmed, decoration-selection-pending, decoration-selected, completed, cancelled, closed-inquiry, and past-event bookings are excluded.
- An inquiry with no follow-up is actionable today immediately after creation, regardless of its future Event Date.
- A follow-up recorded today is `TAKEN_TODAY`.
- A pending next date:
  - is hidden before that date;
  - becomes due on that date;
  - remains overdue after that date until action is taken.
- A latest completed follow-up does not revive an older pending follow-up.
- If a follow-up has no next date and is not closed, it remains actionable according to the same banquet pending rule.

### One rule for every consumer

- A single pure event follow-up projection returns the effective action date and state for each eligible booking.
- The follow-up workspace, dashboard counts, and dashboard drilldown use this projection.
- The required workspace contains only currently actionable entries.
- The dashboard drilldown includes:
  - still-required entries;
  - entries taken today.
- Scheduled future entries are excluded until their due date.

## Dashboard Follow-up Card

- The event dashboard Follow-ups card matches banquet semantics:
  - when total is greater than zero, show `taken today / total due today completed`;
  - otherwise show `0`.
- `total due today = still required now + taken today`.
- Clicking the card opens the existing event dashboard records panel rather than navigating to another page.
- Drilldown cards show green **FOLLOW UP TAKEN** state for completed-today entries and the appropriate amber pending/due/overdue state for required entries.
- Counts and records come from equivalent server-side domain projection rules so they cannot disagree.
- The card and record panel remain mobile-first and create no page-level horizontal scroll.

## Event Detail Documents

- Remove Share from event-detail action derivation and UI.
- Keep View and Download.
- View continues to open the query-string PDF viewer. Users may use the viewer/browser facilities for print or share.
- Remove event-detail PDF preloading and native-share state so opening Event Detail does not make an unnecessary PDF request.
- Banquet document actions are unchanged.

## Error Handling and Concurrency

- Create-and-confirm disables duplicate submissions synchronously and reuses one request ID across retries of the same popup.
- A failed create-and-confirm keeps form and advance values available for retry.
- Cancelling or closing clears the pending payload and request ID.
- Hot Date writes are company-scoped at every query boundary.
- Calendar month/year changes use request identity or abort signals to reject stale responses.
- Follow-up date comparisons use the India business-date key, not UTC midnight or browser locale.
- Dashboard pagination uses stable sorting and returns the follow-up state required by the UI.

## Responsive and Accessibility Requirements

- Mobile is the primary target; tablet and desktop remain fully usable.
- Inquiry actions stack on narrow screens and use at least 44px touch targets.
- The green Confirm Booking action has readable contrast and the same semantic placement as banquet.
- Hot Date settings controls wrap without horizontal page scrolling.
- Red Hot Date styling is not the only signal; accessible labels expose the Hot Date description.
- Dashboard completion text wraps within the stat card.
- Popups retain focus management, body-scroll locking, Escape/backdrop safety, busy-state blocking, and visible validation errors.

## Verification

### Backend

- Create inquiry remains `INQUIRY`.
- Create-and-confirm with ₹0 creates one confirmed booking without payment details.
- Positive advance creates one confirmed booking with one embedded payment and correct totals.
- Invalid payment fields, invalid references, past Event Date, and collected/price violations create no record.
- Same request ID returns the existing booking; a different request ID creates a separate booking.
- Event Hot Date CRUD, tenant isolation, duplicate handling, real-date validation, indexes, import limits, row errors, and audit logs.
- Follow-up projection covers new-today, taken-today, scheduled, due, overdue, latest-completed, past, confirmed, cancelled, completed, and closed cases.
- Dashboard follow-up count and record-list parity.
- Business guards reject banquet companies from decoration endpoints and event companies from banquet-only Hot Date endpoints.

### Frontend

- New event form shows amber Create Inquiry and green Confirm Booking only in create mode.
- Confirm validation, configuration resolution, advance popup with ₹0, cancellation with no save, retry preservation, and duplicate-click blocking.
- Event Settings Hot Dates behavior and event API routing.
- Calendar red Hot Dates, year caching, stale response rejection, accessible description, and bookings retained on Hot Date failure.
- New inquiry appears in today’s event follow-up workspace.
- Dashboard Follow-ups card ratio and drilldown state colors.
- Event detail contains View and Download but no Share or native PDF prefetch.
- Mobile responsive source contracts and interaction tests.
- Static production build succeeds for every route.

### Regression gates

- Run all decoration backend and frontend tests.
- Run banquet booking creation/confirmation, calendar, Hot Dates, follow-up, dashboard, cancellation, documents, settings, employee, permission, and report tests.
- Run backend and frontend lint and production builds.
- Verify both worktrees are clean after generated-file restoration.

## Delivery Sequence

1. Centralize and characterize event follow-up projection and dashboard totals.
2. Add atomic, idempotent event create-and-confirm backend behavior.
3. Add the two-action event inquiry flow and advance popup handoff.
4. Add event-owned Hot Date schema, APIs, indexes, auditing, and tests.
5. Parameterize the Hot Dates manager and add the event Settings tab.
6. Integrate event Hot Dates into the calendar with stale-response protection.
7. Update event dashboard follow-up ratio and drilldown.
8. Remove event Share and its eager PDF preparation.
9. Run complete event and banquet regression verification.

Each step must complete its red-green test cycle and focused commit before the next step begins.
