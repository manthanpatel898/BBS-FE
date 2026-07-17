# Decoration Customer Document and Image Crop Design

## Goal

Provide a professional customer-facing decoration proposal that can be viewed, downloaded as a real PDF, or printed, and make every uploaded decoration image consistently presentable through a mobile-friendly 4:3 crop workflow.

## Scope

This design covers:

- The customer decoration document opened from Event Detail.
- Company branding in the document header.
- Event Type placement inside Event & Venue.
- True PDF download rather than asking the user to choose “Save as PDF”.
- Fixed 4:3 cropping for catalog item images uploaded from Settings.
- Fixed 4:3 cropping for custom decoration images uploaded while choosing decorations.

It does not change booking, payment, reservation, catalog, or document-visibility business rules.

## Customer Document Actions

The existing View, Download, and Print actions remain permission-controlled by `decoration.print`. They remain visible only when the booking is no longer an inquiry and an immutable decoration snapshot exists.

- **View** opens the customer document in the existing static route using the `bookingId` query parameter. It does not automatically print.
- **Print** opens the same customer document route and invokes the browser print dialog after all document data and images are ready.
- **Download** calls an authenticated backend endpoint that returns `application/pdf` with a content-disposition filename of `<booking-number>-decoration-proposal.pdf`. The browser downloads the returned file directly without opening the print dialog.

The static frontend must not introduce dynamic path segments. All browser routes remain query-string based.

## Shared Document Data

The backend customer-document response will expose one normalized document definition containing:

- Company name.
- Company logo URL, when configured.
- Configured company contact numbers.
- Booking number and status.
- Customer name and mobile number.
- Event type.
- Event date or multi-day range.
- Start and end time.
- Time slot.
- Banquet or outdoor venue name.
- Hall name when applicable.
- Address when available.
- Immutable, category-grouped decoration snapshot lines.
- Snapshot image URL, item name, quantity, optional description, and custom-item marker.

The HTML View/Print renderer and backend PDF renderer consume this same normalized definition so their content and visibility rules do not drift.

## Document Layout

The customer document uses an A4 portrait layout and follows the existing banquet print visual language.

### Header

- Company logo on the left when configured.
- Company name in prominent text.
- All configured contact numbers displayed below the company name.
- “Decoration Proposal” on the right.
- Booking number below the document title.

If the logo is absent, the company name and contacts remain aligned without an empty logo placeholder. Missing contacts are omitted rather than displaying internal fallback text.

### Booking Information

Two compact sections appear below the header:

1. **Customer**
   - Name
   - Mobile number

2. **Event & Venue**
   - Event Type
   - Date or date range
   - Time
   - Time Slot
   - Banquet / Outdoor Venue
   - Hall, or “Not applicable”
   - Address, or “Not provided”

Event Type must not appear as a standalone header subtitle. It belongs inside Event & Venue.

### Decoration Selection

- Decorations are grouped by snapshot category.
- Each item shows the immutable snapshot image, item name, quantity, and optional description.
- Custom items are clearly identifiable without exposing internal identifiers.
- Missing or expired historical images render a stable “Image unavailable” fallback.
- Cards do not split awkwardly across pages.
- Images retain their 4:3 crop and use print-safe color rendering.
- Long selections continue over multiple numbered pages with a repeated compact company/document header where supported by the PDF renderer.

## PDF Generation

The backend owns true PDF generation because it is more reliable for mobile devices and does not depend on cross-origin canvas access to S3 images.

The backend will use PDFKit as a focused streaming PDF dependency. It will not add Chromium/Puppeteer. PDF layout code will live behind a dedicated decoration customer-document renderer rather than inside the booking controller.

The PDF endpoint will:

- Reuse the same authentication, business-type guard, booking ownership, permission, confirmation, and snapshot checks as the HTML customer-document endpoint.
- Load company branding and immutable booking snapshot data server-side.
- Fetch logo and snapshot images with bounded timeouts and size limits.
- Continue generating the PDF when an individual image cannot be loaded, using an image fallback.
- Generate the response in memory or a bounded temporary stream without storing customer PDFs permanently in S3.
- Set `Content-Type: application/pdf`, a sanitized attachment filename, and no-store cache headers.
- Record an audit event for successful PDF downloads.

The frontend Download action shows a busy state, prevents duplicate requests, validates the response type, creates a temporary object URL, starts the download, and always revokes the object URL.

## Image Crop Workflow

One reusable crop modal is used by both upload entry points:

1. Settings -> Decoration -> selected type -> Add/Edit item image.
2. Event Detail -> Choose Decoration -> Custom Decoration -> Camera / gallery.

The frontend will use `react-easy-crop` for the touch/keyboard crop viewport and a small, independently tested canvas export utility for orientation, rotation, resizing, encoding, and cleanup. Upload-owning components receive only the confirmed cropped `File`.

### Interaction

- Selecting or capturing an image opens the crop modal before any upload starts.
- The crop viewport is fixed at 4:3 landscape.
- Users can drag the image, pinch on touch devices, use a zoom slider, rotate in 90-degree steps, reset, cancel, or confirm.
- Confirm produces a new upload file; the original file is not uploaded.
- Cancel returns to the parent popup without changing the current item or selection.
- Closing the crop modal returns to the exact parent workflow and preserves all unsaved form data.

### Output Rules

- Apply EXIF orientation before showing and exporting the crop.
- Export a maximum 1600 x 1200 image.
- Preserve PNG only when transparency is present; otherwise export an optimized JPEG or WebP at a quality that avoids visible degradation.
- Keep the existing maximum upload-size, accepted-file-type, file-signature, and image-count validations.
- Revalidate the cropped file before upload.
- Reject unreadable, zero-dimension, or unsupported images with a clear inline error.
- Revoke all preview/object URLs after confirm, cancel, replacement, and component unmount.

Existing catalog images are not retroactively cropped. Cropping applies only to new image uploads.

## Mobile and Accessibility

- Crop and document controls have at least 44px touch targets.
- The crop modal uses the full mobile viewport, respects safe-area insets, and owns its scrolling.
- Pinch and drag must not scroll the page behind the modal.
- Keyboard users can operate zoom, rotate, reset, cancel, and confirm.
- Focus returns to the original upload trigger after closing.
- All controls have visible focus states and accessible labels.
- The document remains readable on phones while preserving A4 print layout in print/PDF mode.

## Failure Handling

- Document fetch failures retain a retry action and never render a partially authorized document.
- PDF generation failures return a stable API error and leave the Event Detail popup intact.
- A PDF image failure affects only that image, not the complete document.
- Crop processing failures retain the original selected file for retry or replacement.
- Upload failures retain the confirmed cropped file so the user can retry without cropping again during the same open workflow.
- Duplicate Download clicks are ignored while a request is active.

## Testing Strategy

### Frontend

- Action routing tests for View, Download, and Print using query parameters.
- PDF download tests covering filename, content type, busy state, duplicate prevention, error cleanup, and object URL revocation.
- Customer document layout tests confirming company branding and Event Type inside Event & Venue.
- Crop geometry tests for 4:3 output, zoom, rotation, bounds, EXIF orientation, and maximum dimensions.
- Component tests for catalog and custom-image crop entry points, cancel/confirm behavior, retained state, upload retry, focus restoration, and object URL cleanup.
- Mobile viewport and accessibility regressions.

### Backend

- Authorization, business type, tenant ownership, document gating, and permission tests.
- PDF content-type, attachment filename, no-store headers, and audit tests.
- Multi-page, missing logo, missing contact, missing image, custom item, long description, and large selection tests.
- Bounded remote-image download tests for timeout, size, invalid content type, and partial fallback.

### Visual Verification

- Render representative PDFs to images and inspect A4 spacing, page breaks, header consistency, text clipping, image sharpness, and fallback presentation.
- Verify phone, tablet, and desktop crop interaction with camera and gallery sources.

## Acceptance Criteria

- Event Type appears inside Event & Venue in View, PDF, and Print.
- Company logo, company name, and configured contact numbers appear in the document header like banquet print documents.
- Download produces a valid `.pdf` file directly.
- View does not automatically open printing.
- Print opens the browser print dialog only after content and images are ready.
- Settings and custom decoration uploads both require a confirmed 4:3 crop.
- Cropped images are readable, correctly oriented, bounded in size, and accepted by existing backend image validation.
- Existing banquet functionality and decoration booking/reservation behavior remain unchanged.
