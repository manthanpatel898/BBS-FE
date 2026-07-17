# Simplified Decoration Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove customer-configurable advanced inventory/logistics from decoration items and add optional image attachment directly to Add Item.

**Architecture:** The backend exposes a minimal item DTO and owns fixed bulk, slot-only persistence defaults so reservation code remains compatible. The frontend uses a small create-item workflow that creates the record first and then uploads the optional image; partial upload failure returns the created item and a retryable warning instead of rolling back or duplicating data.

**Tech Stack:** NestJS 11, class-validator, Mongoose, AWS S3/Sharp; Next.js 16 static export, React 19, TypeScript, Node test runner.

## Global Constraints

- Do not add or run a migration; there is no decoration item data.
- Do not remove internal schema fields used by reservations, reports, and dashboard calculations.
- Persist `BULK`, zero maintenance, empty units, `SLOT_ONLY`, zero buffers, and null storage note for every new and updated item.
- Do not change banquet files, endpoints, or collections.
- Keep the existing 8 MB, JPEG/PNG/WebP, Sharp validation, tenant ownership, image-count, cover, and S3 cleanup protections.
- Use TDD: observe every focused test fail before implementing its behavior.
- Commit backend defaults, frontend workflow, and UI integration separately.

---

### Task 1: Simplify the Backend Decoration Item Contract

**Files:**

- Modify: `apps/BBS-BE/src/modules/decoration-catalog/dto/decoration-catalog.dto.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/decoration-inventory.utils.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/decoration-inventory.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/decoration-catalog.service.ts`

**Interfaces:**

- Consumes: existing `DecorationItemDto` controller endpoints and `DecorationItem` schema.
- Produces: `DecorationItemDto { categoryId; name; description?; totalQuantity }` and `simpleDecorationInventoryDefaults(totalQuantity)`.

- [ ] **Step 1: Write failing DTO/default tests**

Extend `decoration-inventory.spec.ts` to validate a DTO containing only the four public fields and to assert:

```ts
assert.deepEqual(simpleDecorationInventoryDefaults(5), {
  trackingMode: 'BULK',
  totalQuantity: 5,
  maintenanceQuantity: 0,
  units: [],
  logisticsMode: 'SLOT_ONLY',
  setupBufferMinutes: 0,
  removalBufferMinutes: 0,
  turnaroundBufferMinutes: 0,
  storageNote: null,
});
```

Also inspect `Object.keys(plainToInstance(DecorationItemDto, advancedPayload))` after global whitelist-compatible transformation and prove advanced properties have no decorated DTO contract.

- [ ] **Step 2: Verify RED**

Run:

```bash
cd apps/BBS-BE
npx --no-install ts-node src/modules/decoration-catalog/decoration-inventory.spec.ts
```

Expected: missing `simpleDecorationInventoryDefaults` or DTO still requires advanced fields.

- [ ] **Step 3: Reduce `DecorationItemDto`**

Remove `InventoryUnitDto` and all advanced decorators/imports. Keep:

```ts
export class DecorationItemDto {
  @IsMongoId() categoryId!: string;
  @IsString() @MaxLength(150) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @Type(() => Number) @IsInt() @Min(1) totalQuantity!: number;
}
```

The minimum becomes `1`, matching a selectable physical item.

- [ ] **Step 4: Add and use fixed defaults**

Add a pure helper returning the exact defaults above. In both `createItem` and `updateItem`, spread this helper instead of reading advanced DTO fields. Delete the service's old `inventory(dto)` method and its unit sanitization imports.

Updating an item deliberately resets the internal advanced fields to fixed defaults because there is no production data.

- [ ] **Step 5: Verify backend and commit**

```bash
npx --no-install ts-node src/modules/decoration-catalog/decoration-inventory.spec.ts
npx --no-install ts-node src/modules/decoration-reservations/decoration-reservation-domain.spec.ts
npm run build
git diff --check
git add src/modules/decoration-catalog
git commit -m "refactor(decoration): simplify item inventory contract"
```

### Task 2: Simplify the Frontend Form Model and Add a Recoverable Create-Then-Upload Workflow

**Files:**

- Modify: `apps/BBS-FE/lib/decoration/catalog-form.ts`
- Modify: `apps/BBS-FE/lib/decoration/catalog-form.test.mjs`
- Create: `apps/BBS-FE/lib/decoration/create-item-workflow.ts`
- Create: `apps/BBS-FE/lib/decoration/create-item-workflow.test.mjs`

**Interfaces:**

- Produces: `SimpleDecorationItemForm`, `buildDecorationItemPayload(form)`, and:

```ts
createDecorationItemWithOptionalImage({
  payload,
  image,
  createItem,
  uploadImage,
}): Promise<{
  item: DecorationItem;
  imageUploaded: boolean;
  warning: string | null;
}>
```

- [ ] **Step 1: Rewrite failing form tests**

Assert the form contains only `categoryId`, `name`, `description`, and `totalQuantity`; rejects missing type/name and quantity below 1; and builds:

```ts
{ categoryId: 'cat-1', name: 'Royal Sofa', totalQuantity: 10 }
```

with no advanced keys.

- [ ] **Step 2: Write workflow tests**

Use injected async functions to prove:

1. no image calls only `createItem`;
2. an image calls create first and uploads using the returned ID;
3. create failure does not call upload and rejects;
4. upload failure resolves with the created item, `imageUploaded: false`, and a retry warning;
5. successful upload returns the updated item.

- [ ] **Step 3: Verify RED**

```bash
cd apps/BBS-FE
node --test lib/decoration/catalog-form.test.mjs lib/decoration/create-item-workflow.test.mjs
```

- [ ] **Step 4: Implement the minimal form and workflow**

Remove advanced types, parsing, and validation from `catalog-form.ts`. The workflow must never retry creation automatically after it has received a created item. Catch only upload errors and return:

```ts
{
  item: created,
  imageUploaded: false,
  warning: 'Item saved without its image. Use Camera / gallery on the item to retry.',
}
```

- [ ] **Step 5: Verify and commit**

```bash
node --test lib/decoration/catalog-form.test.mjs lib/decoration/create-item-workflow.test.mjs lib/decoration/catalog-images.test.mjs
npx tsc --noEmit
git diff --check
git add lib/decoration/catalog-form.ts lib/decoration/catalog-form.test.mjs lib/decoration/create-item-workflow.ts lib/decoration/create-item-workflow.test.mjs
git commit -m "refactor(decoration): simplify item form workflow"
```

### Task 3: Add Image Attachment to Add Item and Remove Advanced UI

**Files:**

- Modify: `apps/BBS-FE/components/decoration/settings/decoration-catalog-section.tsx`
- Test: `apps/BBS-FE/lib/decoration/catalog-images.test.mjs`

**Interfaces:**

- Consumes: the simplified form and create workflow from Task 2, existing `saveDecorationItem`, `uploadDecorationItemImage`, and `validateDecorationImageFile`.
- Produces: Add Item modal with optional image; Edit Item modal with only simple fields.

- [ ] **Step 1: Remove advanced modal state and controls**

Delete the `Advanced inventory and logistics` disclosure and all tracking, maintenance, units, logistics, buffer, and storage controls. Render only item name, total quantity, optional description, and—only for `value === 'new'`—an image picker.

- [ ] **Step 2: Add image preview and validation**

Store `File | null` in the new-item modal. Validate it with `validateDecorationImageFile(file, 0)` before submission. Show a local `URL.createObjectURL` preview, revoke the URL during replacement/unmount, and allow Remove before saving.

- [ ] **Step 3: Wire create-then-upload**

For a new item, call `createDecorationItemWithOptionalImage`. Disable close/save while processing. If upload succeeds, close and refresh with the returned updated item. If upload fails after creation, close the modal, refresh the item list, and display the workflow warning so the item-card Camera/Gallery action can retry.

For edit, call only `saveDecorationItem` using the simplified payload; existing image-card controls remain unchanged.

- [ ] **Step 4: Verify complete regression**

```bash
node --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: every decoration test passes; lint has no new errors; all 46 static routes build.

- [ ] **Step 5: Verify backend regression**

```bash
cd apps/BBS-BE
rg --files src/modules | rg 'decoration-.+\.spec\.ts$' | xargs -n 1 npx --no-install ts-node
npm run lint
npm run build
git diff --check
```

- [ ] **Step 6: Confirm database/migration scope and commit**

Confirm no schema or index file changed and no migration was added. Commit:

```bash
cd apps/BBS-FE
git add components/decoration/settings/decoration-catalog-section.tsx
git commit -m "feat(decoration): attach image while adding item"
```

## Plan Self-Review

- The backend public DTO, service defaults, frontend payload, modal fields, and image workflow all match the approved simplified design.
- Internal reservation/report schema fields are retained; no migration or banquet change is introduced.
- Image upload partial failure is explicit and cannot accidentally recreate the item.
- Every behavior change begins with a failing test and ends with focused plus full regression verification.
- No unresolved placeholder or dynamic-route requirement remains.
