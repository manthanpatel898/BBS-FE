import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'app/(app)/decoration/reports/page.tsx',
  'app/(app)/decoration/reports/view/page.tsx',
  'app/(app)/decoration/reports/print/page.tsx',
];
const sources = files.map((file) => ({ file, source: readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8') }));

for (const { file, source } of sources) {
  assert.ok(source.includes('text-slate-950'), `${file} must establish a dark foreground`);
  assert.ok(!source.includes('text-slate-300'), `${file} must not use slate-300 for report content`);
  assert.ok(!source.includes('text-slate-400'), `${file} must not use slate-400 for report content`);
}

const view = sources.find(({ file }) => file.includes('/view/'))?.source ?? '';
for (const match of view.matchAll(/<(input|select|textarea)\b[^>]*className="([^"]*)"/g)) {
  assert.ok(match[2].includes('light-form-field'), `${match[1]} report control must use light-form-field`);
}
assert.ok((view.match(/light-form-field/g) ?? []).length >= 6, 'all filter and editor controls must use light-form-field');
