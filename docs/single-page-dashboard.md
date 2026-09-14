# Single-page company dashboard

The company-admin dashboard has an opt-in **Current / New dashboard** switch. Current remains the default. The new view is one scrolling page in the platform's gold, navy and white theme, with reduced-motion-aware decorative depth. Employee and super-admin dashboards are unchanged.

## Data and access

- Both views use the same existing authenticated dashboard requests and handlers. No sample data, new API routes, migrations or dependencies.
- Booking value is shown separately from advance received. The new collections view shows payment-method proportions and exact amounts; advance settlement retains held, returned, reused and forfeited amounts, with expandable payment-method details.
- The new sales view separates actual and estimated monthly bars, includes exact figures, effective totals, peak month and year/month comparisons. Month buttons keep the existing report navigation.
- Subscription notices, inquiry activity, category performance and permission-gated feedback remain available. Menu performance, menu selection timing and Menu Category Trends are removed from New only; Current remains unchanged.
- Recent-activity modals, follow-up/completed/closed record panels, year/month controls, monthly-sales report links and feedback access checks retain their existing handlers.
- Superseded requests cannot overwrite the current year/account selection. Failed stats requests clear old values instead of retaining stale figures.
- Missing report data is labelled unavailable, not replaced by fabricated values.

## Preference

Only `current` or `new` is stored in browser localStorage under a versioned key scoped by user ID and restaurant ID. This is a display preference, not an access permission. Storage failures are tolerated. A new user/restaurant defaults to Current; switching does not refetch business data.

## Verification and rollout

The banquet route allowlist includes `/invoices`, fixing the business-route redirect to dashboard. Existing invoice permissions and billing-enabled checks remain in place; decoration accounts cannot access this banquet route.

Automated checks cover supplied amounts, zero/missing reports, preference isolation, blocked storage, switching accounts, and each record card's action. Existing analytics tests and production build also run. No push or deployment is performed automatically.

Before production rollout, inspect with a signed-in company account at phone, tablet and desktop widths: switch both views; compare amounts under the same year; change inquiry month; open all record cards and a monthly sales report; check subscription and feedback permissions; check keyboard focus and reduced motion. Browser automation could not connect in this environment, so visual acceptance remains manual.
