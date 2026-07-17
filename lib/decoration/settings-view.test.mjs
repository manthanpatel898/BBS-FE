import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDecorationSettingsTab,
  parseCompanyContactNumbers,
  validateCompanyProfile,
  activeHalls,
  hasNormalizedDuplicate,
  buildEventTypeCreatePayload,
} from './settings-view.ts';

test('normalizes supported tabs and falls back to profile', () => {
  assert.equal(normalizeDecorationSettingsTab('events'), 'events');
  assert.equal(normalizeDecorationSettingsTab('venues'), 'venues');
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
