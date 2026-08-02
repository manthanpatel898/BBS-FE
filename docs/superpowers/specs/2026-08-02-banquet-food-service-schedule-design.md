# Banquet Food Service Schedule Configuration

## Objective

Allow banquet companies to optionally capture a Welcome Drink Start Time and a Main Course Start Time while choosing or editing a booking menu. Each field is independently configurable, stored with the booking, and shown in booking details and print output when a value exists.

This feature applies only to banquet companies. Event-decoration and ODC workflows must remain unchanged.

## Configuration

Add two independent boolean settings to the existing banquet settings record:

- `enableWelcomeDrinkStartTime`
- `enableMainCourseStartTime`

Both settings default to `false` for existing and new companies. Only users covered by the existing settings-management permission may change them.

The Settings screen will expose two clearly labelled toggles in the existing banquet settings design. Updating either toggle must:

- preserve the other toggle;
- be tenant-scoped;
- be guarded as banquet-only behavior;
- create an audit-log entry with before and after values.

Disabling a setting controls future menu-selection input only. It must never remove a previously saved time from a booking.

## Booking Storage

Store the schedule once at booking level rather than inside individual menu entries:

- `welcomeDrinkStartTime: string | null`
- `mainCourseStartTime: string | null`

Values use normalized 24-hour `HH:mm` storage. They are part of the booking snapshot and are independent of menu/category definitions.

Missing fields on existing documents are treated as `null`. Ordinary booking edits and partial PATCH requests preserve the stored values unless the menu-selection workflow explicitly submits a change.

## Menu-Selection Experience

Add a compact **Food Service Schedule** section at the end of the existing Choose/Edit Menu popup.

- Show Welcome Drink Start Time only when its setting is enabled.
- Show Main Course Start Time only when its setting is enabled.
- Hide the entire section when both settings are disabled.
- Both values are optional.
- Use the established banquet time selector with hour, minute and AM/PM controls.
- Minute options are `00`, `15`, `30`, and `45`.
- Edit Menu hydrates saved values.
- Clearing an enabled field explicitly saves `null`.
- A failed save retains the user's current selections and entered times.

Menu selections and schedule values are saved through one bounded request so the booking cannot end up with a newly saved menu and silently lost schedule data.

## Validation

Validation must run on both frontend and backend. Backend validation is authoritative.

- Any supplied time must match `HH:mm` after normalization.
- Each supplied time must fall within the booking's Event Start Time and Event End Time.
- Overnight event ranges, where the end is logically on the following day, must be supported.
- When both values exist, Welcome Drink Start Time must be earlier than or equal to Main Course Start Time.
- Equal values are allowed.
- A disabled field cannot be newly populated through a direct API request.
- Disabling a setting does not invalidate, clear, or hide a historical saved value in details or print.

Errors must identify the affected field and explain whether the issue is invalid formatting, outside the event range, or incorrect ordering.

## Booking Details

Add a compact **Food Service Schedule** block near the Menu Snapshot in View Booking Details.

- Show only values that are saved.
- Display values in 12-hour format with AM/PM.
- Do not render an empty block when neither value exists.
- Continue showing historical values even when the corresponding setting is currently disabled.

The layout must follow the existing banquet popup design and remain mobile-first, tablet responsive, and desktop responsive.

## Print Output

Add available schedule values near the Selected Menu Snapshot or event information in the banquet print document.

- Show only saved values.
- Use the same labels as the UI.
- Format times in 12-hour format with AM/PM.
- Avoid empty placeholders.
- Preserve the existing print pagination and visual hierarchy.
- Bookings without schedule values must print exactly as before.

## CRUD Semantics

- **Create booking:** schedule values start as `null`; they are not required during inquiry creation.
- **Choose Menu:** saves the selected menu and optional enabled schedule values.
- **Edit Menu:** updates or clears the enabled schedule values without modifying unrelated booking fields.
- **Edit Booking:** preserves the schedule unless it explicitly participates in the menu workflow.
- **Disable setting:** hides new input while preserving stored values and historical output.
- **Delete booking:** removes schedule data with the booking document through the existing deletion flow.

The API remains backward compatible. Existing clients that omit both properties continue to function without behavior changes.

## Migration and Rollout

Add an idempotent settings migration/backfill that initializes both toggles to `false` when they are missing. Existing booking documents do not require a bulk migration because missing schedule fields map to `null`.

The deployment order must keep old clients compatible:

1. Deploy backend schema, response mapping, validation, and backward-compatible endpoints.
2. Run the idempotent settings backfill.
3. Deploy the frontend settings, menu popup, details, and print changes.

## Audit Coverage

Audit logs must cover:

- changing either configuration toggle;
- adding, changing, or clearing either booking schedule time through menu selection.

Audit metadata should identify the booking, company, actor, previous values, and new values without logging unrelated booking payload fields.

## Test Coverage

### Backend

- defaults and settings response mapping;
- independent toggle updates;
- permission, tenant, and banquet business guards;
- valid 24-hour values and normalization;
- event-range validation for ordinary and overnight events;
- ordering validation and equal-time allowance;
- one or both optional values omitted;
- rejection of new values for disabled fields;
- preservation of historical values after disabling configuration;
- preservation during unrelated partial booking updates;
- explicit clearing to `null`;
- booking detail and print data mapping;
- audit records;
- idempotent migration behavior.

### Frontend

- all four toggle combinations;
- Food Service Schedule visibility;
- `00`, `15`, `30`, `45` minute choices;
- Edit Menu hydration and clearing;
- field-level validation messages;
- entered state retained after failed saves;
- conditional booking-detail rendering;
- conditional print rendering and 12-hour formatting;
- mobile, tablet, and desktop layout checks.

### Regression

Verify existing banquet inquiry creation, confirmation, menu selection, menu editing, booking details, and printing with both settings disabled. Verify ODC and event-decoration flows are unaffected.

## Acceptance Criteria

The feature is complete when a banquet company can independently enable either schedule field, optionally enter valid times while choosing or editing a menu, see saved values in booking details and print output, and safely disable the configuration without losing historical booking data. Existing companies that do not enable the settings must observe no workflow or visual changes.
