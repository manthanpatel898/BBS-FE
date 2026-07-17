import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationActionClass } from './configuration-actions.ts';

test('configuration actions use explicit readable and focus-visible variants', () => {
  assert.match(configurationActionClass('edit'), /text-slate-900/);
  assert.match(configurationActionClass('edit'), /bg-white/);
  assert.match(configurationActionClass('deactivate'), /text-red-/);
  assert.match(configurationActionClass('deactivate'), /bg-red-/);
  assert.match(configurationActionClass('activate'), /text-white/);
  assert.match(configurationActionClass('activate'), /bg-emerald-/);
  assert.match(configurationActionClass('add'), /text-amber-/);
  for (const variant of ['edit', 'deactivate', 'activate', 'add']) {
    assert.match(configurationActionClass(variant), /focus-visible:ring/);
  }
});

test('disabled configuration actions remain visibly disabled and non-interactive', () => {
  const classes = configurationActionClass('edit', true);
  assert.match(classes, /cursor-not-allowed/);
  assert.match(classes, /opacity-/);
});
