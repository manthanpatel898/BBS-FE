import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../../components/decoration/decoration-selection-modal.tsx', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../../components/decoration/decoration-note-block-editor.tsx', import.meta.url), 'utf8');
const notes = readFileSync(new URL('../../components/decoration/decoration-general-notes.tsx', import.meta.url), 'utf8');

test('notes builder exposes the approved mobile workflow', () => {
  assert.match(modal, /Browse Existing Inventory/);
  assert.match(modal, /Add Custom Photo Note/);
  assert.doesNotMatch(modal, />\+ Add Photo Note</);
  assert.match(modal, /Discard Draft/);
  assert.match(modal, /setHasDraft\(Boolean\(draft\)\)/);
  assert.match(modal, /disabled=\{!\(hasDraft \|\| changed\) \|\| saving\}/);
  assert.match(modal, /Retry/);
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /safe-pad-bottom/);
  assert.match(editor, /Title/);
  assert.match(editor, /Quantity/);
  assert.match(editor, /Image/);
  assert.match(editor, /Move up/);
  assert.match(editor, /Move down/);
  assert.match(editor, /Remove/);
  assert.doesNotMatch(editor, /Link inventory item \(optional\)/);
  assert.match(editor, /available/);
  assert.match(notes, /General Notes/);
  assert.match(notes, /5000/);
});

test('audit log filters include decoration selection draft activity', () => {
  const auditPage = readFileSync(
    new URL('../../app/(app)/audit-logs/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(auditPage, /decoration_selection_drafts/);
});
