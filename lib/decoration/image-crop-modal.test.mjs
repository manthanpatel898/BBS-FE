import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('crop modal passes the real React interaction suite', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--test', '--test-reporter=spec', 'lib/decoration/image-crop-modal.behavior.test.tsx'],
    { cwd: process.cwd(), encoding: 'utf8', env },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
