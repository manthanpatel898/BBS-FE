# Event company expenses and account statements

For EVENT_DECORATION companies only:

- Settings → Expense Types: create names with Amount (₹) or Percentage (%); rename, activate or deactivate types. Deactivation preserves history.
- Events → event details → Paid Expenses: add or edit actual paid expenses, date, payment mode and remark. Percentage calculations require a finalized price and retain their recorded price basis. Select "Use current finalized event price for this edit" only when intentionally recalculating an existing expense.
- Reports → Expense Report: paid-date, event, type and mode filters, paginated history, full-filter daily/event totals and Excel export.
- Reports → Event Account Statement: one event's price, customer payments, customer balance, expense history, recorded margin and received-minus-expenses, plus Excel export. Unfinalized price-based totals remain unavailable.

Expenses are internal and separate from customer advances and existing customer PDF/print flows. Only paid expenses are supported. Report export requires `decoration.reports.export` plus the relevant view permission. Excel exports are limited to 10,000 matching expense entries; narrow filters for larger reports. Account exports include all entries for the selected event.

Employee permissions: `decoration.expenses.view`, `decoration.expenses.manage`, `decoration.expense_types.manage`, `decoration.accounts.view`. Company admins receive these through the backend registry. Manage permission also allows reading the event ledger needed for editing; cross-event reporting requires view permission separately. An employee's refreshed profile/session must include newly granted permissions.

Run the backend collection/index preparation command before rollout:

```sh
npm --prefix ../BBS-BE run migrate:decoration-expenses
```

Use the intended backend environment and a MongoDB replica set/sharded cluster. See [backend operational documentation](../../BBS-BE/docs/event-expenses.md) for API and deployment details. New client calls use the existing `NEXT_PUBLIC_API_URL` and Bearer authentication. Deploy backend before frontend.

Verification: focused DOM tests cover add/edit percentage expense, manage-only and view-only access, account balance separation, export visibility and deactivation. Domain and business-route tests cover calculation previews, query filters and business isolation. Production static export can be verified with `npx next build --webpack`; this environment blocks the local port used by Turbopack's CSS workers.


## Responsive financial interface

The account statement uses the approved compact light design. Event search, selection, identity and export share one panel. The metric grid adapts to available content width (including the sidebar): two columns on phones, three on tablets, and six only at 1160px of content width. Payment/expense ledgers sit side by side above 1000px of content width and stack below that. Shared expense history uses readable ledger cards without a wide scrolling table.

Scoped finance fields explicitly override the app's dark gradients, white placeholder text, shadow and date-picker tint. Phone inputs use 16px text and controls retain 44px touch targets. Type names, booking identifiers, remarks and amounts wrap within their containers, including report aggregates and settings rows. APIs, permissions, calculations and export data are unchanged.

Verified against the built static app using intercepted synthetic APIs: account screen at 320/390/820/1024/1440px, expense report at 320/390/820/1440px, long unbroken names/identifiers/remarks and large amounts at 320px, and settings type-name wrapping. Checked computed field contrast, no dark field shadow, metric column counts, page/descendant overflow and a downloaded Excel workbook. No production customer data was used.
