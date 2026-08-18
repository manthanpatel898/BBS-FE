import assert from 'node:assert/strict';
import { removeItemsAtIndexes } from './bulk-delete-menu-items';

assert.deepEqual(
  removeItemsAtIndexes(['Paneer Tikka', 'Samosa', 'Paneer Tikka', 'Spring Roll'], [0, 2]),
  ['Samosa', 'Spring Roll'],
);
assert.deepEqual(removeItemsAtIndexes(['A', 'B', 'C'], []), ['A', 'B', 'C']);
assert.deepEqual(removeItemsAtIndexes(['A', 'B', 'C'], [1, 1, 99, -1]), ['A', 'C']);
