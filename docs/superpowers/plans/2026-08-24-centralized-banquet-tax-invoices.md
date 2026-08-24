# Centralized Banquet Tax Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a banquet-only, restaurant-scoped Tax Invoices workspace where authorized users can search, view, download, and safely correct generated invoices without manually locating their bookings.

**Architecture:** Preserve the existing immutable booking invoice lifecycle and add restaurant-wide read endpoints plus a static `/invoices/` frontend workspace. The API derives tenant identity from the authenticated user, performs server-side filtering/aggregation/pagination, and reuses the current PDF and cancel-and-reissue services. The frontend uses URL query parameters, responsive table/card presenters, and the existing invoice modal workflow.

**Tech Stack:** NestJS 11, Mongoose 8, MongoDB, Next.js 16 static export, React 19, TypeScript 5.8, Tailwind CSS 4, Node test runner, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-22-centralized-banquet-tax-invoices-design.md`

## Global Constraints

- Banquet companies only; event-decoration behavior must remain unchanged.
- Show navigation only when billing is enabled and the user has `bookings.invoices.view`.
- Issued invoices are immutable; corrections use cancel-and-reissue with a new invoice number.
- All tenant identity comes from the authenticated user; APIs do not accept a restaurant ID.
- Existing `/orders/:bookingId/invoice` APIs and booking invoice flows remain backward compatible.
- Frontend routing must support static deployment and use `/invoices/` with query parameters.
- Mobile is first priority, with no page-level horizontal scrolling; tablet and desktop remain responsive.
- Cancelled invoice amounts do not contribute to summary financial totals.
- List/filter reads do not create audit records; downloads and mutations remain audited.
- Use TDD, run focused tests after each task, and commit backend and frontend work separately.

---

## File Map

### Backend

- Create `apps/BBS-BE/src/modules/banquet-invoices/dto/list-banquet-invoices.dto.ts`: strict query validation and normalized list filters.
- Create `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-query.ts`: pure filter, sort, pagination, search, and summary helpers.
- Create `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-query.spec.ts`: pure query-helper tests.
- Create `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-workspace.controller.ts`: restaurant-wide list, summary, detail, and download routes.
- Modify `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.service.ts`: tenant-scoped workspace reads and shared invoice download path.
- Modify `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.module.ts`: register the workspace controller.
- Modify `apps/BBS-BE/src/modules/banquet-invoices/schemas/banquet-invoice.schema.ts`: status/date/index support for list queries.
- Modify `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.controller.spec.ts`: route guard and permission coverage.
- Modify `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.service.spec.ts`: tenant, filtering, aggregation, pagination, detail, and download coverage.
- Create `apps/BBS-BE/src/scripts/banquet-invoice-workspace-index-migration.ts`: idempotent equivalent-index reconciliation.
- Create `apps/BBS-BE/src/scripts/banquet-invoice-workspace-index-migration.spec.ts`: migration behavior tests.
- Create `apps/BBS-BE/src/scripts/migrate-banquet-invoice-workspace-indexes.ts`: executable migration entry point.
- Modify `apps/BBS-BE/package.json`: add `migrate:banquet-invoice-workspace`.

### Frontend

- Modify `apps/BBS-FE/lib/auth/types.ts`: workspace list/detail/summary/filter contracts.
- Modify `apps/BBS-FE/lib/auth/api.ts`: list, summary, detail, and workspace download clients.
- Create `apps/BBS-FE/lib/banquet/invoice-workspace.ts`: query-state, presentation, money/date, and permission helpers.
- Create `apps/BBS-FE/lib/banquet/invoice-workspace.spec.ts`: pure helper tests.
- Create `apps/BBS-FE/components/invoices/invoice-filters.tsx`: desktop/mobile filters and active chips.
- Create `apps/BBS-FE/components/invoices/invoice-summary.tsx`: responsive filtered summary cards.
- Create `apps/BBS-FE/components/invoices/invoice-list.tsx`: desktop table, mobile cards, pagination, and row actions.
- Create `apps/BBS-FE/components/invoices/invoice-detail-modal.tsx`: invoice snapshot view and replacement navigation.
- Create `apps/BBS-FE/components/invoices/invoice-workspace.tsx`: request orchestration and correction workflow.
- Create `apps/BBS-FE/components/invoices/invoice-workspace.behavior.spec.tsx`: responsive behavior and actions.
- Create `apps/BBS-FE/app/(app)/invoices/page.tsx`: static route and Suspense boundary.
- Modify `apps/BBS-FE/components/layouts/app-layout.tsx`: guarded Tax Invoices navigation entry.
- Create `apps/BBS-FE/lib/banquet/invoice-navigation.spec.ts`: navigation visibility contract.

---

### Task 1: Backend query contract and pure filter builder

**Files:**
- Create: `apps/BBS-BE/src/modules/banquet-invoices/dto/list-banquet-invoices.dto.ts`
- Create: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-query.ts`
- Create: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-query.spec.ts`

**Interfaces:**
- Produces: `ListBanquetInvoicesDto`, `normalizeInvoiceListQuery(dto, timezone)`, `buildInvoiceMatch(restaurantId, query)`, `buildInvoiceSort(query)`, and `buildInvoiceSummaryPipeline(match)`.
- Consumes: `BanquetInvoiceStatus` from the existing schema.

- [ ] **Step 1: Write failing validation and query-helper tests**

Cover defaults (`page=1`, `limit=20`, `sort=newest`), maximum limit `100`, search trimming and maximum length `80`, supported statuses, inclusive `YYYY-MM-DD` date boundaries, invalid/reversed ranges, escaped regex characters, restaurant scope, and deterministic `{ issuedAt, _id }` sorting.

```ts
assert.deepEqual(buildInvoiceSort({ sort: 'newest' }), { issuedAt: -1, _id: -1 });
assert.match(String(buildInvoiceMatch(restaurantId, { search: 'A+B' }).$or[0].invoiceNumber), /A\\\+B/);
assert.equal(normalizeInvoiceListQuery({ page: '0' } as never, 'Asia/Kolkata').page, 1);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd apps/BBS-BE && node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoice-query.spec.ts`

Expected: FAIL because the query module and DTO do not exist.

- [ ] **Step 3: Implement strict DTO and pure helpers**

Use `class-validator` transforms for `page`, `limit`, status, sort, and date strings. Normalize the query to this contract:

```ts
export type NormalizedInvoiceListQuery = {
  page: number;
  limit: number;
  search: string;
  status: BanquetInvoiceStatus | null;
  invoiceFrom: Date | null;
  invoiceToExclusive: Date | null;
  eventFrom: string | null;
  eventTo: string | null;
  sort: 'newest' | 'oldest';
};
```

Build tenant-scoped matches for invoice number, recipient name/mobile, string booking reference, issued date, and `eventSnapshot.eventDate`. Escape regex metacharacters and reject reversed ranges with `BadRequestException`.

- [ ] **Step 4: Run focused tests and lint**

Run:

```bash
cd apps/BBS-BE
node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoice-query.spec.ts
npx eslint src/modules/banquet-invoices/dto/list-banquet-invoices.dto.ts src/modules/banquet-invoices/banquet-invoice-query.ts src/modules/banquet-invoices/banquet-invoice-query.spec.ts
```

Expected: PASS with zero lint errors.

- [ ] **Step 5: Commit backend query contract**

```bash
cd apps/BBS-BE
git add src/modules/banquet-invoices/dto/list-banquet-invoices.dto.ts src/modules/banquet-invoices/banquet-invoice-query.ts src/modules/banquet-invoices/banquet-invoice-query.spec.ts
git commit -m "feat: define banquet invoice workspace queries"
```

### Task 2: Restaurant-wide invoice service reads

**Files:**
- Modify: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.service.ts`
- Modify: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.service.spec.ts`

**Interfaces:**
- Consumes: query helpers from Task 1.
- Produces: `findForRestaurant(user, dto)`, `summarizeForRestaurant(user, dto)`, `findWorkspaceInvoice(user, invoiceId)`, and `downloadWorkspaceInvoice(user, invoiceId)`.

- [ ] **Step 1: Add failing service tests**

Test restaurant scoping, combined filters, stable skip/limit pagination, issued/cancelled counts, exclusion of cancelled financial values, invoice detail isolation, historical PDF download, audit metadata, invalid object IDs, and another restaurant's invoice returning Not Found.

```ts
assert.deepEqual(result.data.pagination, {
  page: 2,
  limit: 20,
  total: 45,
  totalPages: 3,
  hasPrevious: true,
  hasNext: true,
});
assert.equal(summary.data.grandTotalPaise, 42184275);
```

- [ ] **Step 2: Run the service test and verify failure**

Run: `cd apps/BBS-BE && node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoices.service.spec.ts`

Expected: FAIL because workspace methods do not exist.

- [ ] **Step 3: Implement service reads and shared PDF generation**

Return this paginated envelope:

```ts
{
  success: true,
  message: 'Invoices fetched successfully',
  data: {
    records: invoices.map((invoice) => this.mapInvoice(invoice)),
    pagination: { page, limit, total, totalPages, hasPrevious, hasNext },
  },
}
```

Summary returns counts plus `taxableSubtotalPaise`, `taxPaise`, and `grandTotalPaise`. Refactor current PDF loading into a private method shared by booking-based and workspace downloads so rendering and audit behavior cannot diverge.

- [ ] **Step 4: Run tests and lint**

Run:

```bash
cd apps/BBS-BE
node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoices.service.spec.ts
npx eslint src/modules/banquet-invoices/banquet-invoices.service.ts src/modules/banquet-invoices/banquet-invoices.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit service reads**

```bash
cd apps/BBS-BE
git add src/modules/banquet-invoices/banquet-invoices.service.ts src/modules/banquet-invoices/banquet-invoices.service.spec.ts
git commit -m "feat: add restaurant invoice workspace queries"
```

### Task 3: Workspace controller and guarded endpoints

**Files:**
- Create: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoice-workspace.controller.ts`
- Modify: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.module.ts`
- Modify: `apps/BBS-BE/src/modules/banquet-invoices/banquet-invoices.controller.spec.ts`

**Interfaces:**
- Consumes: Task 2 service methods and existing RBAC constants.
- Produces: `/banquet-invoices`, `/banquet-invoices/summary`, `/banquet-invoices/:invoiceId`, and `/banquet-invoices/:invoiceId/download`.

- [ ] **Step 1: Write failing controller metadata and response tests**

Assert JWT, role, banquet-business, and permissions guards; `bookings.invoices.view` for list/summary/detail; `bookings.invoices.download` for download; response headers `application/pdf`, attachment filename, and `private, no-store, max-age=0`.

- [ ] **Step 2: Run the controller test and verify failure**

Run: `cd apps/BBS-BE && node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoices.controller.spec.ts`

Expected: FAIL because the workspace controller is absent.

- [ ] **Step 3: Implement and register the controller**

```ts
@Controller('banquet-invoices')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessTypeGuard, PermissionsGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE)
@BusinessTypes(BusinessType.BANQUET)
export class BanquetInvoiceWorkspaceController {}
```

Declare `/summary` before `/:invoiceId` and use `@Query() dto: ListBanquetInvoicesDto` for list and summary.

- [ ] **Step 4: Run controller/service regression and lint**

Run:

```bash
cd apps/BBS-BE
node --import ts-node/register --test src/modules/banquet-invoices/banquet-invoices.controller.spec.ts src/modules/banquet-invoices/banquet-invoices.service.spec.ts
npx eslint src/modules/banquet-invoices/banquet-invoice-workspace.controller.ts src/modules/banquet-invoices/banquet-invoices.module.ts
```

Expected: PASS.

- [ ] **Step 5: Commit endpoints**

```bash
cd apps/BBS-BE
git add src/modules/banquet-invoices/banquet-invoice-workspace.controller.ts src/modules/banquet-invoices/banquet-invoices.module.ts src/modules/banquet-invoices/banquet-invoices.controller.spec.ts
git commit -m "feat: expose banquet invoice workspace endpoints"
```

### Task 4: Production index migration

**Files:**
- Modify: `apps/BBS-BE/src/modules/banquet-invoices/schemas/banquet-invoice.schema.ts`
- Create: `apps/BBS-BE/src/scripts/banquet-invoice-workspace-index-migration.ts`
- Create: `apps/BBS-BE/src/scripts/banquet-invoice-workspace-index-migration.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-banquet-invoice-workspace-indexes.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Produces: compound index `{ restaurantId: 1, status: 1, issuedAt: -1, _id: -1 }` named `restaurant_invoice_status_issue_date` and `ensureBanquetInvoiceWorkspaceIndexes(collection)`.

- [ ] **Step 1: Write failing idempotency tests**

Test an empty collection, an equivalent index with a different name, the correct named index, and a conflicting same-name index. Equivalent key/options must not trigger duplicate creation.

- [ ] **Step 2: Run the migration test and verify failure**

Run: `cd apps/BBS-BE && node --import ts-node/register --test src/scripts/banquet-invoice-workspace-index-migration.spec.ts`

Expected: FAIL because the migration helper does not exist.

- [ ] **Step 3: Implement schema index and migration**

Compare normalized index keys and relevant options before creating the index. Never drop an unknown production index automatically; emit a precise conflict error instead.

- [ ] **Step 4: Run migration tests, schema tests, lint, and build**

Run:

```bash
cd apps/BBS-BE
node --import ts-node/register --test src/scripts/banquet-invoice-workspace-index-migration.spec.ts src/modules/banquet-invoices/banquet-invoice-schemas.spec.ts
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit migration**

```bash
cd apps/BBS-BE
git add package.json src/modules/banquet-invoices/schemas/banquet-invoice.schema.ts src/scripts/banquet-invoice-workspace-index-migration.ts src/scripts/banquet-invoice-workspace-index-migration.spec.ts src/scripts/migrate-banquet-invoice-workspace-indexes.ts
git commit -m "feat: add banquet invoice workspace indexes"
```

### Task 5: Frontend contracts, API client, and query-state helpers

**Files:**
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Create: `apps/BBS-FE/lib/banquet/invoice-workspace.ts`
- Create: `apps/BBS-FE/lib/banquet/invoice-workspace.spec.ts`

**Interfaces:**
- Produces: `BanquetInvoiceListQuery`, `BanquetInvoiceListResponse`, `BanquetInvoiceSummary`, `parseInvoiceWorkspaceQuery(searchParams)`, `serializeInvoiceWorkspaceQuery(query)`, `invoiceWorkspaceActions(invoice, permissions)`, and four API functions matching Task 3.

- [ ] **Step 1: Write failing helper tests**

Cover default query hydration, unknown query removal, page reset when filters change, valid static query serialization, status action rules, Indian money/date presentation, and replacement links.

```ts
assert.equal(serializeInvoiceWorkspaceQuery({ page: 2, status: 'ISSUED' }), 'page=2&status=ISSUED');
assert.deepEqual(invoiceWorkspaceActions(cancelled, permissions), ['view', 'download', 'replacement', 'booking']);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd apps/BBS-FE && node --import tsx --test lib/banquet/invoice-workspace.spec.ts`

Expected: FAIL because the workspace helper does not exist.

- [ ] **Step 3: Implement contracts, helpers, and API calls**

Use `authorizedRequest` for JSON endpoints and the existing bound fetch/download wrapper for PDFs. Do not store invoice data in the URL; store only bounded filters and page state.

- [ ] **Step 4: Run focused tests and lint**

Run:

```bash
cd apps/BBS-FE
node --import tsx --test lib/banquet/invoice-workspace.spec.ts lib/auth/api-error.spec.ts
npx eslint lib/auth/types.ts lib/auth/api.ts lib/banquet/invoice-workspace.ts lib/banquet/invoice-workspace.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit frontend contracts**

```bash
cd apps/BBS-FE
git add lib/auth/types.ts lib/auth/api.ts lib/banquet/invoice-workspace.ts lib/banquet/invoice-workspace.spec.ts
git commit -m "feat: add banquet invoice workspace client"
```

### Task 6: Responsive invoice workspace presentation

**Files:**
- Create: `apps/BBS-FE/components/invoices/invoice-filters.tsx`
- Create: `apps/BBS-FE/components/invoices/invoice-summary.tsx`
- Create: `apps/BBS-FE/components/invoices/invoice-list.tsx`
- Create: `apps/BBS-FE/components/invoices/invoice-detail-modal.tsx`
- Create: `apps/BBS-FE/components/invoices/invoice-workspace.behavior.spec.tsx`

**Interfaces:**
- Consumes: Task 5 types and presenters.
- Produces: controlled filter, summary, list, detail, pagination, and action components without data-fetching side effects.

- [ ] **Step 1: Write failing component behavior tests**

Test desktop table semantics, mobile card content, absence of page overflow classes, active filter chips, empty/error/loading states, pagination controls, permission-aware actions, cancelled/replacement copy, and keyboard-accessible action menus.

- [ ] **Step 2: Run the behavior test and verify failure**

Run: `cd apps/BBS-FE && node --import tsx --test components/invoices/invoice-workspace.behavior.spec.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement controlled responsive components**

Use the existing banquet color system: slate text, white cards, amber active accents, green issued state, and red/neutral cancelled state. Render `md:hidden` cards and a `hidden md:block` table. Keep actions as buttons with explicit accessible labels.

- [ ] **Step 4: Run component tests and lint**

Run:

```bash
cd apps/BBS-FE
node --import tsx --test components/invoices/invoice-workspace.behavior.spec.tsx
npx eslint components/invoices
```

Expected: PASS.

- [ ] **Step 5: Commit presentation components**

```bash
cd apps/BBS-FE
git add components/invoices
git commit -m "feat: build responsive banquet invoice list"
```

### Task 7: Page orchestration and immutable correction workflow

**Files:**
- Create: `apps/BBS-FE/components/invoices/invoice-workspace.tsx`
- Create: `apps/BBS-FE/app/(app)/invoices/page.tsx`
- Modify: `apps/BBS-FE/components/invoices/invoice-workspace.behavior.spec.tsx`
- Modify: `apps/BBS-FE/components/bookings/banquet-invoice-modal.tsx`

**Interfaces:**
- Consumes: Tasks 5-6 APIs/components and the existing `BanquetInvoiceModal`.
- Produces: static `/invoices/` page with debounced fetches, URL hydration, view/download/correction/replacement/booking actions, and stale-state recovery.

- [ ] **Step 1: Extend failing behavior tests for orchestration**

Cover list and summary loading from identical filters, 300 ms debounced search, request cancellation/sequence protection, page reset, download filename handling, detail modal, correction form prefill, required correction reason, refresh after reissue, replacement selection, and booking query-string navigation.

- [ ] **Step 2: Run the behavior test and verify failure**

Run: `cd apps/BBS-FE && node --import tsx --test components/invoices/invoice-workspace.behavior.spec.tsx`

Expected: FAIL on orchestration cases.

- [ ] **Step 3: Implement the workspace and adapt the existing modal**

Wrap query-param usage in Suspense for static build compatibility. Reuse `BanquetInvoiceModal` by loading the source booking from `invoice.bookingId` only when correction is requested. Preserve the modal's current booking-entry behavior and add an optional completion callback that refreshes workspace results.

- [ ] **Step 4: Run focused tests, lint, and static build**

Run:

```bash
cd apps/BBS-FE
node --import tsx --test components/invoices/invoice-workspace.behavior.spec.tsx lib/banquet/invoice-workspace.spec.ts
npm run lint
npm run build
test -f out/invoices/index.html
```

Expected: PASS and static invoice HTML exists.

- [ ] **Step 5: Commit page workflow**

```bash
cd apps/BBS-FE
git add 'app/(app)/invoices/page.tsx' components/invoices/invoice-workspace.tsx components/invoices/invoice-workspace.behavior.spec.tsx components/bookings/banquet-invoice-modal.tsx
git commit -m "feat: add centralized banquet invoice workspace"
```

### Task 8: Sidebar visibility and route guarding

**Files:**
- Modify: `apps/BBS-FE/components/layouts/app-layout.tsx`
- Create: `apps/BBS-FE/lib/banquet/invoice-navigation.spec.ts`

**Interfaces:**
- Consumes: `sidebarRestaurant.billingEnabled`, banquet business type, and `PERMISSIONS.BOOKINGS_INVOICES_VIEW`.
- Produces: guarded `Tax Invoices` sidebar link at `/invoices` for company admins and authorized employees.

- [ ] **Step 1: Write failing navigation contract tests**

Test enabled admin, enabled authorized employee, disabled billing, missing permission, event-decoration company, super admin, and active-route highlighting.

- [ ] **Step 2: Run the navigation test and verify failure**

Run: `cd apps/BBS-FE && node --import tsx --test lib/banquet/invoice-navigation.spec.ts`

Expected: FAIL because Tax Invoices is not in navigation.

- [ ] **Step 3: Extract and implement a testable visibility helper**

```ts
export function canShowBanquetInvoices(
  user: AuthUser | null,
  restaurant: Restaurant | null,
): boolean {
  return user?.businessType === 'BANQUET'
    && restaurant?.billingEnabled === true
    && hasPermission(user, PERMISSIONS.BOOKINGS_INVOICES_VIEW);
}
```

Pass this boolean into `buildNavItems` and insert `{ href: '/invoices', label: 'Tax Invoices', icon: <IconReceipt /> }` after Bookings. Ensure employee navigation uses the same rule.

- [ ] **Step 4: Run navigation regression, lint, and build**

Run:

```bash
cd apps/BBS-FE
node --import tsx --test lib/banquet/invoice-navigation.spec.ts lib/auth/business-routes.test.mjs
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit sidebar integration**

```bash
cd apps/BBS-FE
git add components/layouts/app-layout.tsx lib/banquet/invoice-navigation.spec.ts
git commit -m "feat: add guarded tax invoice navigation"
```

### Task 9: Full regression, migration rehearsal, and rollout evidence

**Files:**
- Modify only files required to correct failures directly caused by Tasks 1-8.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: production-ready backend and static frontend with documented deployment order.

- [ ] **Step 1: Run the complete backend invoice suite**

```bash
cd apps/BBS-BE
node --import ts-node/register --test \
  src/modules/banquet-invoices/*.spec.ts \
  src/scripts/banquet-invoice-workspace-index-migration.spec.ts
npm run lint
npm run build
```

Expected: all tests pass, lint is clean, and Nest build completes.

- [ ] **Step 2: Rehearse the migration twice against the configured development database**

Run: `cd apps/BBS-BE && npm run migrate:banquet-invoice-workspace && npm run migrate:banquet-invoice-workspace`

Expected: both runs succeed; the second reports the equivalent index already present and creates nothing.

- [ ] **Step 3: Run the complete frontend focused and regression suite**

```bash
cd apps/BBS-FE
node --import tsx --test \
  lib/banquet/invoice-workspace.spec.ts \
  lib/banquet/invoice-navigation.spec.ts \
  lib/banquet/invoice-issuance.spec.ts \
  lib/banquet/invoice-workflow.test.mjs \
  components/invoices/invoice-workspace.behavior.spec.tsx
npm run lint
npm run build
test -f out/invoices/index.html
```

Expected: all tests pass, lint is clean, static build succeeds, and the route artifact exists.

- [ ] **Step 4: Perform responsive and authorization smoke checks**

Verify at 390 px, 768 px, and 1440 px widths: no page horizontal scroll, readable money values, usable filters/actions, modal containment, billing-disabled link hidden, missing-permission link hidden, issued/cancelled actions correct, event-decoration navigation unchanged, and booking invoice generation still works.

- [ ] **Step 5: Inspect both repositories and commit any focused regression fixes**

Run:

```bash
git -C apps/BBS-BE status --short
git -C apps/BBS-FE status --short
git -C apps/BBS-BE log -5 --oneline
git -C apps/BBS-FE log -5 --oneline
```

Expected: clean worktrees with separate descriptive backend and frontend commits.

- [ ] **Step 6: Deploy in safe order**

Deploy backend, run `npm run migrate:banquet-invoice-workspace`, verify list/summary health with an authorized banquet account, then deploy frontend. The existing booking invoice endpoints remain available throughout the rollout.
