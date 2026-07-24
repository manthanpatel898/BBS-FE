import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gallery = readFileSync(
  new URL(
    '../../components/decoration/decoration-inventory-gallery-modal.tsx',
    import.meta.url,
  ),
  'utf8',
);
const domain = readFileSync(
  new URL('./inventory-gallery.ts', import.meta.url),
  'utf8',
);
const editor = readFileSync(
  new URL(
    '../../components/decoration/decoration-note-block-editor.tsx',
    import.meta.url,
  ),
  'utf8',
);
const picker = readFileSync(
  new URL(
    '../../components/decoration/decoration-inventory-image-picker.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('inventory gallery exposes the approved mobile discovery workflow', () => {
  assert.match(gallery, /Browse Existing Inventory/);
  assert.match(gallery, /Search inventory/);
  assert.match(gallery, /\bAll\b/);
  assert.match(gallery, /available/);
  assert.match(domain, /Not available/);
  assert.match(gallery, /Image required/);
  assert.match(gallery, /Already selected/);
  assert.match(gallery, /grid-cols-1/);
  assert.match(gallery, /min-\[390px\]:grid-cols-2/);
  assert.match(gallery, /overflow-y-auto/);
  assert.match(gallery, /returnFocusRef/);
  assert.match(gallery, /aria-pressed/);
  assert.match(gallery, /aria-label/);
});

test('selected notes expose catalog identity and alternate images without a dropdown', () => {
  assert.doesNotMatch(editor, /DecorationInventoryLinker/);
  assert.doesNotMatch(editor, /Link inventory item \(optional\)/);
  assert.match(editor, /Catalog item/);
  assert.match(editor, /Custom item/);
  assert.match(editor, /Change image/);
  assert.match(editor, /Only \{catalogItem\.availableQuantity\} available/);
  assert.match(picker, /Choose presentation image/);
  assert.match(picker, /aria-pressed/);
  assert.match(picker, /z-\[85\]/);
  assert.match(picker, /returnFocusRef/);
});
