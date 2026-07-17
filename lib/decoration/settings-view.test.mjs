import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDecorationSettingsTab,
  parseCompanyContactNumbers,
  validateCompanyProfile,
} from './settings-view.ts';

test('normalizes supported tabs and falls back to profile', () => {
  assert.equal(normalizeDecorationSettingsTab('events'), 'events');
  assert.equal(normalizeDecorationSettingsTab('venues'), 'venues');
  assert.equal(normalizeDecorationSettingsTab('unknown'), 'profile');
  assert.equal(normalizeDecorationSettingsTab(null), 'profile');
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
