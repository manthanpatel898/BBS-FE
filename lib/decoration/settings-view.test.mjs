import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDecorationSettingsTab,
  parseCompanyContactNumbers,
  validateCompanyProfile,
  activeHalls,
  hasNormalizedDuplicate,
  buildEventTypeCreatePayload,
  childrenForParent,
  decorationLocationTypeLabel,
  decorationPreviewImages,
  reconcileSelectedParentId,
} from './settings-view.ts';

test('normalizes supported tabs and falls back to profile', () => {
  assert.equal(normalizeDecorationSettingsTab('events'), 'events');
  assert.equal(normalizeDecorationSettingsTab('venues'), 'venues');
  assert.equal(normalizeDecorationSettingsTab('decoration'), 'decoration');
  assert.equal(normalizeDecorationSettingsTab('unknown'), 'profile');
  assert.equal(normalizeDecorationSettingsTab(null), 'profile');
});

test('filters halls to active children of the selected location', () => {
  const venues = [{ id: 'hotel-1', halls: [{ id: 'hall-1', isActive: true }, { id: 'hall-2', isActive: false }] }];
  assert.deepEqual(activeHalls(venues, 'hotel-1').map((hall) => hall.id), ['hall-1']);
  assert.deepEqual(activeHalls(venues, 'missing'), []);
});

test('normalizes whitespace and case before duplicate checks', () => {
  assert.equal(hasNormalizedDuplicate([{ name: 'Grand Hall' }], ' grand  hall '), true);
  assert.equal(hasNormalizedDuplicate([{ name: 'Grand Hall' }], 'Garden'), false);
});

test('normalizes comma and newline separated contact numbers', () => {
  assert.deepEqual(parseCompanyContactNumbers('9876543210, 9123456789\n9876543210'), ['9876543210', '9123456789']);
});

test('requires company name and at least one valid contact number', () => {
  assert.deepEqual(validateCompanyProfile({ name: '', contactNumbers: '' }), {
    name: 'Company name is required',
    contactNumbers: 'Add at least one contact number',
  });
  assert.deepEqual(validateCompanyProfile({ name: 'Decor Co', contactNumbers: '123' }), {
    contactNumbers: 'Contact numbers must contain 10 digits',
  });
});

test('event type creation leaves display order to the server', () => {
  assert.deepEqual(buildEventTypeCreatePayload({ name: '  Marriage  ', displayOrder: '99' }), { name: 'Marriage' });
});

test('reconciles selected parent and scopes children without mutation', () => {
  const parents = [{ id: 'a' }, { id: 'b' }];
  const items = [{ id: '1', categoryId: 'a' }, { id: '2', categoryId: 'b' }];
  assert.equal(reconcileSelectedParentId('b', parents), 'b');
  assert.equal(reconcileSelectedParentId('missing', parents), '');
  assert.deepEqual(childrenForParent(items, 'a'), [items[0]]);
  assert.equal(items.length, 2);
});

test('builds unique bounded previews and professional location labels', () => {
  const items = [{ images: [{ url: 'one' }, { url: 'two' }] }, { images: [{ url: 'one' }, { url: 'three' }] }];
  assert.deepEqual(decorationPreviewImages(items, 2), ['one', 'two']);
  assert.equal(decorationLocationTypeLabel('HOTEL'), 'Banquet');
  assert.equal(decorationLocationTypeLabel('VENUE'), 'Outdoor Venue');
});
