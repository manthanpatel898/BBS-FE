import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pluginRequire = createRequire(require.resolve('@next/eslint-plugin-next'));
const { getRootDirs } = pluginRequire('./utils/get-root-dirs');

test('Next lint root discovery supports default, literal, brace and array directory patterns', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'bbs-lint-glob-'));
  try {
    for (const name of ['web', 'admin', '.hidden']) mkdirSync(path.join(root, name));
    writeFileSync(path.join(root, 'file.txt'), 'not a directory');
    // The rule consumes these with path.join + fs, so relative and absolute
    // spellings must resolve to the same directories (not identical strings).
    const roots = rootDir => getRootDirs({ cwd: root, settings: { next: { rootDir } } }).map(value => path.resolve(value)).sort();
    assert.deepEqual(roots(undefined), [root]);
    assert.deepEqual(roots(path.join(root, 'web')), [path.join(root, 'web')]);
    assert.deepEqual(roots(`${root}/{web,admin}`), [path.join(root, 'admin'), path.join(root, 'web')]);
    assert.deepEqual(roots([`${root}/web`, `${root}/admin`, null]), [path.join(root, 'admin'), path.join(root, 'web')]);
    assert.deepEqual(roots(`${root}/*`), [path.join(root, 'admin'), path.join(root, 'web')]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('Next lint glob dependency has no vulnerable braces parser', () => {
  const globRequire = createRequire(pluginRequire.resolve('fast-glob'));
  assert.throws(() => globRequire.resolve('braces'), { code: 'MODULE_NOT_FOUND' });
});
