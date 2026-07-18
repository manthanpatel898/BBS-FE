# Decoration Overlay Navigation and UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone decoration Event Detail route with a query-restored overlay workflow, fix PDF download invocation, and align document actions, sticky behavior, colors, and sidebar navigation with the banquet experience.

**Architecture:** The Events workspace owns canonical `date` and `bookingId` query state and renders the sidebar/detail overlay stack. Customer-document actions share a local single-flight state machine, while reusable presentation classes make the sticky bar and decoration content explicit and readable without changing APIs.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Node test runner, React Testing Library/JSDOM.

## Global Constraints

- Use query parameters only; do not add dynamic frontend route segments.
- Keep decoration pages, permissions, APIs, backend data, and banquet behavior unchanged unless explicitly listed.
- Remove the standalone `/decoration/event-detail` page and every application link to it.
- Keep `/decoration/catalog` and `/decoration/import` direct routes and permission mappings.
- No database migration or backend change is required.

---

### Task 1: Canonical query-driven overlay navigation

**Files:**
- Modify: `components/decoration/decoration-workspace.tsx`
- Modify: `components/decoration/decoration-dashboard.tsx`
- Modify: `app/(app)/decoration/print/page.tsx`
- Modify: `app/(app)/decoration/selection/page.tsx`
- Modify: `lib/auth/business-routes.ts`
- Delete: `app/(app)/decoration/event-detail/page.tsx`
- Create: `lib/decoration/overlay-query.ts`
- Create: `lib/decoration/overlay-query.test.mjs`
- Modify: `lib/decoration/customer-document-layout.test.mjs`
- Modify: `lib/decoration/customer-document-actions.test.mjs`

**Interfaces:**
- Produces: `readDecorationOverlayQuery(searchParams): { date: string | null; bookingId: string | null }`.
- Produces: `decorationEventsUrl(state): string` for `/decoration/events` query URLs.
- Consumes: `decorationOverlayReducer` and existing `DecorationWorkspace` overlay components.

- [ ] **Step 1: Write failing query and route regressions**

Test query parsing, URL creation, invalid booking-without-date normalization, Dashboard/Follow-up canonical URLs, print Back URL, and absence of the standalone route/application links.

```js
assert.equal(decorationEventsUrl({ date: '2026-07-18', bookingId: 'booking/a' }), '/decoration/events?date=2026-07-18&bookingId=booking%2Fa');
assert.deepEqual(readDecorationOverlayQuery(new URLSearchParams('date=2026-07-18&bookingId=b1')), { date: '2026-07-18', bookingId: 'b1' });
```

- [ ] **Step 2: Run RED**

Run: `node --test lib/decoration/overlay-query.test.mjs lib/decoration/customer-document-layout.test.mjs lib/decoration/customer-document-actions.test.mjs`

Expected: FAIL because the helper is missing and stale Event Detail links remain.

- [ ] **Step 3: Implement query synchronization**

Use `useSearchParams`, `useRouter`, and `usePathname` in `DecorationWorkspace`. Hydrate the reducer from `date` and `bookingId`, update the URL with `router.replace` when opening/closing layers, and prevent feedback loops by comparing the current canonical query before replacing it.

- [ ] **Step 4: Replace links and remove the route**

Dashboard and Follow-up booking links in `components/decoration/decoration-dashboard.tsx` target `decorationEventsUrl`. View/Print include `returnDate`; Print Back and the legacy standalone Selection page close/save paths target `decorationEventsUrl({ date, bookingId })`. Remove the `/decoration/event-detail` permission entry, delete `app/(app)/decoration/event-detail/page.tsx`, and verify `rg "['\"]\/decoration\/event-detail" app components lib` returns no production match.

- [ ] **Step 5: Verify and commit**

Run focused tests, `npx tsc --noEmit`, and `npm run build`. Commit:

```bash
git add components/decoration app/'(app)'/decoration lib/decoration
git commit -m "fix(decoration): restore event overlay navigation"
```

---

### Task 2: Fix download invocation and unify document-action loading

**Files:**
- Modify: `lib/decoration/customer-document-download.ts`
- Modify: `lib/decoration/customer-document-download.test.mjs`
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `lib/decoration/booking-download-lifecycle.ts`
- Modify: `lib/decoration/booking-download-lifecycle.test.mjs`
- Modify: `lib/decoration/customer-document-actions.test.mjs`
- Create: `lib/decoration/document-action-lifecycle.ts`
- Create: `lib/decoration/document-action-lifecycle.test.mjs`

**Interfaces:**
- Preserves: `requestDecorationCustomerPdf(options): Promise<DownloadedPdf>`.
- Produces: a single-flight document-action controller for `view | download | print` with busy label, error, abort, and navigation callbacks.

- [ ] **Step 1: Write the failing illegal-invocation regression**

Use a receiver-sensitive fetch double that throws when called with a non-undefined receiver. Assert `requestDecorationCustomerPdf` invokes the function as an unbound local callable.

```js
function receiverSensitiveFetch() {
  assert.equal(this, undefined);
  return Promise.resolve(pdfResponse);
}
```

- [ ] **Step 2: Write failing unified-action behavioral tests**

Render Event Detail actions and assert View/Print show a visible high-contrast busy label before navigation, Download shows the same loader style, duplicate actions are blocked, errors are readable, and unmount aborts active work.

- [ ] **Step 3: Run RED**

Run: `node --test lib/decoration/customer-document-download.test.mjs lib/decoration/document-action-lifecycle.test.mjs lib/decoration/customer-document-actions.test.mjs`

Expected: the receiver test fails with the current method-style call, and unified lifecycle tests fail because View/Print are plain links.

- [ ] **Step 4: Implement the minimal fixes**

Copy `options.fetchImpl` into a local constant before invocation. Replace View/Print links with buttons that call `router.push` using static query URLs through one single-flight controller. Keep Download binary behavior and session/error handling unchanged.

- [ ] **Step 5: Verify and commit**

Run focused tests, all decoration tests, TypeScript, lint, and build. Commit:

```bash
git add lib/decoration components/decoration
git commit -m "fix(decoration): unify customer document actions"
```

---

### Task 3: Match banquet sticky actions and normalize decoration colors

**Files:**
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-payment-modal.tsx`
- Modify: `components/decoration/decoration-confirmation-modal.tsx`
- Modify: `components/decoration/decoration-followup-modal.tsx`
- Modify: `components/decoration/decoration-advance-ledger.tsx`
- Modify: `components/decoration/decoration-snapshot-gallery.tsx`
- Create: `lib/decoration/event-detail-presentation.test.mjs`
- Create: `lib/decoration/event-detail-actions.behavior.test.tsx`

**Interfaces:**
- Produces: sticky action bar with a mobile `Actions` toggle and direct tablet/desktop grid.
- Preserves: existing action permissions and callbacks.

- [ ] **Step 1: Write failing presentation and interaction tests**

Assert sticky positioning, safe-area padding, mobile collapsed/expanded behavior, tablet/desktop grid, and explicit slate/red/emerald foreground/background classes for advance, follow-up, snapshot, input, loader, and error elements.

- [ ] **Step 2: Run RED**

Run: `node --test lib/decoration/event-detail-presentation.test.mjs` and the React behavior wrapper for `event-detail-actions.behavior.test.tsx`.

Expected: FAIL because the current bar is fixed/absolute, has no mobile toggle, and some components rely on inherited colors.

- [ ] **Step 3: Implement banquet-aligned actions**

Follow the existing booking-detail pattern: sticky translucent bar, mobile expandable two-column grid, desktop responsive grid, safe-area bottom padding, readable active/error states, and no action permission changes.

- [ ] **Step 4: Add explicit color contracts**

Use white input/card backgrounds and explicit slate-900/700/600/500 text, red-700 errors/pending values, and emerald-700 received values throughout the listed decoration components.

- [ ] **Step 5: Verify and commit**

Run focused tests, all decoration tests, TypeScript, lint, and static build. Commit:

```bash
git add components/decoration lib/decoration
git commit -m "fix(decoration): align event detail presentation"
```

---

### Task 4: Remove sidebar entries and run final regression

**Files:**
- Modify: `components/layouts/app-layout.tsx`
- Create: `lib/decoration/sidebar-navigation.test.mjs`
- Modify: this plan to mark only evidence-backed checkboxes complete.

**Interfaces:**
- Removes only the sidebar entries for `/decoration/catalog` and `/decoration/import`.
- Preserves their route-permission mappings and direct pages.

- [ ] **Step 1: Write and verify the failing sidebar regression**

Assert the event-decoration navigation block omits both links while `lib/auth/business-routes.ts` retains both permission mappings. Run it and confirm RED.

- [ ] **Step 2: Remove the sidebar entries**

Delete `canViewCatalog`, `canImport`, and their conditional navigation entries only.

- [ ] **Step 3: Run the complete regression**

```bash
node --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
rg "['\"]\/decoration\/event-detail" app components lib
```

Expected: tests, typecheck, lint, build, and diff check succeed; static build contains `/decoration/events` and `/decoration/print` but not `/decoration/event-detail`; the final `rg` has no production matches.

- [ ] **Step 4: Commit**

```bash
git add components/layouts/app-layout.tsx lib/decoration/sidebar-navigation.test.mjs docs/superpowers/plans/2026-07-18-decoration-overlay-navigation-and-ui-consistency.md
git commit -m "fix(decoration): simplify sidebar navigation"
```
