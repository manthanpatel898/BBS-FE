import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const names = [
  'decoration-inquiry-form',
  'decoration-confirmation-modal',
  'decoration-payment-modal',
  'decoration-followup-modal',
  'decoration-selection-modal',
];

test('all Event Detail children render through the body portal', () => {
  for (const name of names) {
    const source = readFileSync(new URL(`../../components/decoration/${name}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /<BodyPortal>/, `${name} must use BodyPortal`);
    assert.match(source, /useModalViewport\(/, `${name} must use the shared viewport lifecycle`);
    assert.match(source, /role="dialog"/, `${name} must retain dialog semantics`);
  }
});

test('shared modal lifecycle locks body scroll and closes safely on Escape', () => {
  const hookPath = new URL('../../components/ui/use-modal-viewport.ts', import.meta.url);
  assert.equal(existsSync(hookPath), true, 'shared viewport hook must exist');
  const hook = readFileSync(hookPath, 'utf8');
  assert.match(hook, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(hook, /document\.body\.style\.overflow = previous/);
  assert.match(hook, /event\.key === 'Escape'/);
  assert.match(hook, /blockedRef\.current/);
  assert.match(hook, /closeRef\.current\(\)/);
});
