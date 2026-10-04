# Restoring saved menu selections

The booking menu wizard reconciles an editing draft against the selected
category on opening, switching packages, and loading quotation selections.
It refreshes the selected category on opening and checks every package's
configuration again before saving or generating a quotation.

Matching order:

1. Keep an existing menu ID at a valid direct-item or section destination.
2. For changed IDs, require a unique match on normalized menu title, section,
   and item name within the selected category. No fuzzy or item-only matching.
3. Keep unmatched saved choices checked inside the flexible menu selector.
   Existing groups include their saved items and sections; historical menu IDs
   remain in their own titled expandable group rather than being guessed into
   another group. Matching old/new duplicate selections are combined.

Supported add-ons at unchanged destinations remain add-ons, not errors. Old
add-ons whose menu ID or section no longer exists remain visible. Standard
custom menus remain supported; they are not silently imported into flexible
categories. Counts include all saved selections. No separate review panel or
client-side unmatched-item save gate is shown; server validation is unchanged.
Refreshing category data does not disable expanding or editing menu groups.

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

The selector uses the existing responsive grid, 44px controls and wizard scroll area.
Authenticated end-to-end mobile/tablet visual checks are still required before
production release. No database migration or backend deployment is needed.
