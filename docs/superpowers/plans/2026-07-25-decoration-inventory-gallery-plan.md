# Decoration Inventory Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the name-only inventory linker with a searchable, image-first, availability-aware gallery while preserving the custom photo-note workflow.

**Architecture:** Add pure catalog-selection and gallery-filtering functions under `lib/decoration`, then build two focused nested modals: an inventory gallery and an alternate-image picker. The existing notes modal remains the coordinator and continues using the current draft/final payloads, availability API, autosave controller, and backend final validation.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node test runner, Testing Library.

## Global Constraints

- Only the event-decoration notes-selection flow may change.
- Do not modify banquet APIs, screens, permissions, or booking behaviour.
- Existing catalog, availability, draft, reservation, and snapshot contracts remain backward compatible.
- Do not add a database migration or new dependency.
- Inventory without a valid image remains visible but cannot be selected.
- Unavailable inventory remains visible but cannot be selected.
- Every catalog note starts with quantity `1` and the configured cover image.
- The backend remains authoritative for final availability validation.
- Mobile is the first-priority layout; no horizontal page scrolling is permitted.
- Every completed task must pass its focused tests before commit.

---

## File Structure

### Create

- `lib/decoration/inventory-gallery.ts` — pure filtering, cover-image, disabled-reason, and quantity-limit helpers.
- `lib/decoration/inventory-gallery.test.mjs` — pure gallery behaviour tests.
- `components/decoration/decoration-inventory-gallery-modal.tsx` — searchable category-filtered image gallery.
- `components/decoration/decoration-inventory-image-picker.tsx` — alternate configured-image picker for a selected catalog note.
- `lib/decoration/inventory-gallery-view.test.mjs` — source-level responsive/accessibility contract.
- `lib/decoration/inventory-gallery-integration.behavior.test.tsx` — real React selection, focus, duplicate, and image-change tests.

### Modify

- `lib/decoration/notes-builder-state.ts` — add catalog-note selection and presentation-image transitions.
- `lib/decoration/notes-builder-state.test.mjs` — cover new immutable transitions and payload preservation.
- `components/decoration/decoration-note-block-editor.tsx` — replace dropdown with read-only catalog identity and Change image.
- `components/decoration/decoration-selection-modal.tsx` — expose the two approved actions and coordinate nested modals.
- `lib/decoration/notes-builder-view.test.mjs` — assert the approved two-path UI and removal of the linker.
- `lib/decoration/custom-crop-integration.behavior.test.tsx` — retain custom photo/crop regression coverage with new button copy.
- `lib/decoration/custom-crop-integration.test.mjs` — retain modal-layering source assertions.

### Delete

- `components/decoration/decoration-inventory-linker.tsx` — obsolete name-only dropdown.

---

### Task 1: Pure Inventory Gallery and Catalog-Note State

**Files:**
- Create: `lib/decoration/inventory-gallery.ts`
- Create: `lib/decoration/inventory-gallery.test.mjs`
- Modify: `lib/decoration/notes-builder-state.ts`
- Modify: `lib/decoration/notes-builder-state.test.mjs`

**Interfaces:**
- Produces:
  - `filterInventoryItems(items, categories, query, categoryId): DecorationItem[]`
  - `getInventoryCoverImage(item): DecorationItem['images'][number] | null`
  - `getInventoryDisabledReason(item): 'Not available' | 'Image required' | null`
  - `selectCatalogNoteBlock(state, item, clientId?): { state: DecorationNotesState; selectedClientId: string; added: boolean }`
  - `selectCatalogNoteImage(state, clientId, image): DecorationNotesState`

- [ ] **Step 1: Write failing gallery-domain tests**

Add tests proving search is case-insensitive, category filters use IDs, inactive items are removed, availability does not affect visibility, cover images win over the first image, and disabled reasons are deterministic:

```js
test('filters active inventory by name and category without hiding unavailable items', () => {
  const result = filterInventoryItems(items, categories, 'royal', 'sofa');
  assert.deepEqual(result.map((item) => item.id), ['royal-sofa']);
  assert.equal(getInventoryDisabledReason({ ...items[0], availableQuantity: 0 }), 'Not available');
});

test('requires an image and prefers the configured cover', () => {
  assert.equal(getInventoryDisabledReason({ ...items[0], images: [] }), 'Image required');
  assert.equal(getInventoryCoverImage(items[0])?.id, 'cover-image');
});
```

- [ ] **Step 2: Write failing catalog-note transition tests**

```js
test('adds one catalog note with cover image, defaults, and prevents duplicates', () => {
  const first = selectCatalogNoteBlock(empty, item, 'catalog-one');
  assert.equal(first.added, true);
  assert.equal(first.state.blocks[0].quantity, 1);
  assert.equal(first.state.blocks[0].title, item.name);
  assert.equal(first.state.blocks[0].description, item.description);
  assert.equal(first.state.blocks[0].imageId, 'cover-image');

  const duplicate = selectCatalogNoteBlock(first.state, item, 'ignored');
  assert.equal(duplicate.added, false);
  assert.equal(duplicate.selectedClientId, 'catalog-one');
  assert.equal(duplicate.state, first.state);
});

test('changes only the presentation image for a catalog note', () => {
  const next = selectCatalogNoteImage(state, 'catalog-one', alternateImage);
  assert.equal(next.blocks[0].imageId, alternateImage.id);
  assert.equal(next.blocks[0].itemId, item.id);
  assert.equal(next.blocks[0].quantity, 1);
});
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery.test.mjs lib/decoration/notes-builder-state.test.mjs
```

Expected: FAIL because the five new pure functions do not exist.

- [ ] **Step 4: Implement the minimal pure functions**

Use immutable transitions and preserve current draft/final payload shapes:

```ts
export function selectCatalogNoteBlock(
  state: DecorationNotesState,
  item: DecorationItem,
  clientId = crypto.randomUUID(),
) {
  const existing = state.blocks.find((block) => block.itemId === item.id);
  if (existing) {
    return { state, selectedClientId: existing.clientId, added: false };
  }
  const image = getInventoryCoverImage(item);
  if (!image || getInventoryDisabledReason(item)) {
    return { state, selectedClientId: '', added: false };
  }
  const block: DecorationNoteBlock = {
    clientId,
    position: state.blocks.length,
    kind: 'CATALOG',
    itemId: item.id,
    categoryId: item.categoryId,
    imageId: image.id,
    title: item.name,
    quantity: 1,
    description: item.description ?? '',
    image: { key: image.key ?? '', url: image.url },
  };
  return {
    state: { ...state, blocks: [...state.blocks, block] },
    selectedClientId: clientId,
    added: true,
  };
}
```

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery.test.mjs lib/decoration/notes-builder-state.test.mjs
```

Expected: all tests PASS.

Commit:

```bash
git add lib/decoration/inventory-gallery.ts lib/decoration/inventory-gallery.test.mjs lib/decoration/notes-builder-state.ts lib/decoration/notes-builder-state.test.mjs
git commit -m "feat(decoration): model visual inventory selection"
```

---

### Task 2: Mobile Inventory Gallery Modal

**Files:**
- Create: `components/decoration/decoration-inventory-gallery-modal.tsx`
- Create: `lib/decoration/inventory-gallery-view.test.mjs`

**Interfaces:**
- Consumes: the Task 1 gallery helpers.
- Produces:

```ts
type DecorationInventoryGalleryModalProps = {
  categories: DecorationCategory[];
  items: DecorationItem[];
  selectedItemIds: Set<string>;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSelect: (item: DecorationItem) => void;
  onClose: () => void;
};
```

- [ ] **Step 1: Write a failing source contract**

Assert that the new component contains:

```js
assert.match(source, /Browse Existing Inventory/);
assert.match(source, /Search inventory/);
assert.match(source, /All/);
assert.match(source, /available/);
assert.match(source, /Not available/);
assert.match(source, /Image required/);
assert.match(source, /grid-cols-1/);
assert.match(source, /min-\[390px\]:grid-cols-2/);
assert.match(source, /overflow-y-auto/);
assert.match(source, /returnFocusRef/);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery-view.test.mjs
```

Expected: FAIL because the gallery component is missing.

- [ ] **Step 3: Implement the gallery**

The popup must:

- use `BodyPortal`;
- render above the parent at `z-[80]`;
- use `useModalViewport(onClose, false)`;
- autofocus the search field;
- expose category chips with `aria-pressed`;
- use `filterInventoryItems`;
- use cover images with an `onError` fallback;
- disable unavailable and image-missing cards;
- label existing selections **Already selected** while keeping them tappable so the parent can focus the existing note;
- call `onSelect(item)` only for selectable items;
- restore focus to `returnFocusRef` after closing;
- render a clear empty state for unmatched searches.

Card content:

```tsx
<button
  aria-label={`${item.name}, ${categoryName}, ${status}`}
  disabled={Boolean(disabledReason)}
>
  <img src={cover.url} alt={item.name} />
  <strong>{item.name}</strong>
  <span>{categoryName}</span>
  <span>{status}</span>
</button>
```

- [ ] **Step 4: Run the source test and commit**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery-view.test.mjs
```

Expected: PASS.

Commit:

```bash
git add components/decoration/decoration-inventory-gallery-modal.tsx lib/decoration/inventory-gallery-view.test.mjs
git commit -m "feat(decoration): add visual inventory gallery"
```

---

### Task 3: Catalog Identity and Alternate-Image Picker

**Files:**
- Create: `components/decoration/decoration-inventory-image-picker.tsx`
- Modify: `components/decoration/decoration-note-block-editor.tsx`
- Delete: `components/decoration/decoration-inventory-linker.tsx`
- Modify: `lib/decoration/inventory-gallery-view.test.mjs`

**Interfaces:**
- Consumes: `selectCatalogNoteImage` through an `onImageChange` callback.
- Produces editor props:

```ts
catalogItem?: DecorationItem;
onImageChange: (image: DecorationItem['images'][number]) => void;
```

- [ ] **Step 1: Extend the failing source contract**

```js
assert.doesNotMatch(editor, /Link inventory item \(optional\)/);
assert.match(editor, /Catalog item/);
assert.match(editor, /Change image/);
assert.match(picker, /Choose presentation image/);
assert.match(picker, /aria-pressed/);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery-view.test.mjs
```

Expected: FAIL because the editor still imports the dropdown and the picker is absent.

- [ ] **Step 3: Implement read-only catalog identity**

For catalog blocks, show:

- **Catalog item** badge;
- category name and item name;
- live `availableQuantity`;
- **Change image** only when `catalogItem.images.length > 1`.

For custom blocks, show **Custom item**. Do not expose a catalog dropdown.

Quantity commits must reject values above `catalogItem.availableQuantity`; display:

```tsx
{quantityExceeded ? (
  <p className="text-xs font-semibold text-red-600">
    Only {catalogItem.availableQuantity} available for this event.
  </p>
) : null}
```

- [ ] **Step 4: Implement the alternate-image picker**

The picker:

- uses only the selected item’s configured images;
- marks the current `imageId` with `aria-pressed="true"`;
- uses `z-[85]`;
- calls `onSelect(image)` and closes;
- restores focus to **Change image**;
- uses a responsive one/two/three-column image grid;
- has broken-image fallbacks.

- [ ] **Step 5: Delete the dropdown, run tests, and commit**

Run:

```bash
node --import tsx --test lib/decoration/inventory-gallery-view.test.mjs lib/decoration/notes-builder-state.test.mjs
```

Expected: PASS.

Commit:

```bash
git add components/decoration/decoration-note-block-editor.tsx components/decoration/decoration-inventory-image-picker.tsx components/decoration/decoration-inventory-linker.tsx lib/decoration/inventory-gallery-view.test.mjs
git commit -m "feat(decoration): make catalog notes image first"
```

---

### Task 4: Integrate Both Selection Paths

**Files:**
- Modify: `components/decoration/decoration-selection-modal.tsx`
- Modify: `lib/decoration/notes-builder-view.test.mjs`
- Create: `lib/decoration/inventory-gallery-integration.behavior.test.tsx`
- Modify: `lib/decoration/custom-crop-integration.behavior.test.tsx`
- Modify: `lib/decoration/custom-crop-integration.test.mjs`

**Interfaces:**
- Consumes:
  - `DecorationInventoryGalleryModal`
  - `selectCatalogNoteBlock`
  - `selectCatalogNoteImage`
- Maintains existing `change()` autosave semantics for every selection.

- [ ] **Step 1: Write failing workflow tests**

Source assertions:

```js
assert.match(modal, /Browse Existing Inventory/);
assert.match(modal, /Add Custom Photo Note/);
assert.doesNotMatch(modal, />\+ Add Photo Note</);
```

React behaviour must prove:

1. Browse opens the gallery.
2. Search and category filters reduce visible cards.
3. Unavailable and image-missing cards cannot call `onSelect`.
4. Selecting inventory adds one quantity-one note with the cover image.
5. Tapping an **Already selected** item focuses its existing note without duplicating it.
6. Change image updates the preview and final `imageId`.
7. Closing nested modals restores focus.
8. Custom upload and crop still add a custom note.
9. Draft autosave receives catalog metadata after selection.

- [ ] **Step 2: Run workflow tests and verify RED**

Run:

```bash
node --import tsx --test lib/decoration/notes-builder-view.test.mjs lib/decoration/inventory-gallery-integration.behavior.test.tsx lib/decoration/custom-crop-integration.test.mjs
```

Expected: FAIL because the parent modal has not integrated the gallery.

- [ ] **Step 3: Integrate categories and gallery state**

Keep categories returned by the existing initial `Promise.all`:

```ts
const [categories, setCategories] = useState<DecorationCategory[]>([]);
const [galleryOpen, setGalleryOpen] = useState(false);
const browseInventoryRef = useRef<HTMLButtonElement>(null);

// On initial load
setCategories(nextCategories);
setItems(applyDecorationAvailability(catalog, availability));
```

Render the two approved actions before selected notes:

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  <button ref={browseInventoryRef} onClick={() => setGalleryOpen(true)}>
    Browse Existing Inventory
  </button>
  <button ref={customPhotoRef} onClick={() => fileInputRef.current?.click()}>
    Add Custom Photo Note
  </button>
</div>
```

- [ ] **Step 4: Integrate selection and focus**

On gallery selection:

```ts
function selectInventory(item: DecorationItem) {
  let targetId = '';
  change((current) => {
    const result = selectCatalogNoteBlock(current, item);
    targetId = result.selectedClientId;
    return result.state;
  });
  setGalleryOpen(false);
  queueMicrotask(() =>
    document.querySelector<HTMLElement>(`[data-note-id="${targetId}"]`)?.focus(),
  );
}
```

Do not increment the autosave change counter when a duplicate produces the identical state. Adjust `change` to compare `nextState === current`.

- [ ] **Step 5: Run focused integration tests and commit**

Run:

```bash
node --import tsx --test lib/decoration/notes-builder-view.test.mjs lib/decoration/inventory-gallery-integration.behavior.test.tsx lib/decoration/custom-crop-integration.test.mjs
```

Expected: PASS.

Commit:

```bash
git add components/decoration/decoration-selection-modal.tsx lib/decoration/notes-builder-view.test.mjs lib/decoration/inventory-gallery-integration.behavior.test.tsx lib/decoration/custom-crop-integration.behavior.test.tsx lib/decoration/custom-crop-integration.test.mjs
git commit -m "feat(decoration): integrate inventory gallery notes"
```

---

### Task 5: Release Regression and Static Deployment

**Files:**
- Modify: `docs/superpowers/plans/2026-07-25-decoration-inventory-gallery-plan.md`

**Interfaces:**
- Validates the completed feature without changing backend or banquet behaviour.

- [ ] **Step 1: Run every decoration and booking-isolation frontend test**

Run:

```bash
node --import tsx --test --test-reporter=dot \
  lib/decoration/*.test.mjs \
  lib/decoration/inventory-gallery-integration.behavior.test.tsx \
  lib/bookings/*.test.mjs \
  lib/auth/business-routes.test.mjs \
  lib/employees/*.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run frontend release checks**

Run:

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

Expected:

- lint has zero errors;
- all routes are generated as static pages;
- audit reports zero moderate-or-higher vulnerabilities.

Restore `next-env.d.ts` if the build rewrites its generated route reference:

```bash
git restore next-env.d.ts
```

- [ ] **Step 3: Inspect backend and banquet isolation**

Run:

```bash
git -C ../BBS-BE status --short
git diff --check
rg -n "DecorationInventoryGallery|Browse Existing Inventory|Add Custom Photo Note" components lib
rg -n "Link inventory item \\(optional\\)" components lib
```

Expected:

- backend working tree is unchanged by this feature;
- no whitespace errors;
- new gallery references exist only in decoration frontend code;
- the obsolete dropdown copy has no production matches.

- [ ] **Step 4: Mark the checklist and commit**

Change every verified checkbox in this plan to `[x]`, then run:

```bash
git add docs/superpowers/plans/2026-07-25-decoration-inventory-gallery-plan.md
git commit -m "docs(decoration): complete inventory gallery checklist"
git status --short
```

Expected: clean frontend and backend working trees.
