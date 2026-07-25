# Decoration PDF and Event Detail Layout Corrections

## Scope

Improve the event-decoration customer proposal and Event Detail popup without
changing banquet behavior or stored booking data.

## PDF Header

- The company identity header appears on every PDF page.
- Every page includes company name, configured phone numbers, configured
  address, proposal title, and booking number.
- Continuation pages use smaller typography and a tighter header height, but do
  not omit contact information.

## PDF Page Geometry

- Reduce A4 page margins from the current oversized layout to compact,
  print-safe margins.
- Use the resulting width for information tables, payment details, notes, and
  decoration images.
- Keep page numbers and safe bottom spacing.

## Payment Presentation

- Keep Package, Received, and Pending values together in one compact summary
  row.
- Render advance payments in the banquet-style ledger format with Date,
  Payment Mode, Remark, and Amount columns.
- Add a final Total Advance Received row.
- Repeat the PDF header normally when the ledger continues onto another page.

## Event Detail Customer Card

- On mobile and tablet widths, show Name and Mobile in two equal columns when
  sufficient width exists.
- On very narrow mobile widths, stack them.
- In the narrow desktop supporting column, use full-width stacked rows so long
  values do not wrap inside small unused grid cells.
- Other Event Detail grids retain their existing responsive behavior.

## Compatibility

- No schema or data migration is required.
- No banquet component or banquet PDF behavior is changed.
- View and downloaded PDF continue to use the same normalized customer
  document data.

## Verification

- Add regression tests for repeated contact details in continuation headers.
- Add tests for compact page margins and the advance ledger total.
- Add a layout regression test for the Customer card’s responsive column rules.
- Run decoration frontend tests, backend customer-document/PDF tests, lint,
  type checking, and static production builds.
