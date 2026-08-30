import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseBulkSubitems } from './bulk-subitems';

test('parses one trimmed subitem per non-empty line', () => {
  const result = parseBulkSubitems(' Mango Juice \n\nOrange Juice\n Watermelon Juice ', []);

  assert.deepEqual(result.accepted, ['Mango Juice', 'Orange Juice', 'Watermelon Juice']);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.existing, []);
});

test('reports case-insensitive duplicates and existing subitems without adding them', () => {
  const result = parseBulkSubitems(
    'Mango Juice\nmango juice\nORANGE JUICE\nPineapple Juice',
    ['Orange Juice'],
  );

  assert.deepEqual(result.accepted, ['Mango Juice', 'Pineapple Juice']);
  assert.deepEqual(result.duplicates, ['mango juice']);
  assert.deepEqual(result.existing, ['ORANGE JUICE']);
});
