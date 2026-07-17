# Decoration Settings Master-Detail Design

## Goals

Make decoration settings fast to understand on mobile and desktop by separating parent configuration from child records. Fix unreadable text in Choose Decoration controls and replace ambiguous location terminology with business-friendly labels.

## Decoration catalog

The Decoration tab initially shows only decoration type cards. Each card contains:

- Type name and active/inactive status.
- Active and total item counts.
- Up to several compact item-image previews in a horizontal carousel with previous/next controls when required.
- Clear Open Type, Edit, and Activate/Deactivate actions with explicit high-contrast colors.

The main view contains Add Type but no general Add Item action. Selecting a type opens a same-page detail level with a Back to Decoration Types control, the selected type name/status, Add Item, Edit Type, and only that type's items. Search/filter state remains scoped to the current level. Creating an item always receives the selected type ID, eliminating ambiguous item creation.

Empty, loading, error, inactive, and image-fallback states remain readable and actionable. Item images retain cover selection, upload, removal, edit, quantity, and activation behavior.

## Locations and halls

The Locations tab initially shows only location cards. User-facing terminology changes while stored values and APIs remain compatible:

- `HOTEL` displays as **Banquet**.
- `VENUE` displays as **Outdoor Venue**.
- The tab and section display **Banquets, Outdoor Venues & Halls**.

Each location card shows its name, display type, address, hall count, status, and Open Location/Edit/Activate controls. Selecting a location opens a same-page detail level with Back to Locations, its details, Add Hall, and only that location's halls. Hall CRUD and activation remain scoped to the selected location. Outdoor venues may have no halls and show a clear optional-hall empty state.

The inquiry form and Event Detail use the same Banquet/Outdoor Venue wording. Internal DTO fields, `venueId`, `HOTEL`/`VENUE` enum values, collections, and stored snapshots remain unchanged, preventing migration or compatibility risk.

## Choose Decoration contrast

Every input, number field, select, textarea, and custom-item field in Choose Decoration explicitly uses a white background and dark slate text. Placeholders use muted slate text and disabled controls remain readable. Styling is scoped to chooser components and does not alter global theme behavior.

## Responsive behavior

- Parent cards use one column on phones, two on tablets, and three where desktop width permits.
- Detail headers keep Back and primary actions visible without horizontal overflow.
- Image previews scroll horizontally with touch and provide accessible previous/next buttons.
- Item and hall actions wrap cleanly; no control depends on hover.
- All interactive controls use at least readable mobile touch padding and visible focus states.

## State and navigation

Master/detail selection is local component state, so the static route remains `/decoration/settings?tab=decoration` or `?tab=venues`. Back returns to the parent list without changing routes. If the selected parent becomes unavailable after refresh, the component safely returns to its master list.

No backend, migration, database, permission, or API contract changes are required.

## Verification

- Unit tests cover master-only initial state, parent selection, scoped child lists, safe fallback when a parent disappears, terminology mapping, and explicit chooser input contrast.
- Existing decoration settings, form, catalog, and booking tests remain green.
- TypeScript, lint, and static production build pass.
- Manual checks cover phone, tablet, and desktop parent/detail navigation, carousel controls, CRUD actions, empty states, inactive records, and input readability.
