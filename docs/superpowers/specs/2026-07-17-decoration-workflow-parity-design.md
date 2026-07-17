# Event Decoration Workflow Parity Design

## Objective

Bring the event-decoration experience to the same production-quality visual and interaction standard as the existing banquet flow while preserving separate decoration routes, APIs, collections, permissions, reporting, and business rules.

The banquet implementation must remain operational and unchanged. Decoration screens will reuse stable shared UI primitives and proven interaction patterns without converting the large banquet booking page into a shared configurable engine.

## Chosen Approach

Build focused decoration components that match the banquet visual language and workflow behavior. This provides parity without copying the banquet monolith or introducing a high-risk refactor of working banquet functionality.

The alternatives were rejected for these reasons:

- Refactoring banquet and decoration into one configurable booking engine creates excessive regression risk.
- Copying the banquet pages produces large duplicated files and unsustainable maintenance.

## Navigation Model

The overlay hierarchy is explicit and must behave like a stack:

```text
Calendar
  -> Selected-date sidebar
    -> Event Detail
      -> Edit Inquiry
      -> Add Advance
      -> Add/Edit Follow-up
      -> Choose/Edit Decoration
      -> View/Print/Download
```

Closing a child workflow returns to Event Detail. Closing Event Detail returns to the selected-date sidebar. Closing the sidebar returns to the calendar. The selected month, date, filters, fetched records, scroll position, and relevant parent state must be retained throughout.

Static deployment compatibility is mandatory. Entity identifiers remain in query-string parameters rather than dynamic URL path segments.

## Dashboard

The decoration dashboard uses the established banquet dashboard layout and responsive visual language, but its information is decoration-specific:

- Today's events
- Upcoming confirmed events
- Open inquiries
- Follow-ups due and overdue
- Advance received
- Outstanding amount
- Events awaiting decoration selection
- Inventory conflicts
- Items scheduled for maintenance
- Upcoming-events list with direct Event Detail access
- Follow-up priority list
- Revenue and booking-status summaries

Where meaningful, dashboard cards navigate to the corresponding filtered Events, Follow-ups, Reports, or Inventory view. Loading, empty, error, and retry states must always be visible and must not leave blank page regions.

## Events and Calendar

Events is the decoration booking workspace. It matches the banquet calendar structure and status presentation.

- Month navigation and today navigation
- Status legend and status-aware event indicators
- Booking/inquiry counts on calendar dates
- Date selection opens a left-side day panel on tablet and desktop
- Date selection opens a full-width day panel on mobile
- The day panel lists every inquiry/event intersecting the selected date, including multi-day events
- Each record shows customer, function, venue/hall, time slot, status, package amount, advance, and pending amount
- Add Inquiry is available from the page header and selected-date panel
- Selecting a record opens Event Detail
- Decoration pages never show the banquet Hall Slot Status table
- Calendar dimensions, navigation controls, date cells, typography, spacing, borders, shadows, selected-date treatment, status legend, and event indicators match the banquet calendar rather than using a separate decoration visual system
- Decoration statuses use the same card palette as their banquet equivalents: inquiry, confirmed, completed, closed inquiry, cancelled, and on-hold states must not introduce decoration-only colors
- Selecting a day record opens Event Detail as an overlay above the retained day panel; it must not navigate to a standalone details page

Calendar and selected-date panel should derive from the same fetched booking dataset where practical so slow or failed secondary requests cannot produce an empty hall/event section after bookings have already loaded.

## Add and Edit Inquiry

The form matches the banquet booking modal's typography, spacing, validation, responsive behavior, close control, submission state, and error presentation.

Fields:

- Customer name
- Mobile number
- Event type
- Hotel/venue
- Hall filtered by the selected hotel
- Optional address
- Time slot: Morning, Afternoon, or Evening
- Start date
- End date, initially equal to start date
- Package rate/budget
- Notes
- Created by, captured automatically
- Initial status: Inquiry

Event type is the function name for decoration bookings. The server stores the resolved event-type name as the historical function-name snapshot; the form does not ask the user for a duplicate Function Name value.

Users with configuration-management permission may add a missing event type, venue, or hall without leaving the form. A newly created configuration value is automatically selected. Duplicate normalized names, invalid hall/venue relationships, malformed mobile numbers, invalid date ranges, and negative amounts are rejected.

Edit Inquiry sends only changed fields. Closing without saving returns to Event Detail without modifying the booking. Duplicate submissions are prevented.

## Event Detail

Event Detail matches the banquet Event Detail information hierarchy while using decoration-specific content:

- Customer information
- Event type and function
- Venue, hall, address, dates, and time slot
- Status, booking number, created by, and creation time
- Package amount, advance received, and pending amount
- Advance-payment history
- Follow-up history and next follow-up
- Decoration selection snapshot grouped by category
- Images with robust fallback, quantities, descriptions, and custom items
- View, download, and print actions
- Edit Inquiry
- Add Advance
- Add Follow-up
- Choose/Edit Decoration after confirmation
- Confirm, close inquiry, cancel, complete, and other valid status actions

There is no menu snapshot or banquet Hall Slot Status content in Event Detail.

For an inquiry, Event Detail exposes Confirm Booking. Confirmation opens an advance popup above Event Detail and retains the complete calendar and selected-date hierarchy underneath. Closing the advance popup returns to Event Detail. Successful confirmation keeps Event Detail open, changes the status to Confirmed, refreshes the selected-date card, and enables decoration selection.

## Advance Management

Advance management follows the banquet interaction pattern while writing only decoration payment records.

- Add a payment with amount, date, mode, reference, and notes supported by the existing decoration contract
- Confirmation may record a zero advance, matching the banquet confirmation workflow. Negative, malformed, and over-limit values are rejected
- Confirmation and its optional initial advance are one idempotent decoration-domain operation so a duplicate click, request retry, or lost response cannot create duplicate payments
- Display immutable payment history, total package amount, total received, and outstanding amount
- Refresh Event Detail, selected-date record, dashboard totals, and reports after a successful payment
- Retain Event Detail if submission fails and show an actionable error

## Follow-ups

The decoration Follow-ups page is a complete workflow rather than a placeholder. It matches the banquet follow-up calendar and overlay behavior.

- Monthly calendar with follow-up counts and status colors
- Date selection opens the follow-up day panel
- Day panel groups due, completed, overdue, and upcoming follow-ups
- Selecting a record opens Event Detail
- Add, edit, complete, and reschedule permitted follow-ups
- Store follow-up notes and history
- Show customer mobile with a direct call action
- Show event date, venue, booking status, and responsible employee
- Closing Event Detail returns to the selected follow-up date panel
- Employee actions remain permission-controlled in both UI and API

## Decoration Selection Integration

Choose/Edit Decoration becomes available only for statuses permitted by backend business rules, beginning after confirmation. It opens above Event Detail and returns there when closed.

The selection workflow retains existing availability, setup/removal time, multi-day reservation, quantity, maintenance, conflict, custom-item, upload, and concurrency protections. After saving, Event Detail immediately displays the updated category-grouped snapshot.

## Responsive and Accessible Behavior

- Mobile: full-width panels, touch-sized actions, stacked information, and no horizontal page overflow
- Tablet: responsive two-column content where space permits and full-width complex overlays
- Desktop: banquet-equivalent sidebar and modal widths with preserved hierarchy
- Modal focus is trapped and restored to the opening control
- Escape closes only the topmost dismissible layer
- Controls have visible focus, labels, readable contrast, and screen-reader dialog titles
- Background scrolling is locked while an overlay is open

## Loading, Errors, and Slow Networks

- Use skeletons or deliberate loading states rather than faded or blank content
- Retain already-loaded content during refreshes
- Present retry actions for failed dashboard, calendar, sidebar, detail, and configuration requests
- Show field-level validation and a concise form-level summary
- Prevent stale responses from replacing newer month, date, or filter selections
- Disable destructive and submission controls while their request is in flight
- Preserve parent overlay state after recoverable failures
- Reuse the already-fetched calendar/day dataset while opening and closing child overlays; a slow secondary request must not clear a populated day panel

## Permissions and Isolation

All decoration routes require an `EVENT_DECORATION` tenant and the matching decoration permission. Company administrators receive the configured decoration capabilities; employees see only permitted screens and actions. Banquet tenants cannot access decoration routes, and decoration tenants cannot access banquet routes.

No decoration workflow reads from or writes to banquet booking, menu, hall-slot, follow-up, payment, or report collections. Shared audit logging remains enabled.

Decoration event types, locations, halls, bookings, advances, follow-ups, selections, imports, reports, availability records, and snapshots remain in decoration-owned collections and are accessed through decoration APIs. Company, user, authentication, audit-log infrastructure, and object storage may remain shared. A decoration confirmation must never call a banquet order or banquet advance endpoint.

## Configuration Ordering and Presentation

Event-type display order is generated by the backend and scoped to the company. A new company's first event type receives display order `1`; each later event type receives the next available order. The Add Event Type form does not expose Display Order. Renaming an event type does not change its order.

The allocation must remain correct when two requests create event types concurrently. The persistence layer owns the invariant and must prevent duplicate company/order pairs rather than relying on a value calculated only in the browser. Existing valid positive orders remain unchanged. Invalid legacy orders are handled by a bounded migration before the invariant is enforced.

Event-type, hotel, venue, and hall list actions use explicit readable foreground, background, and border colors. Edit, Activate, Deactivate, Add Hall, loading, disabled, hover, pressed, and keyboard-focus states must remain visible at supported viewport sizes. Action rows wrap on mobile rather than clipping or reducing text contrast.

## Delivery Order

1. Shared decoration page shell, status presentation, loaders, and overlay-state controller
2. Dashboard parity
3. Events calendar and selected-date sidebar
4. Production Add/Edit Inquiry form
5. Complete Event Detail
6. Advance-payment workflow
7. Follow-up calendar and management
8. Decoration selection and snapshot integration
9. Print, view, and download integration
10. Responsive, slow-network, accessibility, end-to-end, and banquet regression pass

Each delivery is independently testable and committed before work begins on the next delivery.

## Acceptance Criteria

- Decoration users receive decoration dashboard and navigation after login
- Dashboard content is meaningful, responsive, and never silently blank
- Calendar date selection consistently opens a populated day panel
- Decoration calendar structure and status colors visually match banquet for equivalent states
- Selecting a day card opens Event Detail above the day panel; closing Event Detail reveals the same selected date and records
- Add Inquiry from page header or day panel creates a visible inquiry on the correct date
- Event Detail presents all decoration, financial, follow-up, and customer information
- Overlay close behavior always returns exactly one level back
- Advance totals update consistently across Event Detail, sidebar, dashboard, and reports
- A new company's first event type receives order 1 automatically, later orders increment safely, and Add Event Type does not expose ordering
- Configuration actions are readable and operable on mobile, tablet, and desktop
- Confirm Booking accepts an optional zero advance, is retry-safe, updates the open detail/card, and writes only decoration-domain records
- Follow-ups support the full calendar, sidebar, detail, and management flow
- Decoration snapshots support images, fallbacks, quantities, descriptions, and custom items
- Multi-day events appear on every intersecting date
- Permission-denied actions are unavailable in the UI and rejected by the API
- Mobile, tablet, and desktop layouts are usable and visually consistent with banquet
- Static builds contain no dynamic entity route dependency
- Existing banquet dashboard, booking, inquiry, Event Detail, advance, menu, hall, follow-up, print, and reporting regression tests continue to pass
- Automated decoration tests cover successful, empty, slow, failed, duplicate, invalid, unauthorized, concurrency, conflict, cancellation, and back-navigation scenarios
