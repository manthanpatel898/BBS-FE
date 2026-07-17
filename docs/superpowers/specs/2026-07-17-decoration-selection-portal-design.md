# Decoration Event Detail Child Portal Design

## Problem

The Event Detail child modals are rendered inside the Event Detail overlay. The parent overlay uses backdrop filtering and scrolling, which creates a containing block for fixed descendants. As a result, Edit Inquiry, Confirm Booking, Add Advance, Add Follow-up, and Choose/Edit Decoration are positioned and scrolled relative to Event Detail instead of the browser viewport. Headers can move off-screen, footers can overlap parent actions, and the underlying Event Detail remains visually interactive.

## Approved approach

Render every Event Detail child modal through the shared React portal attached to `document.body`:

- `DecorationInquiryForm`
- `DecorationConfirmationModal`
- `DecorationPaymentModal`
- `DecorationFollowupModal`
- `DecorationSelectionModal`

- Event Detail remains mounted underneath so its booking and navigation state are preserved.
- The active child overlay owns the full viewport and uses a higher stacking level than Event Detail.
- Closing a child returns to Event Detail; closing Event Detail still returns to the selected-date sidebar.
- Long child forms keep their content within a viewport-bounded scrolling panel.
- Desktop uses a centered, bounded panel. Mobile uses a near-full-screen bottom sheet with safe-area padding.
- Background document scrolling is locked while the chooser is open and restored exactly when it closes.

## Component boundaries

Each child modal remains responsible for its existing form state, validation, dirty-close behavior, API request, and saving state. The reusable client-only portal wrapper owns hydration-safe mounting into `document.body`. A shared child-modal hook owns document scroll locking and Escape handling without bypassing busy-state or unsaved-change safeguards. Viewport layout belongs to each modal shell, not Event Detail.

No API, database, booking, availability, or migration changes are required.

## Interaction and accessibility

- Each overlay remains a modal dialog with an accessible title.
- Escape, backdrop, and close controls close only the active child and respect saving, uploading, or dirty-form safeguards.
- The decoration chooser header and footer stay visible while catalog cards scroll.
- Touch targets, horizontal category scrolling, safe-area spacing, and single-column mobile cards are preserved.
- The parent Event Detail is visually obscured and cannot receive pointer interaction while selection is open.

## Failure handling

Existing loading, upload, validation, availability, dirty-close, and save errors remain inside their respective child modal. Failed requests retain entered form data or selected choices. Portal mounting waits until the browser document is available, preventing static-render hydration mismatches.

## Verification

- Unit regression tests prove every Event Detail child uses the body portal and a viewport-owned shell.
- Overlay-state tests continue to prove close behavior returns one level at a time.
- Decoration frontend regression suite, TypeScript, lint, and production static build must pass.
- Manual viewport checks cover desktop, tablet, and mobile dimensions, including long lists and background scroll isolation.
