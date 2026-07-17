import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../../components/decoration/settings/decoration-catalog-section.tsx', import.meta.url);

test('decoration catalog separates type master from selected type items', async () => {
  const source = await readFile(componentUrl, 'utf8');

  assert.match(source, /'Decoration Types'/);
  assert.match(source, />Open Type</);
  assert.match(source, /Back to Decoration Types/);
  assert.match(source, /childrenForParent\(items, selectedType\.id\)/);
  assert.match(source, /selectedType \? manage \?.*Add item/s);
  assert.match(source, /aria-label="Previous item image"/);
  assert.match(source, /aria-label="Next item image"/);
});
