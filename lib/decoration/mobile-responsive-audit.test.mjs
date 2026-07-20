import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const lightFormFiles = [
  'components/decoration/decoration-inquiry-form.tsx',
  'components/decoration/decoration-confirmation-modal.tsx',
  'components/decoration/decoration-payment-modal.tsx',
  'components/decoration/decoration-followup-modal.tsx',
  'components/decoration/settings/company-profile-section.tsx',
  'components/decoration/settings/decoration-catalog-section.tsx',
  'components/decoration/settings/configuration-modal.tsx',
  'app/(app)/employees/page.tsx',
  'app/(app)/audit-logs/page.tsx',
];

for (const file of lightFormFiles) {
  const source = read(file);
  assert.ok(source.includes('light-form-field') || source.includes('decoration-light-field'), `${file} must opt light-surface controls out of the global dark form theme`);
}

const modal = read('components/ui/common-modal.tsx');
assert.ok(modal.includes('text-slate-950'), 'CommonModal must establish a readable light-surface foreground');
assert.ok(modal.includes('text-slate-600'), 'CommonModal descriptions must use readable secondary text');

const audit = read('app/(app)/audit-logs/page.tsx');
assert.ok(audit.includes('md:hidden'), 'Audit Logs must render mobile cards');
assert.ok(audit.includes('hidden md:block'), 'Audit Logs must retain a desktop/tablet table');

const detail = read('components/decoration/decoration-event-detail-modal.tsx');
assert.ok(detail.includes('flex-col') || detail.includes('flex-wrap'), 'Event Detail header must wrap on narrow screens');
assert.ok(!detail.includes('gap-14'), 'Event Detail must not reserve a fixed oversized mobile header gap');

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    const target = join(path, name);
    return statSync(target).isDirectory() ? [target, ...walk(target)] : [];
  });
}
const routeRoot = new URL('../../app/(app)/decoration', import.meta.url).pathname;
assert.deepEqual(walk(routeRoot).filter((path) => /\[[^\]]+\]/.test(path)), [], 'Decoration routes must not use dynamic path segments');
