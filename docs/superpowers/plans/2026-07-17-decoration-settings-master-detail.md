# Decoration Settings Master-Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bulky decoration/location settings with clean parent-first master-detail screens and make all Choose Decoration form text readable.

**Architecture:** Add pure view helpers for selected-parent reconciliation, scoped child records, image previews, and display terminology. Keep existing API calls and CRUD modals, but reorganize catalog and location components into mutually exclusive master and detail levels.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node test runner.

## Global Constraints

- Keep stored `HOTEL` and `VENUE` values, DTO fields, API routes, and database records unchanged.
- Display `HOTEL` as `Banquet` and `VENUE` as `Outdoor Venue`.
- Keep routes query-string based and compatible with static deployment.
- Preserve every existing CRUD, image, activation, permission, loading, retry, and error behavior.
- Use explicit high-contrast text/background classes and mobile touch-friendly controls.

---

### Task 1: Master-detail view helpers and terminology

**Files:**
- Modify: `lib/decoration/settings-view.ts`
- Modify: `lib/decoration/settings-view.test.mjs`

**Interfaces:**
- Produces: `reconcileSelectedParentId<T extends { id: string }>(selectedId: string, parents: T[]): string`
- Produces: `childrenForParent<T extends { categoryId: string }>(items: T[], parentId: string): T[]`
- Produces: `decorationPreviewImages(items, limit?): string[]`
- Produces: `decorationLocationTypeLabel(type: 'HOTEL' | 'VENUE'): 'Banquet' | 'Outdoor Venue'`

- [ ] Write failing tests for selection retention/fallback, scoped children, unique preview images, and both location labels.
- [ ] Run `node --test lib/decoration/settings-view.test.mjs` and confirm failures for missing exports.
- [ ] Implement the four pure helpers without mutating input arrays.
- [ ] Rerun the test and confirm GREEN.

---

### Task 2: Choose Decoration input contrast

**Files:**
- Modify: `components/decoration/decoration-selection-item-card.tsx`
- Modify: `components/decoration/decoration-custom-item-editor.tsx`
- Create: `lib/decoration/selection-input-contrast.test.mjs`

- [ ] Write a source regression asserting both chooser components explicitly include `bg-white`, `text-slate-950`, `placeholder:text-slate-400`, and readable disabled text on their form controls.
- [ ] Run the focused test and confirm RED.
- [ ] Add a shared local control class in each component and apply it to all inputs, selects, and textareas.
- [ ] Run the focused test and TypeScript; confirm GREEN.
- [ ] Commit with `fix(decoration): improve selection input contrast`.

---

### Task 3: Decoration type master and item detail

**Files:**
- Modify: `components/decoration/settings/decoration-catalog-section.tsx`
- Create: `lib/decoration/catalog-master-detail.test.mjs`

- [ ] Write structural tests asserting a master type heading, Open Type action, Back to Decoration Types action, selected-type-only item rendering, scoped Add Item, and accessible carousel previous/next controls.
- [ ] Run the test and confirm RED.
- [ ] Replace the combined chips/items/categories layout with `selectedTypeId` master/detail state. The master renders responsive type cards with counts/status/image previews. The detail renders only selected items and existing item/image actions.
- [ ] Ensure refresh uses `reconcileSelectedParentId`; new items always receive the selected type ID; Add Item is absent on the master.
- [ ] Add per-card carousel indices keyed by type ID, clamp indices after reload, and use buttons labelled `Previous item image` and `Next item image`.
- [ ] Run focused tests, settings tests, and TypeScript; confirm GREEN.
- [ ] Commit with `refactor(decoration): add catalog master detail settings`.

---

### Task 4: Location master and hall detail with new terminology

**Files:**
- Modify: `components/decoration/settings/locations-section.tsx`
- Modify: `components/decoration/settings/decoration-settings.tsx`
- Modify: `components/decoration/decoration-inquiry-form.tsx`
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-day-sidebar.tsx`
- Create: `lib/decoration/location-master-detail.test.mjs`

- [ ] Write structural tests asserting Banquet/Outdoor Venue terminology, Open Location, Back to Locations, and hall rendering only within a selected location detail.
- [ ] Run the test and confirm RED.
- [ ] Add `selectedLocationId` master/detail state. Render location cards without halls on the master; render only the selected location's halls and Add Hall inside detail.
- [ ] Preserve existing location/hall modals, CRUD calls, activation states, search, inactive filter, and selected-parent fallback.
- [ ] Replace user-facing Hotel/Venue strings across Settings, inquiry form, sidebar, and Event Detail while retaining enum values and API field names.
- [ ] Run focused tests, inquiry/settings tests, and TypeScript; confirm GREEN.
- [ ] Commit with `refactor(decoration): add location master detail settings`.

---

### Task 5: Full verification

**Files:** No production changes unless verification finds a regression.

- [ ] Run `node --test lib/decoration/*.test.mjs` and require zero failures.
- [ ] Run `npx tsc --noEmit` and require exit 0.
- [ ] Run `npm run lint` and require no new errors.
- [ ] Run `npm run build` and require all static routes to generate.
- [ ] Confirm `git diff --check` and restore generated `next-env.d.ts` if changed.
- [ ] Verify phone/tablet/desktop master-detail navigation, carousel controls, scoped CRUD, location labels, and chooser text contrast when an in-app browser is available.
