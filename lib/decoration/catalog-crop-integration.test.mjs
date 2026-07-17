import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('catalog crop integration passes the real React interaction suite', () => {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--test', '--test-reporter=spec',
    'lib/decoration/catalog-crop-integration.behavior.test.tsx',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_TEST_CONTEXT')),
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
