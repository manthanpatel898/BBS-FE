# Advance Payment Print Time Design

## Problem

Banquet advance payments contain two timestamps with different meanings:

- `date` is the user-selected business/payment date. Date-only values are stored as UTC midnight.
- `createdAt` is the actual instant when the payment entry was captured in the application.

The print view currently formats `date` as both date and time. In India, UTC midnight becomes `05:30`, so backdated or confirmation-time advance entries incorrectly show the same `05:30` time.

## Approved Presentation

Keep the existing compact Date column and display:

```text
DD/MM/YYYY, hh:mm AM/PM
```

The date portion comes from `payment.date`. The time portion comes from `payment.createdAt`. Both are formatted explicitly for `Asia/Kolkata`, so rendering is independent of the browser or server timezone.

If a legacy payment lacks a valid `createdAt`, print only the payment date rather than inventing a time.

## Scope and Compatibility

- Apply the formatter to both banquet advance-payment tables rendered by the shared print view.
- Do not change payment capture, API contracts, database schemas, or historical records.
- Do not change ODC or event-decoration payment behavior outside the shared banquet print rows.
- No migration is required.

## Testing

Add focused formatter coverage proving:

1. A date-only payment value no longer contributes `05:30` as its displayed time.
2. A UTC capture timestamp is rendered in 12-hour India time.
3. A missing or invalid capture timestamp falls back to date-only output.
4. Existing print-date tests, frontend lint, and static build continue to pass.

