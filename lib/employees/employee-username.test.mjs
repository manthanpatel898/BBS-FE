import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeUsernameInput,
  shouldAutoGenerateUsername,
} from './employee-username.ts';

test('normalizes a typed username without changing supported separators', () => {
  assert.equal(normalizeUsernameInput(' MGM.Manthan_2 '), 'mgm.manthan_2');
  assert.equal(normalizeUsernameInput('Élodie  Patel'), 'elodie.patel');
});

test('auto generation is limited to new untouched forms', () => {
  assert.equal(
    shouldAutoGenerateUsername({ editing: false, mode: 'auto' }),
    true,
  );
  assert.equal(
    shouldAutoGenerateUsername({ editing: true, mode: 'auto' }),
    false,
  );
  assert.equal(
    shouldAutoGenerateUsername({ editing: false, mode: 'manual' }),
    false,
  );
});
