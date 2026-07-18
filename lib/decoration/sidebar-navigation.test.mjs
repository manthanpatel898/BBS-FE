import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('decoration sidebar omits catalog and import while direct routes remain protected', async () => {
  const [layout, routes] = await Promise.all([
    readFile(new URL('../../components/layouts/app-layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../auth/business-routes.ts', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(layout, /Decoration Catalog/);
  assert.doesNotMatch(layout, /Import Data/);
  assert.doesNotMatch(layout, /canViewCatalog|canImport/);
  assert.match(routes, /\['\/decoration\/catalog', 'decoration\.catalog\.view'\]/);
  assert.match(routes, /\['\/decoration\/import', 'decoration\.import\.manage'\]/);
});
