# Decoration Settings and Inquiry Configuration Design

## Objective

Provide event-decoration companies with banquet-quality Settings and Company Profile experiences while keeping decoration configuration and booking behavior isolated from the banquet module. Users must be able to configure event types, hotels, venues, and halls from Settings and create missing values safely from the inquiry form.

## Scope

This change covers:

- Decoration Company Profile.
- Decoration Event Type configuration.
- Hotel, Venue, and Hall configuration.
- Cascading Hotel/Venue and Hall controls in Add/Edit Inquiry.
- Permanent creation of values entered through an `Other` option.
- Removal of Function Name from the decoration inquiry UI.
- Backward compatibility for existing bookings, imports, reports, prints, and APIs.

It does not expose banquet-specific settings such as menus, service slots, pax rules, hall-slot status, or banquet print rules to decoration companies.

## Architecture

Create a decoration-specific Settings experience under the decoration route namespace. It will reuse the banquet visual language and general Company Profile APIs, but it will not render or conditionally embed the banquet Settings page.

The page will contain three business-specific sections:

1. Company Profile
2. Event Types
3. Hotels, Venues & Halls

Shared UI primitives may be extracted where safe, but decoration data fetching, mutations, permissions, and state remain within decoration components. Existing banquet routes and behavior remain unchanged.

## Navigation and Page Structure

- Replace the decoration navigation label `Configuration` with `Settings`.
- Route the item to `/decoration/settings` using a static-compatible path.
- Use query-string state for tabs where deep links are useful, for example `/decoration/settings?tab=venues`.
- Preserve `/decoration/configuration` as a backward-compatible redirect or lightweight route to the new Settings destination.
- Match the banquet Settings content width, section cards, tabs, labels, buttons, modals, loaders, toasts, and responsive behavior.

## Company Profile

The Company Profile section uses the existing restaurant/company record and general branding APIs. Decoration-facing copy uses `Company`, not `Restaurant`.

Supported information includes:

- Company name.
- Company logo.
- Public contact numbers.
- Preview of saved branding.

Logo upload keeps the banquet validation rules and storage flow. The first release deliberately matches the existing banquet Branding & Contacts contract: name, logo, and public contact numbers. Saving updates the authenticated session logo immediately so the application shell reflects the new branding without requiring a new login.

Banquet-only settings are never fetched or rendered for an event-decoration company.

## Event Type Configuration

Settings supports:

- List and search.
- Add.
- Edit.
- Activate and deactivate.
- Duplicate-name prevention using normalized, case-insensitive comparison on the server.
- Stable display order.

Only active Event Types appear in Add/Edit Inquiry. Historical bookings retain their event type snapshot even if a configured type is later renamed or deactivated.

## Hotel, Venue, and Hall Configuration

Each configured location contains:

- Name.
- Required type: `HOTEL` or `VENUE`.
- Optional address.
- Active state.
- Zero or more halls.

Halls are optional for both Hotels and Venues. Each hall belongs to exactly one configured location and contains a name and active state.

Settings supports:

- Add, edit, activate, and deactivate a Hotel/Venue.
- Add, edit, activate, and deactivate halls under a selected parent.
- Duplicate prevention for location names within a company.
- Duplicate prevention for hall names within the same parent location.

Deactivation does not remove historical references. A location with active booking references cannot be hard-deleted.

## Add/Edit Inquiry Behavior

### Event Type

- Show active configured Event Types.
- Append `Other` as the last option.
- Selecting `Other` reveals a required custom Event Type input.
- On Save, create the normalized Event Type first, select the returned identifier, and then create/update the inquiry.
- If another request creates the same normalized value concurrently, resolve the existing record and continue without producing a duplicate.

### Hotel/Venue

- Show active configured Hotels and Venues with their type visible in the option label.
- Append `Other` as the last option.
- Selecting `Other` reveals required Location Name and Location Type controls plus optional address.
- Save the new location permanently before creating/updating the inquiry.
- After choosing or creating a location, show only its active halls.
- Hide Hall completely when the selected location has no active halls.
- Provide `Other Hall` as the final hall option when halls exist, and an `Add Hall` action when none exist.
- A custom hall is saved permanently under the selected location before the inquiry is saved.
- Changing Hotel/Venue clears any hall that does not belong to the new location.

### Function Name

Remove Function Name from Add/Edit Inquiry. The server derives and snapshots `functionName` from the selected Event Type name when the inquiry is created. Existing records retain their stored value, and renaming an Event Type does not rewrite historical bookings.

The backend continues returning `functionName` during the compatibility period so existing reports, imports, print layouts, and deployed clients remain functional.

## Access Control

For the current release, all authenticated users belonging to an `EVENT_DECORATION` company may:

- View decoration Settings.
- Create Event Types, Hotels, Venues, and Halls from Settings or Inquiry.
- Edit and activate/deactivate configuration records.

Company Profile mutation retains the existing company-admin restriction because it changes tenant-wide identity and public branding. Employees may view the saved profile but cannot change it.

Business-type guards and tenant scoping remain mandatory. Every query and mutation is restricted to the authenticated company. The existing RBAC permission constants remain available for a future release but do not block these decoration configuration actions now.

## Data and Migration

- Add a required location type to decoration venue records, defaulting existing records to `VENUE` unless a deterministic migration rule identifies a Hotel.
- Preserve the existing decoration collections; do not merge them into banquet settings collections.
- Add or verify tenant-scoped normalized unique indexes for Event Type names, Location names, and Hall names within a parent.
- Keep migrations idempotent, dry-run capable, and reconciled before marking the feature complete.
- Existing `functionName` data is not removed.

## Reliability and Concurrency

- Disable Save while a form submission is active.
- Treat configuration creation and booking creation as a bounded workflow with explicit error recovery.
- If configuration creation succeeds but booking creation fails, preserve form values and the newly created selection so the user can retry.
- Use server-side normalized uniqueness and duplicate recovery to handle concurrent `Other` submissions.
- Do not clear Hall until the parent location actually changes.
- Refresh only the affected configuration list after inline creation.

## Audit Coverage

Audit events cover:

- Company Profile updates.
- Logo updates.
- Event Type creation, update, activation, and deactivation.
- Hotel/Venue creation, update, activation, and deactivation.
- Hall creation, update, activation, and deactivation.
- Configuration automatically created from Add/Edit Inquiry.

Audit metadata records the source as `SETTINGS` or `INQUIRY_FORM` where applicable.

## Responsive and Accessibility Requirements

- Match banquet Settings and modal behavior on desktop, tablet, and mobile.
- Inputs have visible labels, required indicators, inline errors, and keyboard focus states.
- Dependent controls announce loading and empty states.
- Modals trap interaction, provide a labelled Close action, and protect dirty forms from accidental dismissal.
- No horizontal overflow at 390 px.

## Testing and Acceptance

Automated coverage includes:

- Location type and hall migration.
- Tenant isolation and business-type guards.
- Normalized duplicate and concurrent-create handling.
- Event Type `Other` creation followed by booking creation.
- Hotel/Venue `Other` creation with and without a Hall.
- Hall filtering by selected parent.
- Clearing an invalid Hall after parent change.
- Function Name derivation and historical snapshot stability.
- Profile update and logo validation.
- Audit events for Settings and inline creation.
- Existing banquet Settings, booking, calendar, and inquiry regression tests.
- Static production build and query-string navigation.

Acceptance requires all automated tests, lint, backend build, frontend static build, migrations, and focused manual responsive checks to pass.
