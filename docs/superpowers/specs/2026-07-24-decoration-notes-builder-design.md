# Decoration Notes Builder Design

## Goal

Replace the event module's catalog-first decoration-selection experience with a mobile-first notes builder that matches how the client already prepares decoration proposals. Staff add one image-led block at a time, optionally link it to inventory, add one proposal-level General Notes section, recover unfinished work automatically, and generate the existing customer PDF directly from the saved selection.

This feature applies only to `EVENT_DECORATION` companies. Banquet booking, menu selection, reports, PDFs, settings, and data remain unchanged.

## Approved Experience

### Decoration blocks

Each block represents one visual decoration instruction and contains:

- One mandatory image.
- One mandatory title, up to 150 characters.
- A mandatory whole-number quantity of at least 1.
- An optional description, up to 1,000 characters.
- An optional decoration type/category.
- An optional catalog inventory item.
- A stable position used for drag-and-drop ordering.

There are two block modes:

1. **Inventory-linked:** created from an active configured decoration item. The editor shows live available quantity and the final save performs the existing authoritative availability and conflict validation.
2. **Custom:** created from the camera or gallery without an inventory item. It requires an uploaded image but does not reserve inventory.

Text-only decoration blocks are not allowed. Instructions without a dedicated image belong in General Notes.

### General Notes

The builder contains one proposal-level General Notes field:

- Optional.
- Maximum 5,000 characters.
- Stored separately from the booking's existing operational `notes`.
- Included in Event Detail's decoration snapshot.
- Included in View and downloaded customer PDF when non-empty.
- Omitted completely from the PDF when empty.

### Mobile-first editing

The default mobile flow is:

1. Open Choose/Edit Decoration from Event Detail.
2. Resume an autosaved draft when one exists.
3. Tap **Add Photo Note**.
4. Capture or choose an image and use the existing crop workflow.
5. Enter title, quantity and optional description.
6. Optionally link the block to a decoration type and inventory item.
7. Reorder or remove blocks.
8. Enter General Notes and final package price.
9. Preview or save the proposal.

The action footer remains attached to the bottom of the viewport. The content area scrolls internally. Tablet and desktop layouts use the same information architecture with image and fields arranged side by side.

## Autosave and Recovery

Unfinished work is stored in a separate `decoration_selection_drafts` collection. Drafts never update `decorationSnapshot`, change booking status, finalize package price, or create inventory reservations.

Each draft is company- and booking-scoped and contains:

- `restaurantId`
- `bookingId`
- ordered blocks
- `generalNotes`
- draft final-package-price input
- monotonically increasing `revision`
- `updatedByUserId`
- `createdAt` and `updatedAt`

The client autosaves after a short debounce when a meaningful field changes. Only one write may be active at a time. A newer local revision cannot be overwritten by an older response.

The UI communicates:

- `Saving draft…`
- `Draft saved`
- `Draft not saved — retrying`

Draft save failure does not close the editor or discard local data. It remains visible and retries after the next edit or an explicit Retry action.

When opening the builder:

- If a draft exists, resume it.
- Otherwise hydrate blocks and General Notes from the booking's saved decoration snapshot.

After a successful final save, the draft is deleted. A user may also choose **Discard Draft**, which requires confirmation and returns to the last finalized selection.

## Data and API Design

### Booking data

Add an optional `decorationGeneralNotes` string to event decoration bookings. Existing records require no value migration and behave as an empty General Notes section.

Existing `decorationSnapshot` remains the finalized customer-facing snapshot. Each new line receives a stable `position`. Historical lines without `position` retain their existing array order.

### Draft storage

Create `decoration_selection_drafts` with a unique index on:

```text
restaurantId + bookingId
```

The migration only creates/synchronizes the new collection index. It does not rewrite booking or banquet data.

### Endpoints

All endpoints inherit JWT, event-business, tenant and decoration-selection permission guards:

- `GET /decoration/selection-drafts/bookings/:bookingId`
- `PUT /decoration/selection-drafts/bookings/:bookingId`
- `DELETE /decoration/selection-drafts/bookings/:bookingId`

The PUT request includes the client revision. Stale revisions are rejected with a conflict response containing the current server revision.

The existing final selection endpoint remains the authoritative save operation. Its payload is extended backward-compatibly with:

- ordered positions
- `generalNotes`

Existing callers that omit these fields retain their current behavior.

## Image Lifecycle

Images continue using the existing event-specific S3 ownership rules and crop validation.

- A block cannot be finally saved without an owned image.
- Inventory-linked blocks may use a configured catalog image or an event-uploaded replacement.
- Custom blocks require an event-uploaded image.
- Removing a draft block does not immediately delete its object because the image may still be referenced by another local revision.
- Draft-only uploaded images are cleaned up after draft deletion or expiry when they are not referenced by a finalized snapshot.

Drafts expire after 30 days of inactivity. Cleanup is bounded, auditable and restricted to event-photo objects that are confirmed to be unreferenced.

## Final Save

Final Save:

1. Reloads the booking and validates tenant and mutable status.
2. Validates at least one block.
3. Validates image ownership, title, quantity, descriptions, order and General Notes.
4. Validates final package price against collected advances.
5. Validates inventory availability and conflicts for linked items.
6. Creates or replaces reservations transactionally using the existing reservation rules.
7. Writes the ordered immutable decoration snapshot and `decorationGeneralNotes`.
8. Finalizes package price and booking status.
9. Deletes the draft only after the finalized save succeeds.
10. Writes the existing selection audit entry plus draft lifecycle audit entries.

If final validation fails, the draft remains intact and the editor highlights the exact affected blocks.

## Event Detail and Customer PDF

Event Detail renders finalized blocks in their saved order and shows General Notes beneath the decoration snapshot when present.

View and Download use the same normalized customer-document DTO:

- Decoration Selection heading is left aligned.
- Each item uses a 50/50 image and text layout where page width permits.
- Mobile preview stacks image above text.
- General Notes appears after all decoration blocks.
- Print/PDF styling uses the existing black, white and slate document palette.
- Empty notes are not rendered.

The customer document never reads from an unfinished draft.

## Backward Compatibility

- No banquet collection, endpoint, route or component changes.
- Existing finalized decoration snapshots continue to render.
- Missing position uses existing array order.
- Missing General Notes renders nothing.
- Existing selection clients may omit new optional fields.
- Drafts are event-only and cannot be accessed by banquet companies.
- Final reservation and conflict logic remains authoritative.

## Validation and Failure Handling

- Image: mandatory and validated through the current JPEG/PNG/WebP limits.
- Title: trimmed, 1–150 characters.
- Quantity: integer, minimum 1.
- Description: optional, maximum 1,000 characters.
- General Notes: optional, maximum 5,000 characters.
- Position: unique non-negative integer within the proposal.
- Final package price: existing non-negative and collected-advance constraints.
- Maximum blocks per proposal: 100.
- Autosave payload is size bounded.

Network failure preserves local edits. Stale autosave responses cannot replace newer state. Authentication and permission failures stop retries and show the standard session/access response.

## Testing

Backend automation covers:

- Tenant and business-type isolation.
- Draft create, resume, update, stale-revision conflict, delete and expiry.
- No reservations or booking changes during autosave.
- Mandatory images and block limits.
- Ordered mixed inventory/custom blocks.
- General Notes limits and persistence.
- Final save deletes the draft only on success.
- Existing snapshots and omitted optional fields.
- Customer-document DTO and PDF General Notes behavior.
- Audit coverage and unreferenced-image cleanup safety.

Frontend automation covers:

- Mobile add/crop/edit/reorder/remove flow.
- Mandatory image/title/quantity validation.
- Inventory linking and live availability.
- General Notes character limit.
- Debounced autosave status and retry behavior.
- Stale-response protection and draft recovery.
- Discard confirmation.
- Final save error retention.
- Event Detail and PDF rendering.
- Static query-string navigation and responsive overflow checks.

Full event and banquet regression suites, static build, lint and dependency audit remain release gates.

## Migration

One additive event-only migration is required:

1. Create/synchronize the unique `restaurantId + bookingId` index for `decoration_selection_drafts`.

No existing booking data is rewritten. The optional `decorationGeneralNotes` and snapshot `position` fields are naturally absent from historical MongoDB documents and are handled through backward-compatible defaults.
