# Centralized Banquet Tax Invoices Design

## Purpose

Provide each banquet company with a restaurant-scoped Tax Invoices workspace so authorized users can find, view, download, and correct previously generated invoices without locating the related booking first.

The existing booking invoice workflow remains available and unchanged. The new workspace is another safe entry point into the same immutable invoice lifecycle.

## Scope

This feature applies only to banquet companies with tax invoicing enabled. It includes:

- a Tax Invoices sidebar entry;
- a responsive invoice list with server-side filters, sorting, summaries, and pagination;
- invoice view and PDF download actions;
- correction through the existing cancel-and-reissue lifecycle;
- navigation to the source booking;
- tenant isolation, RBAC, auditing, database indexes, and automated tests.

It does not add direct invoice mutation, deletion, bulk invoice export, payment collection, or a separate invoice numbering system.

## Accounting Lifecycle

Issued invoices are immutable. A correction must:

1. load the issued invoice snapshot;
2. allow correction of supported recipient billing information and discount fields;
3. require a correction reason;
4. cancel the current invoice;
5. issue a replacement with the next valid invoice number;
6. link the old and replacement invoices;
7. preserve both PDFs and the complete audit history.

Cancelled invoices remain visible. They can be viewed and downloaded but cannot be edited or reissued again. If an invoice has a replacement, the list and detail UI provide a direct link to it.

## Navigation and Authorization

Add a `Tax Invoices` entry to the banquet sidebar. It is visible only when:

- the signed-in company is a banquet company;
- restaurant billing is enabled; and
- the user has `bookings.invoices.view`.

The page uses the static-deployment-compatible route `/invoices/`. Filters and navigation state use query parameters rather than dynamic frontend routes.

Actions retain the existing permissions:

- view/list: `bookings.invoices.view`;
- download: `bookings.invoices.download`;
- cancel and reissue: `bookings.invoices.cancel_reissue`, company admin only.

Opening the related booking uses the existing booking calendar route and query-string overlay state.

## Invoice Workspace UI

### Header and summaries

The page header identifies the module and includes responsive filters. Summary cards reflect the complete filtered result, not only the current page:

- issued invoice count;
- cancelled invoice count;
- taxable value;
- GST value;
- grand total.

Cancelled invoice values are excluded from financial totals while remaining represented in the cancelled count.

### Filters

The backend owns filtering and sorting. Supported filters are:

- search by invoice number, customer name, mobile number, or booking reference;
- status: All, Issued, or Cancelled;
- invoice issue-date range;
- event-date range;
- sort by newest or oldest invoice issue date;
- page and bounded page size.

Dates use the restaurant's business timezone and inclusive calendar-day boundaries. Invalid ranges return clear validation errors.

### Desktop and tablet

Use a responsive table with these columns:

- invoice number and issue date;
- customer name and mobile;
- event type and event date;
- taxable amount;
- GST amount;
- grand total;
- status;
- actions.

### Mobile

Use full-width invoice cards with no page-level horizontal scrolling. Each card shows the invoice number, customer, issue date, event date, total, status, and a compact actions menu. Filters open in a mobile-friendly panel and active filters remain visible as removable chips.

### Actions

Issued invoices support View, Download PDF, Correct & Reissue, and Open Booking, subject to permissions. Cancelled invoices support View, Download Historical PDF, Open Replacement Invoice when present, and Open Booking.

Loading, empty, error, and no-search-result states follow existing banquet design and toaster standards.

## Frontend Architecture

Create the static page at `app/(app)/invoices/page.tsx` and keep it focused on URL state and orchestration. Extract reusable invoice workspace components for filters, summaries, table/cards, details, and actions.

Extend the authenticated API client and invoice types with paginated list, detail, and summary contracts. Reuse the current banquet invoice form and download behavior where practical. Correct & Reissue may load the source booking in the background because the existing backend correction workflow remains booking-scoped; the user does not need to locate or open that booking manually.

All asynchronous actions use unified loading states, normalized API errors, and toast notifications. Query updates are debounced for search and do not trigger unbounded request loops.

## Backend Architecture

Add restaurant-wide read endpoints under a dedicated `banquet-invoices` controller while retaining all existing `/orders/:bookingId/invoice` endpoints:

- `GET /banquet-invoices` for paginated filtered results;
- `GET /banquet-invoices/summary` for filtered aggregate totals;
- `GET /banquet-invoices/:invoiceId` for tenant-scoped detail;
- `GET /banquet-invoices/:invoiceId/download` for PDF download.

The list response contains invoice snapshot data and a compact booking reference sufficient for the UI. The invoice detail response exposes replacement-chain identifiers without exposing another tenant's records.

All queries derive `restaurantId` from the authenticated user. Client-provided tenant identifiers are not accepted. Object identifiers, dates, pagination, status, sort direction, and search length are strictly validated.

Search input is trimmed, length bounded, and safely escaped before matching. Exact invoice-number lookup is prioritized. Results have deterministic sorting by `issuedAt` and `_id`.

## Database and Migration

The current schema already indexes restaurant and invoice issue date. Add only indexes confirmed necessary by query explain plans, expected to include restaurant, status, issue date, and `_id` for stable filtered pagination.

Any index change is delivered through an idempotent migration that checks equivalent existing indexes by key and options rather than relying only on index names. No existing invoice data is rewritten.

## Audit and Security

Existing issue, download, cancel, and reissue audits remain authoritative. Restaurant-wide downloads use the same download audit action and metadata. List filtering and pagination do not create audit records to avoid audit-log noise.

The feature must preserve:

- tenant isolation on every list, detail, summary, and download query;
- existing RBAC and company-admin reissue restriction;
- immutable issued snapshots;
- transaction-backed cancel and reissue;
- unique active invoice and invoice-number constraints;
- private, no-store PDF responses.

## Error Handling

The UI presents API errors through the standard toaster. It handles stale results such as an invoice being reissued from another session by refreshing the list and displaying the server message.

The backend returns clear validation, forbidden, and not-found responses. A tenant receives Not Found rather than information about an invoice owned by another restaurant.

## Testing and Verification

Backend coverage includes:

- tenant isolation for list, detail, summary, and download;
- every filter and combined filters;
- inclusive date boundaries and invalid ranges;
- deterministic pagination without duplicates or omissions;
- cancelled totals excluded from financial summaries;
- permissions and banquet/business-type guards;
- correction and replacement-chain behavior;
- historical and active PDF download;
- search escaping and input bounds.

Frontend coverage includes:

- sidebar visibility by business type, billing flag, and permission;
- static route generation;
- query-string filter hydration and updates;
- desktop table and mobile cards;
- action visibility by status and permission;
- loading, empty, error, and stale-state handling;
- view, download, correction, replacement, and booking navigation flows;
- mobile, tablet, and desktop responsive checks without horizontal page overflow.

Final verification runs focused tests, full lint, production builds, backend regression tests, and static export validation before deployment.

## Rollout

Implement directly on synchronized `main` branches in the API and web repositories, with separate backend and frontend commits. Deploy the backend before the frontend. If an index migration is required after query validation, run the idempotent migration before enabling the frontend navigation entry.
