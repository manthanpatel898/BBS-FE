# Restoring saved menu selections

The booking menu wizard reconciles an editing draft against the selected
category on opening, switching packages, and loading quotation selections.
It refreshes the selected category on opening and checks every package's
configuration again before saving or generating a quotation.

Matching order:

1. Keep an existing menu ID at a valid direct-item or section destination.
2. For changed IDs, require a unique match on normalized menu title, section,
   and item name within the selected category. No fuzzy or item-only matching.
3. Keep unmatched items visible under **Previously selected — needs review**.
   Saving is blocked until each is explicitly replaced or removed. Removal
   requires confirmation. Matching old/new duplicate selections are combined.

Supported add-ons at unchanged destinations remain add-ons, not errors. Old
add-ons whose menu ID or section no longer exists require review. Standard
custom menus remain supported; they are not silently imported into flexible
categories. Review counts are separate from the current selected-item count.

Only editable form state changes during reconciliation. Cancel discards the
draft. No historical booking, invoice, quotation snapshot, price, or restaurant
configuration is rewritten. Primary and additional packages are reconciled
independently. Backend validation and restaurant scoping remain unchanged.

If configuration changes before saving, the wizard refreshes it and asks for
another review instead of sending the old payload. API failures retain edits.
The server remains authoritative if another change occurs after that check.

## Verification

Focused behavioral checks:

```
node --import tsx --test lib/bookings/menu-selection-reconciliation.spec.ts components/bookings/menu-selection-review.spec.tsx
```

The review panel stacks controls on mobile, wraps actions on larger screens,
uses readable text and 44px controls, and lives inside the wizard's scroll area.
Authenticated end-to-end mobile/tablet visual checks are still required before
production release. No database migration or backend deployment is needed.
