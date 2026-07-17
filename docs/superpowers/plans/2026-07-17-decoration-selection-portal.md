# Decoration Selection Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Choose Decoration a viewport-owned, mobile-first modal that closes back to Event Detail without overlapping or scrolling with its parent overlay.

**Architecture:** Add a hydration-safe body portal and render the existing selection dialog through it. Keep catalog and selection state unchanged, while the modal shell owns document scroll locking, Escape handling, viewport layout, and its single internal scroll region.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node test runner.

## Global Constraints

- Preserve Event Detail and its booking state underneath the chooser.
- Closing the chooser returns exactly one level to Event Detail.
- Use query strings for static-deployment navigation; this change adds no route.
- Preserve existing APIs, availability validation, selection payloads, and database collections.
- Support desktop, tablet, mobile safe areas, and long decoration lists.

---

### Task 1: Viewport-owned decoration selection modal

**Files:**
- Create: `components/ui/body-portal.tsx`
- Modify: `components/decoration/decoration-selection-modal.tsx`
- Create: `lib/decoration/selection-modal-view.test.mjs`

**Interfaces:**
- Produces: `BodyPortal({ children }: { children: React.ReactNode }): React.ReactPortal | null`
- Consumes: the existing `DecorationSelectionModal` props and selection data flow without changing them.

- [ ] **Step 1: Write the failing structural regression test**

Create a test that reads both source files and asserts the chooser imports and uses `BodyPortal`, the portal targets `document.body`, the modal locks `document.body.style.overflow`, handles Escape, and uses a flex footer instead of an absolutely positioned footer.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../../components/decoration/decoration-selection-modal.tsx', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../../components/ui/body-portal.tsx', import.meta.url), 'utf8');

test('renders decoration selection at document body with viewport-owned scrolling', () => {
  assert.match(modal, /<BodyPortal>/);
  assert.match(portal, /createPortal\(children, document\.body\)/);
  assert.match(modal, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(modal, /event\.key === 'Escape'/);
  assert.doesNotMatch(modal, /<footer className="absolute/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test lib/decoration/selection-modal-view.test.mjs`

Expected: FAIL because `components/ui/body-portal.tsx` does not exist.

- [ ] **Step 3: Implement the hydration-safe body portal**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  return mounted ? createPortal(children, document.body) : null;
}
```

- [ ] **Step 4: Move the chooser shell into the portal**

Import `BodyPortal`, wrap the existing root overlay with it, and retain the existing dialog semantics. Change the panel to `max-h-[100dvh]` on mobile and `sm:max-h-[calc(100dvh-2.5rem)]`; keep header and footer as flex children and only the content area `overflow-y-auto`. Use safe-area bottom padding on the footer.

Add one effect that stores and restores the prior body overflow and listens for Escape only while save/upload is idle:

```tsx
useEffect(() => {
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !saving && !uploading) onClose();
  };
  window.addEventListener('keydown', closeOnEscape);
  return () => {
    window.removeEventListener('keydown', closeOnEscape);
    document.body.style.overflow = previous;
  };
}, [onClose, saving, uploading]);
```

- [ ] **Step 5: Verify GREEN and regression coverage**

Run:

```bash
node --test lib/decoration/selection-modal-view.test.mjs
node --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Expected: new test passes; all decoration tests pass; TypeScript and build exit 0; lint has no new errors.

- [ ] **Step 6: Commit the implementation**

```bash
git add components/ui/body-portal.tsx components/decoration/decoration-selection-modal.tsx lib/decoration/selection-modal-view.test.mjs
git commit -m "fix(decoration): portal selection modal to viewport"
```

- [ ] **Step 7: Manual viewport verification**

Open Event Detail and Choose Decoration at desktop, tablet, and mobile widths. Verify the header and save footer remain visible, only catalog content scrolls, the parent cannot scroll or receive clicks, Escape/backdrop/close return to Event Detail, and saving returns to the updated Event Detail.
