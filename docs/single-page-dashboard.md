# Single-page company dashboard

The company-admin dashboard has an opt-in **Current / New dashboard** switch. Current remains the default. The new view is one scrolling page in the platform's gold, navy and white theme, with reduced-motion-aware decorative depth. Employee and super-admin dashboards are unchanged.

## Data and access

- Both views use the same existing authenticated dashboard requests and handlers. No sample data, new API routes, migrations or dependencies.
- Booking value is shown separately from advance received. Monthly actual/estimated/effective values remain in the existing monthly sales component.
- All existing company metrics, subscription notices, payment breakdowns, cancelled advances, inquiry activity, category performance, peak month, yearly comparisons, sales, menu trends and permission-gated feedback remain available.
- The new view additionally displays existing API fields for initial selection duration, category-change duration, month comparison and best-selling menu items.
- Recent-activity modals, follow-up/completed/closed record panels, year/month controls, monthly-sales report links and feedback access checks retain their existing handlers.
- Superseded requests cannot overwrite the current year/account selection. Failed stats requests clear old values instead of retaining stale figures.
- Missing report data is labelled unavailable, not replaced by fabricated values.

## Preference

Only `current` or `new` is stored in browser localStorage under a versioned key scoped by user ID and restaurant ID. This is a display preference, not an access permission. Storage failures are tolerated. A new user/restaurant defaults to Current; switching does not refetch business data.

## Verification and rollout

Automated checks cover supplied amounts, zero/missing reports, preference isolation, blocked storage, switching accounts, and each record card's action. Existing analytics tests and production build also run. No push or deployment is performed automatically.

Before production rollout, inspect with a signed-in company account at phone, tablet and desktop widths: switch both views; compare amounts under the same year; change inquiry month; open all record cards and a monthly sales report; check subscription and feedback permissions; check keyboard focus and reduced motion. Browser automation could not connect in this environment, so visual acceptance remains manual.
