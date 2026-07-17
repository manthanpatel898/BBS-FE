# Decoration Selection Portal Design

## Problem

The decoration selection modal is rendered inside the Event Detail overlay. The parent overlay uses backdrop filtering and scrolling, which creates a containing block for fixed descendants. As a result, the selection modal is positioned and scrolled relative to Event Detail instead of the browser viewport. Its header can move off-screen, its footer overlaps the parent actions, and the underlying Event Detail remains visually interactive.

## Approved approach

Render `DecorationSelectionModal` through a React portal attached to `document.body`.

- Event Detail remains mounted underneath so its booking and navigation state are preserved.
- The selection overlay owns the full viewport and uses a higher stacking level than Event Detail.
- Closing selection returns to Event Detail; closing Event Detail still returns to the selected-date sidebar.
- The chooser keeps one internal scrolling region between a fixed header and footer.
- Desktop uses a centered, bounded panel. Mobile uses a near-full-screen bottom sheet with safe-area padding.
- Background document scrolling is locked while the chooser is open and restored exactly when it closes.

## Component boundaries

`DecorationSelectionModal` remains responsible for catalog loading, choice state, custom items, validation, and saving. A small reusable client-only portal wrapper owns hydration-safe mounting into `document.body`. Viewport layout and scroll locking belong to the modal shell, not Event Detail.

No API, database, booking, availability, or migration changes are required.

## Interaction and accessibility

- The overlay remains a modal dialog with an accessible title.
- Escape and the close button close the chooser only when no save or upload is active.
- Backdrop click closes only the chooser.
- Header and footer stay visible while catalog cards scroll.
- Touch targets, horizontal category scrolling, safe-area spacing, and single-column mobile cards are preserved.
- The parent Event Detail is visually obscured and cannot receive pointer interaction while selection is open.

## Failure handling

Existing loading, upload, validation, availability, and save errors remain inside the chooser. A failed save retains all selected choices. Portal mounting waits until the browser document is available, preventing static-render hydration mismatches.

## Verification

- Unit regression test proves the chooser uses the body portal and viewport-owned shell.
- Overlay-state tests continue to prove close behavior returns one level at a time.
- Decoration frontend regression suite, TypeScript, lint, and production static build must pass.
- Manual viewport checks cover desktop, tablet, and mobile dimensions, including long lists and background scroll isolation.
