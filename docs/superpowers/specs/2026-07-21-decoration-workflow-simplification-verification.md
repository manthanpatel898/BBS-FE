# Event Decoration Workflow Simplification Verification

Verified on 21 July 2026 on `main`.

## Automated verification

- Frontend regression suite: 240 tests passed, 0 failed.
- Backend decoration and employee specs: all selected specs passed using the repository's `ts-node` runtime.
- Backend lint: 0 errors; one pre-existing unused-import warning remains in `restaurants.service.ts`.
- Frontend lint: 0 errors; one pre-existing unused-disable warning remains in `odc/reports/page.tsx`.
- Backend Nest production build: passed.
- Frontend Next production build/static export: passed; all 46 routes generated as static routes.
- `git diff --check`: passed in both repositories.

## Requirement checks

- New decoration bookings use one Event Date while `endDate` remains an internal compatibility field.
- Inquiry package price is optional and becomes final during decoration selection.
- Final price, reservations, snapshot, and booking status use the same Mongo transaction.
- Dashboard keeps the compact upcoming card, removes the approved large sections, and adds the mobile Calendar shortcut.
- Follow-ups show future/today inquiries only and use the banquet-style date-card and left-sidebar flow.
- Event Detail exposes View and Download, conditionally exposes native Share, and does not expose Print.
- Customer documents and decoration report exports show Event Date rather than Start/End Date.
- Event-company users are normalized server-side to Company Admin with ODC disabled and no custom permissions.
- Event-company employee Signature and Permissions endpoints and UI controls are disabled.
- Banquet route guards, simple/advanced cancellation policy tests, booking patch tests, and navigation-stack tests remain green.

## Responsive/static safeguards

- Mobile responsive audit tests cover decoration screens and modal action accessibility.
- Follow-up date cards wrap within the viewport and the day detail opens as a full-width mobile sidebar.
- Event Detail retains a fixed viewport shell, scrollable content region, and reachable bottom action bar.
- All navigation added by this change uses static routes with query-string state; no dynamic ID route was introduced.

## Database changes

No new migration is required for this compatibility release. Existing `endDate` data and indexes remain valid; new writes normalize it to Event Date internally.
