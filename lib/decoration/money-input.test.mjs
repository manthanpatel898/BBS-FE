import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDecorationMoneyInput } from '../../components/decoration/decoration-money-input.tsx';

test('normalizes event amount input without browser number stepping', () => {
  assert.equal(normalizeDecorationMoneyInput('₹12,500.75'), '12500.75');
  assert.equal(normalizeDecorationMoneyInput('100.999'), '100.99');
  assert.equal(normalizeDecorationMoneyInput('abc'), '');
});
