import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDecorationSelectionPrice } from './selection-price.ts';

test('requires a finite non-negative final package price', () => {
  assert.match(validateDecorationSelectionPrice('', 0) ?? '', /required/i);
  assert.match(validateDecorationSelectionPrice('abc', 0) ?? '', /valid/i);
  assert.match(validateDecorationSelectionPrice('-1', 0) ?? '', /zero or greater/i);
});

test('prevents final price from falling below collected advances', () => {
  assert.match(validateDecorationSelectionPrice('999', 1000) ?? '', /already collected/i);
  assert.equal(validateDecorationSelectionPrice('1000', 1000), null);
  assert.equal(validateDecorationSelectionPrice('250000.50', 1000), null);
});
