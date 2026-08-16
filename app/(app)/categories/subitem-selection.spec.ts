import * as assert from 'node:assert/strict';

async function main() {
  const pageModule = (await import('./page')) as Record<string, unknown>;
  const toggleAllVisibleSubitems = pageModule.toggleAllVisibleSubitems;

  assert.equal(
    typeof toggleAllVisibleSubitems,
    'function',
    'The category editor must expose section-level Select all/Clear all behavior.',
  );

  const toggle = toggleAllVisibleSubitems as (
    selectedItems: string[],
    availableItems: string[],
  ) => string[];
  const availableItems = ['ITALIAN TOMATO', 'MINESTRONE', 'MANCHOW'];

  assert.deepEqual(
    toggle(['MINESTRONE'], availableItems),
    availableItems,
    'Select all must select every available subitem in canonical menu order.',
  );
  assert.deepEqual(
    toggle(availableItems, availableItems),
    [],
    'Clear all must remove every selected subitem when the complete section is selected.',
  );
}

void main();
