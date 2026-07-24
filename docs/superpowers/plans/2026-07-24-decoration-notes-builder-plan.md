# Decoration Notes Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an event-only, mobile-first decoration notes editor with mandatory image blocks, optional inventory linking, autosaved drafts, one customer-visible General Notes field, ordered final snapshots, and matching Event Detail/PDF output.

**Architecture:** Unfinished work lives in a new tenant-scoped `decoration_selection_drafts` collection and never creates reservations or changes booking state. The existing final reservation endpoint remains authoritative, accepts ordered catalog/custom lines plus General Notes, validates availability transactionally, writes the immutable snapshot, and deletes the draft only after success. The frontend separates pure block-state logic, an autosave controller, and presentation components so mobile behavior can be tested without coupling it to API calls.

**Tech Stack:** NestJS 11, Mongoose 8, class-validator, Next.js 16 static routes, React 19, TypeScript, AWS S3, PDFKit, Node test runner through `ts-node` and `tsx`.

## Global Constraints

- Apply behavior only to `EVENT_DECORATION`; do not alter banquet routes, collections, menu selection, PDFs, settings, or permissions.
- Every decoration block requires an image, a trimmed title, and a positive integer quantity.
- General Notes is optional, capped at 5,000 characters, stored separately from booking operational notes, and included in customer View/Download PDF only when non-empty.
- Draft autosave must not create inventory reservations, update `decorationSnapshot`, finalize price, or change booking status.
- Final Save remains the only authoritative availability/conflict and package-price operation.
- Existing snapshots without `position` and bookings without General Notes must remain readable.
- Use static routes and query-string overlays only.
- Mobile is the primary layout; no page-level horizontal scrolling.
- Follow red-green TDD for every production change and commit each task independently.

---

### Task 1: Define ordered note-block and draft domain contracts

**Files:**
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-draft.domain.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-draft.domain.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reservations/dto/decoration-reservation.dto.ts`

**Interfaces:**
- Produces `normalizeDecorationDraft(input): NormalizedDecorationDraft`.
- Produces shared limits `MAX_DECORATION_BLOCKS = 100` and `MAX_GENERAL_NOTES_LENGTH = 5000`.
- Produces backward-compatible optional `position` on final catalog/custom lines and optional `generalNotes` on `ReplaceDecorationReservationsDto`.

- [ ] **Step 1: Write failing domain tests**

Cover mixed custom/catalog blocks, stable ordering, mandatory images, duplicate positions, title/description limits, quantity, General Notes trimming, 100-block limit, and payload-size bounds:

```ts
const result = normalizeDecorationDraft({
  revision: 4,
  finalPackagePrice: "125000",
  generalNotes: "  Complete setup by 4 PM.  ",
  blocks: [
    {
      clientId: "custom-1",
      position: 1,
      kind: "CUSTOM",
      title: " Welcome board ",
      quantity: 1,
      description: "",
      image: { key: "event-photos/r1/b1/a.jpg", url: "https://cdn/a.jpg" },
    },
    {
      clientId: "catalog-1",
      position: 0,
      kind: "CATALOG",
      itemId: "507f1f77bcf86cd799439011",
      title: "Couple Entry",
      quantity: 2,
      image: { key: "catalog/a.jpg", url: "https://cdn/catalog.jpg" },
    },
  ],
});

assert.deepEqual(result.blocks.map((block) => block.clientId), [
  "catalog-1",
  "custom-1",
]);
assert.equal(result.generalNotes, "Complete setup by 4 PM.");
```

- [ ] **Step 2: Run the domain test and verify RED**

Run:

```bash
cd apps/BBS-BE
node -r ts-node/register src/modules/decoration-selection-drafts/decoration-selection-draft.domain.spec.ts
```

Expected: compile failure because the domain module does not exist.

- [ ] **Step 3: Implement strict normalization**

Define:

```ts
export type DecorationDraftBlock = {
  clientId: string;
  position: number;
  kind: "CATALOG" | "CUSTOM";
  itemId?: string;
  categoryId?: string;
  title: string;
  quantity: number;
  description: string | null;
  image: { key: string; url: string };
};

export type NormalizedDecorationDraft = {
  revision: number;
  blocks: DecorationDraftBlock[];
  generalNotes: string | null;
  finalPackagePrice: string;
};
```

Throw `BadRequestException` with block-indexed messages for invalid input. Sort a copied array by `position`; never mutate the DTO.

- [ ] **Step 4: Extend final selection DTO backward-compatibly**

Add optional `position` to both line DTOs and optional General Notes:

```ts
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(0)
position?: number;

@IsOptional()
@IsString()
@MaxLength(5000)
generalNotes?: string;
```

Retain mandatory `imageKey` and `imageUrl` on custom items.

- [ ] **Step 5: Verify and commit**

Run the focused test and `npm run build`, then commit:

```bash
git add src/modules/decoration-selection-drafts src/modules/decoration-reservations/dto/decoration-reservation.dto.ts
git commit -m "feat(decoration): define ordered proposal blocks"
```

### Task 2: Add event-only draft persistence and index migration

**Files:**
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/schemas/decoration-selection-draft.schema.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/dto/decoration-selection-draft.dto.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.service.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.controller.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.module.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.spec.ts`
- Create: `apps/BBS-BE/src/scripts/migrate-decoration-selection-draft-indexes.ts`
- Modify: `apps/BBS-BE/src/app.module.ts`
- Modify: `apps/BBS-BE/package.json`

**Interfaces:**
- Consumes `normalizeDecorationDraft`.
- Produces guarded GET/PUT/DELETE endpoints under `/decoration/selection-drafts/bookings/:bookingId`.
- Produces `DecorationSelectionDraftsService.deleteForBooking(restaurantId, bookingId, session?)` for Task 3.

- [ ] **Step 1: Write failing service/controller tests**

Assert:

- Company A cannot read or overwrite Company B's draft.
- Banquet companies fail the business guard.
- GET returns `null` when no draft exists.
- PUT revision 1 creates; revision 2 replaces.
- PUT revision 1 after server revision 2 returns HTTP 409 and current revision.
- Autosave leaves booking, status, package price, snapshot and reservations unchanged.
- DELETE is idempotent.
- Audit entries contain counts/revision, never private image keys or descriptions.

- [ ] **Step 2: Run and verify RED**

```bash
node -r ts-node/register src/modules/decoration-selection-drafts/decoration-selection-drafts.spec.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement schema and optimistic revision**

Use collection `decoration_selection_drafts` with:

```ts
DecorationSelectionDraftSchema.index(
  { restaurantId: 1, bookingId: 1 },
  { unique: true, name: "decoration_selection_draft_booking_unique" },
);
DecorationSelectionDraftSchema.index(
  { updatedAt: 1 },
  { name: "decoration_selection_draft_updated_at" },
);
```

PUT performs company-scoped `findOneAndUpdate` where the previous revision is lower than the incoming revision. If no update occurs, re-read and return a conflict unless this is the first revision.

- [ ] **Step 4: Guard endpoints and validate booking ownership**

Apply:

```ts
@UseGuards(JwtAuthGuard, BusinessTypeGuard, PermissionsGuard)
@BusinessTypes(BusinessType.EVENT_DECORATION)
@Permissions(PERMISSIONS.DECORATION_SELECTION_MANAGE)
```

Before every operation, confirm the booking belongs to the user's restaurant.

- [ ] **Step 5: Register module and migration**

Add:

```json
"migrate:decoration-selection-drafts": "ts-node src/scripts/migrate-decoration-selection-draft-indexes.ts"
```

The migration creates the two named indexes and prints both names.

- [ ] **Step 6: Verify and commit**

Run the focused test, business-guard tests, build and lint. Commit:

```bash
git add package.json src/app.module.ts src/modules/decoration-selection-drafts src/scripts/migrate-decoration-selection-draft-indexes.ts
git commit -m "feat(decoration): persist proposal drafts"
```

### Task 3: Finalize ordered snapshots, General Notes, and draft cleanup

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/schemas/decoration-booking.schema.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-selection/decoration-snapshot.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-selection/decoration-snapshot.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-reservations/decoration-reservations.module.ts`
- Create: `apps/BBS-BE/src/modules/decoration-reservations/decoration-notes-finalization.spec.ts`

**Interfaces:**
- Consumes optional positions and General Notes from Task 1.
- Consumes `DecorationSelectionDraftsService.deleteForBooking`.
- Produces ordered `decorationSnapshot` lines with `position` and optional `decorationGeneralNotes`.

- [ ] **Step 1: Write failing finalization tests**

Create catalog and custom lines interleaved by position and assert:

```ts
assert.deepEqual(
  saved.decorationSnapshot.map((line) => line.itemName),
  ["Custom Welcome", "Catalog Sofa", "Custom Signage"],
);
assert.equal(saved.decorationGeneralNotes, "Complete setup by 4 PM.");
assert.equal(await drafts.countDocuments({ bookingId }), 0);
```

Also assert failed availability or transaction leaves the draft, prior snapshot, General Notes, price and status unchanged.

- [ ] **Step 2: Run and verify RED**

```bash
node -r ts-node/register src/modules/decoration-reservations/decoration-notes-finalization.spec.ts
```

Expected: assertions fail because positions and General Notes are discarded.

- [ ] **Step 3: Implement ordered immutable snapshot lines**

Extend `buildDecorationSnapshotLine` with `position`. For omitted historical/client positions, assign stable input-order positions after explicitly positioned blocks, then sort a copy.

- [ ] **Step 4: Persist notes and delete draft after success**

Normalize General Notes with:

```ts
booking.decorationGeneralNotes = generalNotes?.trim() || null;
```

Delete the draft using the same Mongo session only after reservations and booking save succeed. Never delete it in error handling.

- [ ] **Step 5: Verify and commit**

Run reservation, availability, snapshot and finalization tests plus build. Commit:

```bash
git add src/modules/decoration-bookings/schemas/decoration-booking.schema.ts src/modules/decoration-selection src/modules/decoration-reservations
git commit -m "feat(decoration): finalize ordered proposal notes"
```

### Task 4: Add draft image cleanup and expiry safety

**Files:**
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-draft-cleanup.ts`
- Create: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-draft-cleanup.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-selection-drafts/decoration-selection-drafts.module.ts`
- Modify: `apps/BBS-BE/src/modules/upload/upload.service.ts`

**Interfaces:**
- Consumes S3 deletion support and booking/draft references.
- Produces bounded `cleanupExpiredDrafts({ before, limit })`.
- Draft service opportunistically invokes cleanup at most once per process hour after a successful write; cleanup failure never fails the user's save.

- [ ] **Step 1: Write failing cleanup tests**

Assert cleanup:

- Processes at most 100 drafts per run.
- Deletes only event-owned objects absent from every live draft and finalized snapshot.
- Never deletes catalog images.
- Leaves draft and object intact when reference verification or S3 deletion fails.
- Audits successful expiry without recording descriptions or image URLs.

- [ ] **Step 2: Run and verify RED**

```bash
node -r ts-node/register src/modules/decoration-selection-drafts/decoration-selection-draft-cleanup.spec.ts
```

- [ ] **Step 3: Implement conservative cleanup**

Use a 30-day cutoff and reference-first deletion. Delete the draft only after all unreferenced owned objects are removed. After a successful draft PUT, trigger a non-blocking bounded cleanup only when the in-memory `lastCleanupStartedAt` is more than one hour old. Catch and log cleanup failure without changing the autosave response; do not add a scheduling dependency.

- [ ] **Step 4: Verify and commit**

Run cleanup/upload tests, build and lint. Commit:

```bash
git add src/modules/decoration-selection-drafts src/modules/upload/upload.service.ts
git commit -m "feat(decoration): clean expired proposal drafts safely"
```

### Task 5: Build frontend ordered notes state and API clients

**Files:**
- Create: `apps/BBS-FE/lib/decoration/notes-builder-state.ts`
- Create: `apps/BBS-FE/lib/decoration/notes-builder-state.test.mjs`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/lib/decoration/selection-state.ts`
- Modify: `apps/BBS-FE/lib/decoration/selection-state.test.mjs`

**Interfaces:**
- Produces `DecorationNoteBlock`, `DecorationSelectionDraft`, and pure add/update/remove/move/hydrate/build functions.
- Produces `fetchDecorationSelectionDraft`, `saveDecorationSelectionDraft`, and `deleteDecorationSelectionDraft`.
- Produces an ordered final payload compatible with Task 3.

- [ ] **Step 1: Write failing pure-state tests**

Cover:

- Hydrating an existing mixed historical snapshot in array order.
- Hydrating a newer draft instead of the snapshot.
- Adding custom block with quantity 1.
- Linking/unlinking catalog item without losing title/image/description.
- Moving blocks up/down without mutation.
- Mandatory image/title/quantity validation.
- General Notes 5,000-character validation.
- Ordered final and draft payload generation.

- [ ] **Step 2: Run and verify RED**

```bash
cd apps/BBS-FE
node --import tsx --test lib/decoration/notes-builder-state.test.mjs
```

- [ ] **Step 3: Implement pure state**

Use:

```ts
export type DecorationNoteBlock = {
  clientId: string;
  position: number;
  kind: "CATALOG" | "CUSTOM";
  itemId?: string;
  categoryId?: string;
  title: string;
  quantity: number;
  description: string;
  image: { key: string; url: string };
};
```

All state functions return new arrays/objects. Reindex positions after every move/remove.

- [ ] **Step 4: Add typed API clients**

Use static-safe encoded booking IDs only in API paths; no dynamic Next.js routes. Add `AbortSignal` support to GET/PUT.

- [ ] **Step 5: Verify and commit**

Run state, selection and API tests plus lint. Commit:

```bash
git add lib/auth lib/decoration/notes-builder-state.ts lib/decoration/notes-builder-state.test.mjs lib/decoration/selection-state.ts lib/decoration/selection-state.test.mjs
git commit -m "feat(decoration): model ordered proposal notes"
```

### Task 6: Implement resilient debounced autosave

**Files:**
- Create: `apps/BBS-FE/lib/decoration/notes-autosave.ts`
- Create: `apps/BBS-FE/lib/decoration/notes-autosave.test.mjs`
- Create: `apps/BBS-FE/components/decoration/use-decoration-notes-autosave.ts`

**Interfaces:**
- Consumes the typed draft API and normalized note state.
- Produces `{ status, error, retry, flush, discard }`.

- [ ] **Step 1: Write failing controller tests**

With fake timers and injected save function, assert:

- 800 ms debounce combines rapid edits into one request.
- One request is in flight at a time.
- A later revision is queued and sent after the active request.
- Stale responses cannot mark newer edits saved.
- Failure preserves state and Retry reuses the newest revision.
- Abort/unmount prevents state updates.
- `flush()` saves pending edits before Preview or Final Save.

- [ ] **Step 2: Run and verify RED**

```bash
node --import tsx --test lib/decoration/notes-autosave.test.mjs
```

- [ ] **Step 3: Implement transport-independent controller**

Use an injected clock and save operation in the pure controller. The React hook owns lifecycle, abort controller and display state:

```ts
type DraftSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
```

- [ ] **Step 4: Verify and commit**

Run autosave tests and lint. Commit:

```bash
git add lib/decoration/notes-autosave.ts lib/decoration/notes-autosave.test.mjs components/decoration/use-decoration-notes-autosave.ts
git commit -m "feat(decoration): autosave proposal drafts"
```

### Task 7: Replace selection popup with the mobile-first notes builder

**Files:**
- Modify: `apps/BBS-FE/components/decoration/decoration-selection-modal.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-note-block-editor.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-inventory-linker.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-general-notes.tsx`
- Create: `apps/BBS-FE/lib/decoration/notes-builder-view.test.mjs`
- Modify: `apps/BBS-FE/lib/decoration/mobile-responsive-audit.test.mjs`
- Modify: `apps/BBS-FE/lib/decoration/selection-modal-view.test.mjs`

**Interfaces:**
- Consumes Tasks 5–6 and existing crop/upload/availability clients.
- Produces the approved Notes Builder UI.

- [ ] **Step 1: Write failing view and source tests**

Assert the rendered/source contract contains:

- **Add Photo Note**
- mandatory image/title/quantity labels
- optional inventory linker
- General Notes
- autosave states and Retry
- reorder/remove/discard actions
- internal popup scrolling and attached footer
- no page-level horizontal overflow
- existing amber/slate/white/green/red palette

- [ ] **Step 2: Run and verify RED**

```bash
node --import tsx --test lib/decoration/notes-builder-view.test.mjs lib/decoration/mobile-responsive-audit.test.mjs lib/decoration/selection-modal-view.test.mjs
```

- [ ] **Step 3: Split the current oversized modal**

Keep `DecorationSelectionModal` as the orchestration boundary. Move one-block editing and inventory-link selection into focused components. Reuse `DecorationImageCropModal`, upload validation, live availability and reservation error mapping.

- [ ] **Step 4: Implement recovery and discard flow**

Load booking snapshot, draft, categories, items and availability concurrently with stale-request protection. Prefer a draft when present. **Discard Draft** requires confirmation, calls DELETE, and rehydrates the last finalized snapshot.

- [ ] **Step 5: Implement Preview and Final Save safety**

Preview calls `flush()` first. Final Save validates locally, flushes the latest draft, invokes the authoritative selection API, then calls `onSaved`. API failure leaves the modal and draft open with block-specific errors.

- [ ] **Step 6: Verify and commit**

Run notes, crop, availability, selection, contrast and mobile suites; run lint and static build. Restore `next-env.d.ts`, then commit:

```bash
git add components/decoration lib/decoration
git commit -m "feat(decoration): add mobile proposal notes builder"
```

### Task 8: Render General Notes and ordered blocks in Event Detail and PDF

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-booking-view.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.service.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-snapshot-gallery.tsx`
- Modify: `apps/BBS-FE/components/decoration/decoration-customer-document.tsx`
- Modify: `apps/BBS-FE/lib/decoration/customer-document-layout.test.mjs`
- Modify: `apps/BBS-FE/lib/decoration/snapshot-view.test.mjs`

**Interfaces:**
- Consumes finalized `decorationGeneralNotes` and positions.
- Produces identical ordered content for Event Detail, View and downloaded PDF.

- [ ] **Step 1: Write failing backend document tests**

Assert normalized document data contains:

```ts
{
  generalNotes: "Complete setup by 4 PM.",
  categories: /* blocks remain in saved position order */,
}
```

Assert blank notes become `null` and PDF output contains no General Notes heading.

- [ ] **Step 2: Write failing frontend document tests**

Assert Event Detail and HTML preview render General Notes after all blocks, preserve position order, use the existing black/white/slate PDF palette and omit empty notes.

- [ ] **Step 3: Run both test groups and verify RED**

Run the focused BE specs and FE document/snapshot tests.

- [ ] **Step 4: Implement normalized output**

Add `decorationGeneralNotes` to booking view and `generalNotes` to `DecorationCustomerDocument`. Sort only by explicit position with stable array-index fallback; do not regroup in a way that changes order.

- [ ] **Step 5: Implement PDF and UI presentation**

Use the existing 50/50 image/text item layout. Add a page-break-safe General Notes section after the final block. Use black headings and slate body text.

- [ ] **Step 6: Verify and commit both repositories**

Run customer document, PDF, image fallback, detail and download tests plus builds. Commit:

```bash
git commit -m "feat(decoration): include proposal notes in customer documents"
```

### Task 9: Migration, regression, security, and release checklist

**Files:**
- Modify: `apps/BBS-FE/docs/superpowers/plans/2026-07-24-decoration-notes-builder-plan.md`

**Interfaces:**
- Validates every prior task and banquet isolation.

- [ ] **Step 1: Run every backend spec**

```bash
cd apps/BBS-BE
for file in $(find src -name '*.spec.ts' -print | sort); do
  node -r ts-node/register "$file" || exit 1
done
```

Expected: all files exit zero, including banquet cancellation, Hot Dates, ODC, permissions and business-type guards.

- [ ] **Step 2: Run backend release checks**

```bash
npm run build
npm run lint
npm audit --audit-level=moderate
```

Expected: successful build, zero lint errors and zero moderate-or-higher vulnerabilities.

- [ ] **Step 3: Run the migration**

```bash
npm run migrate:decoration-selection-drafts
```

Verify MongoDB contains `decoration_selection_draft_booking_unique` and `decoration_selection_draft_updated_at`.

- [ ] **Step 4: Run every event and banquet-isolation frontend test**

```bash
cd apps/BBS-FE
node --import tsx --test lib/decoration/*.test.mjs
node --import tsx --test lib/bookings/*.test.mjs lib/auth/business-routes.test.mjs lib/employees/*.test.mjs
```

Expected: zero failures.

- [ ] **Step 5: Run frontend release checks**

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
git restore next-env.d.ts
```

Expected: all routes remain static and no moderate-or-higher vulnerabilities exist.

- [ ] **Step 6: Inspect final scope**

```bash
git -C apps/BBS-BE diff --check
git -C apps/BBS-FE diff --check
git -C apps/BBS-BE status --short
git -C apps/BBS-FE status --short
```

Expected: clean worktrees and no banquet production behavior changes.

- [ ] **Step 7: Mark the checklist and commit**

Change every verified checkbox to `[x]`, record any pre-existing lint warnings accurately, and commit:

```bash
git add docs/superpowers/plans/2026-07-24-decoration-notes-builder-plan.md
git commit -m "docs(decoration): complete notes builder checklist"
```
