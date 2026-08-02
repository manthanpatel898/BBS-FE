import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../app/(app)/settings/page.tsx', import.meta.url), 'utf8');

test('banquet settings exposes independently controlled food schedule options', () => {
  assert.match(source, /'foodSchedule'/);
  assert.match(source, /Food Schedule/);
  assert.match(source, /Enable Welcome Drink Start Time/);
  assert.match(source, /Enable Main Course Start Time/);
  assert.match(source, /updateFoodServiceScheduleSettings/);
  assert.match(source, /canManageSettings/);
});
