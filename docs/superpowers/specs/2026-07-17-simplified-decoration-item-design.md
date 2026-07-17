# Simplified Decoration Item Design

## Objective

Remove advanced inventory and logistics configuration from the event-decoration frontend and backend API. Adding a decoration item must support attaching an item image in the same popup.

## Public Item Contract

The Add/Edit Item workflow exposes only:

- Decoration type
- Item name
- Description (optional)
- Total quantity
- Item image when creating an item

The frontend does not display tracking mode, maintenance quantity, tagged units, logistics mode, setup time, removal time, turnaround time, or storage notes.

The backend create/update DTO does not accept those advanced fields. New and updated items receive these internal values:

```text
trackingMode = BULK
maintenanceQuantity = 0
units = []
logisticsMode = SLOT_ONLY
setupBufferMinutes = 0
removalBufferMinutes = 0
turnaroundBufferMinutes = 0
storageNote = null
```

These internal fields remain in the schema because reservation, conflict, dashboard, and reporting code already depends on their presence. They are implementation defaults, not customer-configurable features.

There is no existing decoration item data, so no data migration is required. Existing index migration scripts remain unchanged.

## Add Item with Image

The Add Item popup contains an optional JPEG, PNG, or WebP image picker supporting camera and gallery. Existing limits remain authoritative: nonempty valid image, maximum 8 MB, and server-side Sharp validation/conversion.

Save is an intentionally recoverable two-step operation:

1. Validate and create the item using the simplified JSON API.
2. If an image was selected, upload it to the newly created item through the existing item-image endpoint.

If item creation fails, no upload is attempted and the popup retains all input. If item creation succeeds but the image upload fails, the item remains created; the UI clearly reports that the item was saved without its image, refreshes the list, and provides the existing item-card Camera/Gallery action for retry. Duplicate clicks are disabled while either request is running.

Edit Item changes the simplified item fields. Image management remains on the saved item card, where users can add, remove, and choose a cover image.

## Backend Behavior

`DecorationItemDto` accepts only category ID, name, optional description, and total quantity. The catalog service owns the safe internal defaults on both create and update.

Update resets advanced internal values to the defaults because the customer has no data and the feature is being removed before production use. Reservation behavior becomes simple quantity-based, slot-only conflict checking.

Validation continues to enforce tenant-owned active categories, normalized tenant/category item-name uniqueness, positive whole-number quantities, authorization, audit logging, and active-state rules.

## Testing

Backend tests cover DTO rejection/stripping of advanced input, default persistence on create/update, quantity validation, and reservation compatibility with bulk slot-only defaults.

Frontend tests cover the simplified payload, removal of advanced fields, image type/size validation, create-without-image, create-then-upload, create failure, upload failure after successful create, duplicate-submit prevention, and retained retry capability.

Production builds and the complete decoration regression suites must pass. No banquet files, collections, or endpoints are changed.

## Acceptance Criteria

- Advanced Inventory and Logistics is absent from Add/Edit Item.
- Advanced fields are absent from the backend create/update DTO.
- New and updated items use safe bulk, slot-only internal defaults.
- Add Item accepts an optional camera/gallery image.
- A successful create followed by successful upload immediately displays the image.
- Upload failure never deletes or duplicates the successfully created item.
- Existing item-card image retry, cover, and removal actions remain functional.
- No migration is added.
- Decoration reservations and banquet workflows continue to pass regression tests.
