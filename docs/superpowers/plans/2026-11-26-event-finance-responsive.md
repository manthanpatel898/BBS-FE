# Event Finance Responsive Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; execute inline.

Goal: implement approved responsive account design, improve shared expense screens, and deploy frontend main.
Spec: docs/superpowers/specs/2026-11-26-event-finance-responsive-design.md
Architecture: scoped CSS with container queries; shared ledger and metric primitives; existing API/auth/export preserved.

- [x] Add behavior coverage for semantic expense cards, selected-event context and shared field styling.
- [x] Implement finance.css, shared ledger primitives, account layout and responsive event picker; apply finance surface to report/settings/event ledger.
- [x] Run DOM/domain/route tests, lint and production build. Render actual app with intercepted sample-data APIs at five widths; check overflow, computed contrast styles and touch targets.
- [ ] Review changes, commit feature, fast-forward current main, push and monitor production deployment.

Verification: 18 focused frontend tests passed. Scoped and full lint passed with one existing dashboard navigation warning; TypeScript and webpack static export passed. Browser checks passed at five account widths, four report widths and narrow-phone long-content cases for account/report/settings. Downloaded Excel parsed successfully with 18 rows and commission history. Independent code review found no important regressions. The long report identifier clipping found by descendant-bound checks was corrected and reverified.
