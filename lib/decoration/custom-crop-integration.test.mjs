import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('custom crop portal is above selection and delegates focus/backdrop lifecycle to the shared modal', () => {
  const selection = readFileSync(new URL('../../components/decoration/decoration-selection-modal.tsx', import.meta.url), 'utf8');
  const crop = readFileSync(new URL('../../components/decoration/decoration-image-crop-modal.tsx', import.meta.url), 'utf8');
  assert.match(selection, /z-\[75\]/);
  assert.match(selection, /<CropModal file=\{pending\}/);
  assert.match(crop, /z-\[80\]/);
  assert.match(crop, /event\.target === event\.currentTarget/);
  assert.match(crop, /returnFocusRef\?\.current/);
  assert.match(crop, /queueMicrotask\(\(\) => returnFocusRef\?\.current\?\.focus\(\)\)/);
});

test('custom crop integration passes the real React interaction suites', () => {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--test', '--test-reporter=spec',
    'lib/decoration/custom-crop-integration.behavior.test.tsx',
    'lib/decoration/nested-modal-lifecycle.behavior.test.tsx',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_TEST_CONTEXT')),
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
