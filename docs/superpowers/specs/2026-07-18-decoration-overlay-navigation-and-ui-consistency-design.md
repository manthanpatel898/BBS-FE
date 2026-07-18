# Decoration Overlay Navigation and UI Consistency Design

## Goal

Make the decoration booking workflow behave like the banquet workflow: booking details remain an overlay above the selected-date sidebar, child workflows return one layer at a time, customer-document actions have reliable loading and download behavior, and all text remains readable across mobile, tablet, and desktop.

## Canonical Navigation

`/decoration/events` is the only booking-detail workspace. Overlay state is represented with static-deployment-compatible query parameters:

```text
/decoration/events?date=2026-07-18&bookingId=<booking-id>
```

- `date` opens the selected-date sidebar.
- `date` plus `bookingId` opens Event Detail above that sidebar.
- Closing Event Detail removes only `bookingId` and reveals the sidebar.
- Closing the sidebar removes `date` and reveals the calendar.
- Dashboard and Follow-up booking links use this canonical URL.
- Browser refresh and Back/Forward restore the same overlay hierarchy.
- The standalone `/decoration/event-detail` page is removed. No application link may target it.

## Customer Document Navigation

View and Print remain static query-string routes under `/decoration/print`. Each action includes the booking ID and a canonical return date. Back navigates to:

```text
/decoration/events?date=<event-start-date>&bookingId=<booking-id>
```

This restores Event Detail above the selected-date sidebar. Download remains inside Event Detail and does not navigate.

## Unified Action State

View, Download, and Print use one visible action-state presentation:

- the active button is disabled;
- a high-contrast spinner and `Opening…`, `Downloading…`, or `Preparing print…` label are shown;
- duplicate document actions are blocked until the active action finishes or navigation unmounts the detail;
- failures appear in the sticky action region using readable red-on-red styling;
- other booking mutations remain unavailable only when their own workflow is active.

The download helper invokes the injected/native fetch function without binding it as a method receiver, preventing the browser `Illegal invocation` error. Existing authentication, session invalidation, PDF validation, abort, filename, and object-URL cleanup behavior remains unchanged.

## Sticky Responsive Action Bar

Event Detail follows the banquet action-bar pattern:

- the bar is `sticky` at the bottom of the Event Detail scrolling surface;
- it uses a white translucent background, top border, shadow, backdrop blur, and safe-area bottom padding;
- mobile shows a full-width `Actions` toggle and a two-column expandable action grid;
- tablet and desktop show the action grid directly with responsive columns;
- the bar remains visible while scrolling Event Detail and never sits behind child modals;
- child modals keep their existing higher stacking order.

## Color Consistency

Decoration UI must not depend on inherited foreground colors. Explicit platform-standard colors are applied to:

- advance summary cards, ledger cards, table cells, and empty state;
- Add Advance and confirmation inputs, selects, textareas, labels, help text, errors, and buttons;
- follow-up fields and modal content;
- decoration snapshot headings, item names, quantities, descriptions, custom badges, image fallbacks, preview header, and preview description;
- document action loaders and errors.

Inputs use white backgrounds with slate-900 text; primary body content uses slate-700/900; supporting text uses slate-500/600; errors use red-700 on red-50; success amounts use emerald-700.

## Sidebar Cleanup

The decoration sidebar no longer displays `Decoration Catalog` or `Import Data`. Their direct pages, permission mappings, APIs, and Settings-based decoration configuration remain unchanged, as defined in `2026-07-18-decoration-sidebar-cleanup-design.md`.

## Testing

Automated regressions cover:

- query hydration and synchronization for calendar → sidebar → detail → child hierarchy;
- close behavior one layer at a time and browser query restoration;
- Dashboard and Follow-up canonical links;
- absence of the standalone Event Detail route and stale links;
- View/Print return URLs;
- unbound native fetch invocation and the existing binary-download contract;
- unified loading, duplicate blocking, failure, abort, and unmount behavior;
- sticky mobile/tablet/desktop action-bar structure;
- explicit color contracts for advances, follow-ups, snapshots, and loaders;
- sidebar link removal with direct-route permissions retained.

Run all decoration tests, TypeScript, full lint, static production build, and `git diff --check`.

## Migration and Deployment

No backend, API, database, or migration change is required. The frontend remains fully statically generated and uses query parameters rather than dynamic route segments.
