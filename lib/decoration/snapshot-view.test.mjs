import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupSnapshotByCategory,
  safeSnapshotImage,
  snapshotItemKey,
  orderedSnapshotGroups,
} from './snapshot-view.ts';

test('groups immutable snapshot lines without changing their order', () => {
  const lines = [
    { itemName: 'Sofa 1', categoryName: 'Sofa' },
    { itemName: 'Gate 1', categoryName: 'Entrance' },
    { itemName: 'Sofa 2', categoryName: 'Sofa' },
  ];
  const groups = groupSnapshotByCategory(lines);
  assert.deepEqual([...groups.keys()], ['Sofa', 'Entrance']);
  assert.deepEqual(groups.get('Sofa')?.map((line) => line.itemName), ['Sofa 1', 'Sofa 2']);
});

test('preserves explicit position order and separated category runs', () => {
  const groups = orderedSnapshotGroups([
    { itemName: 'Sofa', categoryName: 'Sofa', position: 1 },
    { itemName: 'Welcome', categoryName: 'Custom', position: 0 },
    { itemName: 'Sign', categoryName: 'Custom', position: 2 },
  ]);
  assert.deepEqual(
    groups.map((group) => [group.category, group.items.map((line) => line.itemName)]),
    [['Custom', ['Welcome']], ['Sofa', ['Sofa']], ['Custom', ['Sign']]],
  );
});

test('uses a safe null state when a historical image is unavailable', () => {
  assert.equal(safeSnapshotImage(null), null);
  assert.equal(safeSnapshotImage({ url: '' }), null);
  assert.equal(safeSnapshotImage({ url: 'javascript:alert(1)' }), null);
  assert.equal(safeSnapshotImage({ url: '/relative/image.png' }), null);
  assert.equal(safeSnapshotImage({ url: 'https://example.com/image.webp' }), 'https://example.com/image.webp');
});

test('groups blank categories under a stable fallback category', () => {
  const groups = groupSnapshotByCategory([
    { itemName: 'Flower Pot', categoryName: '   ' },
    { itemName: 'Welcome Board' },
  ]);
  assert.deepEqual([...groups.keys()], ['Other Decoration']);
  assert.equal(groups.get('Other Decoration')?.length, 2);
});

test('creates stable unique keys for catalog and custom snapshot lines', () => {
  assert.equal(snapshotItemKey({ itemId: 'item-1', itemName: 'Sofa' }, 0), 'item-1-0');
  assert.equal(snapshotItemKey({ itemId: null, itemName: 'Custom Gate' }, 3), 'custom-gate-3');
});
