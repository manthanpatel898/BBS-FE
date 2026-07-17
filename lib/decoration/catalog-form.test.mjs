import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationItemPayload, validateDecorationCategoryForm, validateDecorationItemForm } from './catalog-form.ts';
const base = { categoryId: 'cat-1', name: ' Royal Sofa ', description: '', totalQuantity: '10' };
test('requires a decoration type name', () => assert.deepEqual(validateDecorationCategoryForm({ name: ' ', description: '' }), { name: 'Decoration type is required.' }));
test('requires item type name and positive whole quantity', () => {
  assert.match(validateDecorationItemForm({ ...base, categoryId: '' }).categoryId, /required/i);
  assert.match(validateDecorationItemForm({ ...base, name: ' ' }).name, /required/i);
  assert.match(validateDecorationItemForm({ ...base, totalQuantity: '0' }).totalQuantity, /positive/i);
  assert.match(validateDecorationItemForm({ ...base, totalQuantity: '1.5' }).totalQuantity, /whole/i);
});
test('builds only the simplified API fields', () => assert.deepEqual(buildDecorationItemPayload(base), { categoryId: 'cat-1', name: 'Royal Sofa', totalQuantity: 10 }));
test('includes trimmed optional description', () => assert.deepEqual(buildDecorationItemPayload({ ...base, description: ' Main stage ' }), { categoryId: 'cat-1', name: 'Royal Sofa', description: 'Main stage', totalQuantity: 10 }));
