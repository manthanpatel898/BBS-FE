# Decoration Customer Address Design

## Goal

Add an optional customer address to event-decoration bookings and carry it
consistently through create, edit, event detail, customer document view, and
downloaded PDF without changing banquet bookings or breaking existing
decoration records.

## Data Model

- Store the value as `customer.address` inside the existing customer snapshot
  in the `decoration_bookings` collection.
- The value is nullable and optional. Existing records without the property
  remain valid and require no data migration.
- The existing top-level booking `address` continues to represent the
  event/venue address. It must not be reused for the customer address.
- Normalize whitespace-only input to `null`.
- Limit customer address input to 1,000 characters.

## API Behaviour

- Decoration booking create accepts `customerAddress?: string | null`.
- Decoration booking partial update accepts
  `customerAddress?: string | null`.
- Create and update map this DTO field to `customer.address`.
- Read models return `customer.address` as `string | null`.
- Omitted update fields do not modify the stored address; an explicit blank or
  `null` clears it.
- The field follows the decoration module's existing authentication, business
  type guards, audit logging, and changed-field update behaviour.

## User Interface

- Add a multiline `Customer Address (optional)` field to the decoration
  Create Inquiry and Edit Inquiry form.
- Populate the field while editing and submit its normalized value.
- Keep the control mobile-first, full width, and consistent with the existing
  textarea styling.
- In Event Detail, display Address inside the Customer card only when present.
- Do not display an empty placeholder row for legacy records.

## Customer Document and PDF

- Add the optional address to the customer document contract.
- In browser View, display it in the Customer section below mobile numbers.
- In the downloaded PDF, display it in the Customer information panel below
  mobile numbers.
- Preserve line wrapping for long addresses and adjust the paired Customer and
  Event & Venue panel height so neither side clips or overlaps.
- Continue using the existing event address in the Event & Venue section.

## Compatibility and Scope

- Banquet booking schemas, APIs, forms, detail views, reports, and PDFs remain
  unchanged.
- Decoration imports and incoming partner inquiries are not required to supply
  a customer address; bookings created through them store no address unless a
  user later adds one through Edit Inquiry.
- Existing decoration bookings, reports, calendar cards, dashboard cards, and
  follow-up logic continue to operate without requiring this field.
- No database migration or new index is required.

## Validation and Error Handling

- Reject non-string values and values longer than 1,000 characters through the
  existing DTO validation response format.
- Render user-entered text as plain text in the UI and PDF.
- A blank address is treated as absent rather than rendered as an empty row.

## Testing

- Backend DTO tests cover valid, blank, null, omitted, and over-limit values.
- Backend create/update tests cover storage, preservation on omitted partial
  updates, and explicit clearing.
- Customer document and PDF tests verify the address appears when present and
  is omitted when absent.
- Frontend form tests cover initial value, edit hydration, validation, payload
  normalization, and clearing.
- Frontend detail/document tests verify conditional rendering.
- Run decoration module regressions, backend lint/build, and frontend
  lint/static build before completion.
