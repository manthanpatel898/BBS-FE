import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const modalPath = new URL('../../components/decoration/decoration-selection-modal.tsx', import.meta.url);
const portalPath = new URL('../../components/ui/body-portal.tsx', import.meta.url);

test('renders decoration selection at document body with viewport-owned scrolling', () => {
  assert.equal(existsSync(portalPath), true, 'body portal must exist');
  const modal = readFileSync(modalPath, 'utf8');
  const portal = readFileSync(portalPath, 'utf8');
  assert.match(modal, /<BodyPortal>/);
  assert.match(portal, /createPortal\(children, document\.body\)/);
  assert.match(modal, /useModalViewport\(onClose, saving \|\| uploading\)/);
  assert.doesNotMatch(modal, /<footer className="absolute/);
});
