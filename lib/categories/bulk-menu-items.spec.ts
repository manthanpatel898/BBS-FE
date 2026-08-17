import assert from 'node:assert/strict';
import {
  buildBulkItemPreview,
  parseBulkItemText,
} from './bulk-menu-items';

const parsed = parseBulkItemText('Item Name\nPaneer Tikka\nveg manchurian\nPaneer Tikka\n\nSpring Roll');
assert.deepEqual(parsed, ['Paneer Tikka', 'veg manchurian', 'Spring Roll']);

const preview = buildBulkItemPreview(
  ['Paneer Tikka', 'Veg Manchurian', 'Spring Roll', 'spring roll'],
  ['paneer tikka'],
);
assert.deepEqual(preview.itemsToAdd, ['Veg Manchurian', 'Spring Roll']);
assert.deepEqual(preview.duplicates, ['Paneer Tikka', 'spring roll']);
assert.equal(preview.blankCount, 0);

const withBlanks = buildBulkItemPreview(['', '  ', 'Khaman'], []);
assert.deepEqual(withBlanks.itemsToAdd, ['Khaman']);
assert.equal(withBlanks.blankCount, 2);
