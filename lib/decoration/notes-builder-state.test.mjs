import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomNoteBlock,
  buildDecorationDraftPayload,
  buildDecorationFinalPayload,
  hydrateDecorationNotes,
  linkCatalogItem,
  moveDecorationNoteBlock,
  removeDecorationNoteBlock,
  selectCatalogNoteBlock,
  selectCatalogNoteImage,
  updateDecorationNoteBlock,
  validateDecorationNotesForFinalSave,
} from './notes-builder-state.ts';

const image = { key: 'decoration/r/events/b/custom/a.webp', url: 'https://cdn.example/a.webp' };
const snapshot = [{ itemId: null, itemName: 'Snapshot', quantity: 1, description: null, image, isCustom: true }];
const draft = { id: 'd', bookingId: 'b', restaurantId: 'r', revision: 3, generalNotes: 'Draft note', finalPackagePrice: '', blocks: [{ clientId: 'draft', position: 0, kind: 'CUSTOM', title: 'Draft', quantity: 0, description: '', image }] };

test('hydrates the newer draft and otherwise preserves historical snapshot order', () => {
  assert.equal(hydrateDecorationNotes(snapshot, draft).blocks[0].title, 'Draft');
  const state = hydrateDecorationNotes([...snapshot, { ...snapshot[0], itemName: 'Second' }], null);
  assert.deepEqual(state.blocks.map((block) => [block.title, block.position]), [['Snapshot', 0], ['Second', 1]]);
});

test('adds, updates, removes and moves blocks immutably', () => {
  const empty = hydrateDecorationNotes([], null);
  const first = addCustomNoteBlock(empty, image, 'one');
  const second = addCustomNoteBlock(first, image, 'two');
  assert.equal(first.blocks.length, 1);
  assert.equal(second.blocks[1].quantity, 1);
  const moved = moveDecorationNoteBlock(second, 'two', -1);
  assert.deepEqual(moved.blocks.map((block) => [block.clientId, block.position]), [['two', 0], ['one', 1]]);
  const updated = updateDecorationNoteBlock(moved, 'two', { title: 'Welcome' });
  assert.equal(moved.blocks[0].title, '');
  assert.equal(updated.blocks[0].title, 'Welcome');
  assert.deepEqual(removeDecorationNoteBlock(updated, 'one').blocks.map((block) => block.position), [0]);
});

test('links catalog metadata without losing user content and can unlink it', () => {
  const state = addCustomNoteBlock(hydrateDecorationNotes([], null), image, 'one');
  const edited = updateDecorationNoteBlock(state, 'one', { title: 'My title', description: 'My note' });
  const linked = linkCatalogItem(edited, 'one', { id: 'item', categoryId: 'cat', name: 'Sofa', images: [{ id: 'img', key: 'catalog/key', url: 'https://cdn.example/catalog.webp', isCover: true }] });
  assert.equal(linked.blocks[0].kind, 'CATALOG');
  assert.equal(linked.blocks[0].title, 'My title');
  assert.equal(linked.blocks[0].description, 'My note');
  const unlinked = linkCatalogItem(linked, 'one', null);
  assert.equal(unlinked.blocks[0].kind, 'CUSTOM');
  assert.equal(unlinked.blocks[0].title, 'My title');
});

test('adds one catalog note with cover image, defaults, and prevents duplicates', () => {
  const empty = hydrateDecorationNotes([], null);
  const item = {
    id: 'item',
    categoryId: 'cat',
    name: 'Royal Sofa',
    description: 'Gold finish',
    availableQuantity: 3,
    isActive: true,
    images: [
      { id: 'first', key: 'catalog/first', url: 'https://cdn.example/first.webp', isCover: false },
      { id: 'cover-image', key: 'catalog/cover', url: 'https://cdn.example/cover.webp', isCover: true },
    ],
  };

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

test('rejects unavailable or image-missing catalog notes', () => {
  const empty = hydrateDecorationNotes([], null);
  const base = {
    id: 'item',
    categoryId: 'cat',
    name: 'Royal Sofa',
    description: null,
    availableQuantity: 0,
    isActive: true,
    images: [{ id: 'cover', key: 'catalog/cover', url: 'https://cdn.example/cover.webp', isCover: true }],
  };
  assert.equal(selectCatalogNoteBlock(empty, base, 'one').added, false);
  assert.equal(
    selectCatalogNoteBlock(
      empty,
      { ...base, availableQuantity: 1, images: [] },
      'two',
    ).added,
    false,
  );
});

test('changes only the presentation image for a catalog note', () => {
  const empty = hydrateDecorationNotes([], null);
  const catalog = {
    id: 'item',
    categoryId: 'cat',
    name: 'Royal Sofa',
    description: null,
    availableQuantity: 3,
    isActive: true,
    images: [{ id: 'cover', key: 'catalog/cover', url: 'https://cdn.example/cover.webp', isCover: true }],
  };
  const selected = selectCatalogNoteBlock(empty, catalog, 'catalog-one').state;
  const alternate = {
    id: 'alternate',
    key: 'catalog/alternate',
    url: 'https://cdn.example/alternate.webp',
    isCover: false,
  };
  const next = selectCatalogNoteImage(selected, 'catalog-one', alternate);
  assert.equal(next.blocks[0].imageId, alternate.id);
  assert.equal(next.blocks[0].image.url, alternate.url);
  assert.equal(next.blocks[0].itemId, catalog.id);
  assert.equal(next.blocks[0].quantity, 1);
});

test('drafts permit incomplete edits but final payload requires title, image and positive quantity', () => {
  const state = addCustomNoteBlock(hydrateDecorationNotes([], null), image, 'one');
  assert.equal(buildDecorationDraftPayload(state).blocks[0].quantity, 1);
  assert.ok(validateDecorationNotesForFinalSave(state).blocks.one.includes('Title is required.'));
  const valid = updateDecorationNoteBlock(state, 'one', { title: 'Welcome', quantity: 2 });
  assert.deepEqual(validateDecorationNotesForFinalSave(valid), { blocks: {}, generalNotes: null });
  assert.equal(buildDecorationFinalPayload(valid).customItems[0].position, 0);
});
