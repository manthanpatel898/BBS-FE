import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentPaths = [
  new URL('../../components/decoration/decoration-selection-item-card.tsx', import.meta.url),
  new URL('../../components/decoration/decoration-custom-item-editor.tsx', import.meta.url),
];

test('decoration selection controls use explicit readable colors', async () => {
  for (const componentPath of componentPaths) {
    const source = await readFile(componentPath, 'utf8');

    assert.match(source, /bg-white/);
    assert.match(source, /text-slate-950/);
    assert.match(source, /placeholder:text-slate-400/);
    assert.match(source, /disabled:text-slate-500/);
  }
});
