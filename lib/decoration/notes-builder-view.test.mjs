import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../../components/decoration/decoration-selection-modal.tsx', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../../components/decoration/decoration-note-block-editor.tsx', import.meta.url), 'utf8');
const linker = readFileSync(new URL('../../components/decoration/decoration-inventory-linker.tsx', import.meta.url), 'utf8');
const notes = readFileSync(new URL('../../components/decoration/decoration-general-notes.tsx', import.meta.url), 'utf8');

test('notes builder exposes the approved mobile workflow', () => {
  assert.match(modal, /Add Photo Note/);
  assert.match(modal, /Discard Draft/);
  assert.match(modal, /Retry/);
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /safe-pad-bottom/);
  assert.match(editor, /Title/);
  assert.match(editor, /Quantity/);
  assert.match(editor, /Image/);
  assert.match(editor, /Move up/);
  assert.match(editor, /Move down/);
  assert.match(editor, /Remove/);
  assert.match(linker, /Link inventory item \(optional\)/);
  assert.match(linker, /available/);
  assert.match(notes, /General Notes/);
  assert.match(notes, /5000/);
});
