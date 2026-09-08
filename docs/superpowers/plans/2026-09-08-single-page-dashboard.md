# Single-page dashboard implementation plan

**Goal:** Implement the approved gold/navy/white single-page dashboard with real existing API data and an opt-in Current/New switch.

**Architecture:** Keep the existing page's fetching, role checks, modal handlers and current dashboard. A separate presentation component consumes the same stats and reports, with slots for existing advance and comparison components. A keyed preference control stores only the presentation choice per user and restaurant; storage failure must not prevent switching.

**Stack:** Existing Next.js, React, TypeScript and a dashboard-scoped stylesheet. No new dependencies or backend changes.

**Design:** User-approved single-page prototype, 8 September 2026. Preserve all current dashboard information and actions. Do not copy sample data. Keep the employee and super-admin dashboards unchanged.

- [x] Add regression tests for rendering supplied real values, missing/zero data, and account-isolated view preference with storage failures.
- [x] Build `components/dashboard/single-page-dashboard.tsx` and scoped CSS: compact statistics, booking value, collections, activity, comparisons, monthly sales, category/menu trends, timings and subscription. Reuse existing report components and handlers.
- [x] Integrate opt-in preference into company dashboard only. Preserve subscription notices and record modals in the existing parent. Keep feedback's existing permission check.
- [x] Run dashboard tests, lint, typecheck and production build. Inspect diff for sample values, missing metrics and changed business calculations. Production build (including its TypeScript stage), lint and focused tests pass. Standalone typecheck reported pre-existing feedback test errors. Browser connection failed during setup; signed-in responsive visual acceptance remains manual.
- [x] Document rollout: no migration, Current default, scoped browser preference, manual responsive checks, no automatic push/deployment.
