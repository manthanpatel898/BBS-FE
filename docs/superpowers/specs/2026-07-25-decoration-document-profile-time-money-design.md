# Decoration Document, Profile, Time, and Money Design

## Scope

Improve only the event-decoration business flow. Banquet behavior must remain
unchanged.

## Customer document

The JSON document view and server-rendered PDF will share one financial
contract containing final package amount, total amount received, pending
amount, package-finalization state, and the complete payment history. When the
package has not been finalized, package and pending values render as “Not
finalized”; received payments remain visible.

The company header will include the configured company address below its
contact numbers. This is distinct from the event venue address.

## Company profile

The event company profile will expose the existing restaurant `address` field.
The existing branding endpoint will accept a trimmed, bounded address. No new
database field or migration is required.

## Time entry

Time Slot remains required and independent. Start Time and End Time become
required manual selections using the same Hour / Minute / AM-PM interaction as
the banquet form. Selecting a slot never fills or changes the manual times.
Stored times remain `HH:mm`; existing records continue to load. Interactive
create/update endpoints reject missing or identical times.

## Monetary inputs

Event monetary fields use text inputs with `inputMode="decimal"` and shared
normalization/validation. This prevents mouse-wheel mutation while preserving
mobile numeric keyboards and two-decimal precision. Inventory quantity inputs
remain numeric.

## Compatibility

Existing records and collections remain unchanged. Legacy `timeSlot` values
remain valid. Import-specific time fallback behavior remains isolated from the
interactive booking form. Tests cover both event behavior and banquet
regression boundaries.
