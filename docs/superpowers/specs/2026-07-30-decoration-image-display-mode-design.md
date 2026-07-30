# Decoration Image Display Mode Design

## Goal

Preserve the user's upload choice throughout the event-decoration workflow:

- `Crop & Use` images fill their fixed image box.
- `Use Full Image` images show the complete image inside the same fixed box, with neutral blank space when aspect ratios differ.

The behavior must remain consistent in settings, inventory selection, Decoration Notes Builder, Event Detail, customer view, browser print, and downloaded PDF.

## Display Contract

Introduce one shared two-value contract:

- `COVER`: center the image and fill the fixed box; clipping is allowed.
- `CONTAIN`: center the complete image within the fixed box; clipping is forbidden and blank space is allowed.

The upload editor determines the value:

- `Crop & Use` produces `COVER`.
- `Use Full Image` produces `CONTAIN`.

All image boxes retain their existing fixed dimensions and responsive layout. Empty space uses the platform's neutral light background rather than stretching the image.

## Compatibility

Existing catalog images and saved decoration snapshots do not contain display-mode metadata. Missing or invalid values resolve to `COVER`, preserving the current production appearance.

No migration is required. New writes include the field, while reads tolerate legacy records.

## Data Flow

1. The crop modal returns both the processed `File` and its display mode.
2. Catalog and custom-image upload requests include `displayMode` in multipart form data.
3. The backend validates the value and stores it with catalog image metadata.
4. Custom-image upload responses return the validated mode.
5. Decoration draft blocks retain the mode.
6. Saving a decoration selection copies the mode into the immutable booking snapshot.
7. Customer-document mapping retains the snapshot mode.
8. React views choose `object-cover` or `object-contain`.
9. The PDF renderer chooses PDFKit `cover` or `fit`.

The mode describes presentation only. It does not change S3 keys, ownership validation, image optimization, availability logic, or booking data.

## Affected Surfaces

- Decoration catalog item creation and additional-image upload.
- Decoration catalog type/item previews.
- Inventory image picker and inventory gallery.
- Custom photo-note upload.
- Decoration Notes Builder blocks.
- Selected Decoration in Event Detail.
- Customer proposal View and browser print.
- Downloaded customer proposal PDF.
- Full-screen image preview.

Small thumbnails may keep their fixed dimensions, but must still honor the stored mode. `CONTAIN` thumbnails use a neutral background so the complete image remains recognizable.

## API and Model Contract

Use the literal values `COVER` and `CONTAIN`.

- Multipart uploads accept `displayMode`.
- Missing values default to `COVER`.
- Unsupported values are rejected rather than silently stored.
- Catalog image responses include `displayMode`.
- Custom image upload responses include `displayMode`.
- Draft and selection payload images carry `displayMode`.
- Snapshot and customer-document image objects carry `displayMode`.

Frontend normalization also defaults missing values to `COVER` so cached or legacy API data renders safely.

## Error Handling

- A bad display mode returns a clear validation error.
- Image upload and deletion rollback behavior remains unchanged.
- Failed image loading uses the existing stable fallback.
- PDF image decoding failures continue to render “Image unavailable”.
- Display-mode metadata must never cause an otherwise valid legacy booking to fail.

## Testing

Automated tests must prove:

- Crop confirmation emits `COVER`.
- Full-image confirmation emits `CONTAIN`.
- Both upload APIs transmit the mode.
- Invalid backend modes are rejected.
- Legacy missing modes normalize to `COVER`.
- Catalog images retain the mode.
- Custom images and saved snapshots retain the mode.
- Event Detail and customer view select the correct object-fit class.
- PDF rendering uses `cover` for `COVER` and `fit` for `CONTAIN`.
- Existing banquet behavior remains untouched.

Run frontend lint, type checking/build, focused decoration tests, backend lint/build, focused catalog/selection/customer-document/PDF tests, and regression tests before completion.

