import { strict as assert } from 'node:assert';
import { readDashboardView, saveDashboardView } from './dashboard-preference';

const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
assert.equal(readDashboardView(storage, 'alice', 'venue-a'), 'current');
saveDashboardView(storage, 'alice', 'venue-a', 'new');
assert.equal(readDashboardView(storage, 'alice', 'venue-a'), 'new');
assert.equal(readDashboardView(storage, 'bob', 'venue-a'), 'current');
assert.equal(readDashboardView(storage, 'alice', 'venue-b'), 'current');
saveDashboardView(storage, 'alice', 'venue-a', 'current');
assert.equal(readDashboardView(storage, 'alice', 'venue-a'), 'current');
const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
assert.equal(readDashboardView(blocked, 'alice', 'venue-a'), 'current');
assert.doesNotThrow(() => saveDashboardView(blocked, 'alice', 'venue-a', 'new'));
assert.equal(readDashboardView({ getItem: () => 'unexpected' }, 'alice', 'venue-a'), 'current');
console.log('Dashboard preference tests passed');
