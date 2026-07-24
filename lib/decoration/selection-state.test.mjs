import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationSelectionPayload, hydrateDecorationSelection, selectionSummary, toggleDecorationChoice, updateDecorationChoice, validateDecorationSelection } from './selection-state.ts';

const item = (id, categoryId = 'sofa', availableQuantity = 5) => ({ id, categoryId, name: id, availableQuantity, images: [{ id: `${id}-image`, url: `${id}.webp`, isCover: true }] });
test('keeps multiple items from one type and preserves them across filtering', () => {
  let state = hydrateDecorationSelection([], [item('red'), item('white')]);
  state = toggleDecorationChoice(state, item('red'));
  state = toggleDecorationChoice(state, item('white'));
  assert.deepEqual(Object.keys(state.choices), ['red', 'white']);
  assert.deepEqual(selectionSummary(state), { lineCount: 2, totalQuantity: 2 });
});
test('updates each selected item independently', () => {
  let state = toggleDecorationChoice(hydrateDecorationSelection([], [item('red'), item('white')]), item('red'));
  state = toggleDecorationChoice(state, item('white'));
  state = updateDecorationChoice(state, 'red', { quantity: 3, description: 'Gold cushions' });
  assert.equal(state.choices.red.quantity, 3);
  assert.equal(state.choices.white.quantity, 1);
});
test('hydrates configured and custom snapshot lines', () => {
  const state = hydrateDecorationSelection([{ itemId: 'red', itemName: 'Red', quantity: 2, description: 'A', image: { url: 'red.webp' }, isCustom: false }, { itemId: null, itemName: 'Flower arch', quantity: 1, description: null, image: { key: 'k', url: 'u' }, isCustom: true }], [item('red')]);
  assert.equal(state.choices.red.quantity, 2);
  assert.equal(state.customItems[0].name, 'Flower arch');
});
test('validates availability and required custom fields', () => {
  let state = toggleDecorationChoice(hydrateDecorationSelection([], [item('red', 'sofa', 2)]), item('red', 'sofa', 2));
  state = updateDecorationChoice(state, 'red', { quantity: 3 });
  state.customItems.push({ clientId: 'c', name: '', quantity: 0, description: '', imageKey: '', imageUrl: '' });
  const errors = validateDecorationSelection(state, [item('red', 'sofa', 2)]);
  assert.match(errors.choices.red, /2 available/i);
  assert.ok(errors.custom.c.length >= 3);
});
test('normalizes payload without empty optional descriptions', () => {
  let state = toggleDecorationChoice(hydrateDecorationSelection([], [item('red')]), item('red'));
  state.customItems.push({ clientId: 'c', name: ' Arch ', quantity: 1, description: ' ', imageKey: 'k', imageUrl: 'u' });
  assert.deepEqual(buildDecorationSelectionPayload(state), { items: [{ itemId: 'red', quantity: 1, imageId: 'red-image' }], customItems: [{ name: 'Arch', quantity: 1, position: 0, imageKey: 'k', imageUrl: 'u' }] });
});
