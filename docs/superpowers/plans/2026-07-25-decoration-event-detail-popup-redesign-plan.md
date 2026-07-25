# Decoration Event Detail Popup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved decoration-first Event Detail popup with compact spacing, prominent selected decorations, and aligned fixed actions on every supported viewport.

**Architecture:** Retain the existing modal state, API calls, permissions, child workflows, and document actions. Restructure only the presentation into a fixed header, scrolling two-column body, and fixed footer; extend the existing snapshot gallery with a detail-layout variant rather than duplicating snapshot behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, Next.js static export, Node test runner

## Global Constraints

- Do not change backend APIs, persisted data, migrations, permissions, or booking-state behavior.
- Do not change banquet components or routes.
- Preserve child-popup back navigation, PDF view/download, loading, and error behavior.
- Mobile is the primary viewport and must not horizontally scroll.
- Keep all interactive targets at least 44 pixels high or wide.
- Use existing slate, white, amber, emerald, and red platform colors.

---

### Task 1: Lock the approved popup layout with regression tests

**Files:**
- Create: `lib/decoration/event-detail-layout.test.mjs`
- Modify: `lib/decoration/customer-document-actions.test.mjs`

**Interfaces:**
- Consumes: source files `decoration-event-detail-modal.tsx` and `decoration-snapshot-gallery.tsx`
- Produces: regression requirements for header/body/footer separation, selected-decoration priority, two-column gallery layout, compact spacing, and equal action grids

- [x] **Step 1: Write the failing layout test**

Assert that the Event Detail source contains `Selected Decoration`, a dedicated header before the scroll body, Event & Venue before Selected Decoration before Advance Payments, a two-thirds/one-third desktop grid, compact card padding, and aligned responsive action grids. Assert the snapshot gallery supports a `detail` presentation and does not use `xl:grid-cols-3` in that presentation.

- [x] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test lib/decoration/event-detail-layout.test.mjs lib/decoration/customer-document-actions.test.mjs
```

Expected: the new layout test fails because the approved structure is not implemented.

- [x] **Step 3: Commit the failing regression test with the implementation task**

Do not commit while RED. Continue directly to Task 2 so the feature commit remains green.

---

### Task 2: Implement the compact decoration-first detail body

**Files:**
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-snapshot-gallery.tsx`

**Interfaces:**
- Consumes: `DecorationBooking`, `DecorationSnapshotLine[]`, existing `DecorationAdvanceLedger`, `DecorationStatusBadge`, and action callbacks
- Produces: `DecorationSnapshotGallery({ lines, printable?, internal?, detail? })` where `detail` enables the approved one/two-column popup layout

- [x] **Step 1: Build the fixed compact header**

Move booking number, customer name, event type, status, and close control into a header outside the scrolling body. Preserve dialog semantics, long-text wrapping, status rendering, and the 44-pixel close target.

- [x] **Step 2: Reorder and compact the detail content**

Render Event & Venue, Selected Decoration, Advance Payments, and General Notes in the main column. Render Customer, Payment Summary, Follow-ups, and Notes in the supporting column. Use a desktop `lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` layout and a single column below `lg`.

- [x] **Step 3: Add the payment summary**

Use `packageRate`, `totalCollected`, and `outstandingAmount` directly from the loaded booking. Format values consistently with the existing advance ledger and do not calculate replacement financial values.

- [x] **Step 4: Add the detail gallery presentation**

Add the optional `detail` prop. For detail mode, render `grid-cols-1 sm:grid-cols-2` only, retain 4:3 images, fallbacks, category groups, item count, descriptions, custom badges, and image preview behavior.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test lib/decoration/event-detail-layout.test.mjs lib/decoration/customer-document-actions.test.mjs lib/decoration/snapshot-view.test.mjs lib/decoration/detail-color-contrast.test.mjs
```

Expected: all focused tests pass.

---

### Task 3: Align the fixed action footer responsively

**Files:**
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `lib/decoration/event-detail-layout.test.mjs`

**Interfaces:**
- Consumes: unchanged result of `getDecorationDetailActions`
- Produces: equal-width mobile, tablet, and desktop action grids with unchanged callbacks and loading state

- [x] **Step 1: Add failing action-grid assertions**

Require a two-column mobile expanded grid, two columns at `sm`, three at the intermediate breakpoint, four at `lg`, full-width mobile toggle, safe-area padding, and no horizontal overflow utilities.

- [x] **Step 2: Run the layout test and verify RED**

Run:

```bash
node --test lib/decoration/event-detail-layout.test.mjs
```

Expected: failure until the exact responsive grid is present.

- [x] **Step 3: Implement aligned action grids**

Keep the existing button generator and action order. Apply consistent width and minimum height to every action, preserve the mobile expand/collapse interaction, and keep document errors immediately above the buttons.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test lib/decoration/event-detail-layout.test.mjs lib/decoration/customer-document-actions.test.mjs lib/decoration/event-detail-view.test.mjs
```

Expected: all focused tests pass.

---

### Task 4: Complete production verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-25-decoration-event-detail-popup-redesign-plan.md`

**Interfaces:**
- Consumes: completed production implementation
- Produces: verified static frontend with a completed checklist

- [x] **Step 1: Run the complete decoration regression suite**

```bash
node --import tsx --test --test-reporter=dot lib/decoration/*.test.mjs lib/decoration/inventory-gallery-integration.behavior.test.tsx
```

Expected: exit code `0`.

- [x] **Step 2: Run type checking, lint, and audit**

```bash
npx tsc --noEmit
npm run lint
npm audit --audit-level=moderate
```

Expected: type checking and audit pass; lint has zero errors and may retain only the existing unrelated ODC reports warning.

Verification note: on 25 July 2026, `npm audit` reported a newly published
transitive `brace-expansion` advisory. npm offers only a forced breaking ESLint
upgrade for the full dependency chain, so dependency remediation is intentionally
kept outside this popup-only change.

- [x] **Step 3: Run the static production build**

```bash
npm run build
```

Expected: all routes are generated as static content.

- [x] **Step 4: Complete checklist and commit**

```bash
git add components/decoration/decoration-event-detail-modal.tsx components/decoration/decoration-snapshot-gallery.tsx lib/decoration/event-detail-layout.test.mjs lib/decoration/customer-document-actions.test.mjs docs/superpowers/plans/2026-07-25-decoration-event-detail-popup-redesign-plan.md
git commit -m "feat(decoration): redesign event detail popup"
```
