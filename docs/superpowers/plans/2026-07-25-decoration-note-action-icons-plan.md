# Decoration Note Action Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace decoration note action text with accessible, touch-friendly icons.

**Architecture:** Keep the existing note editor callbacks and disabled rules. Render dependency-free inline SVG icons inside semantic buttons with accessible names and tooltips.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner

## Global Constraints

- Do not change backend APIs, stored data, or banquet behavior.
- Do not add a new icon dependency.
- Every icon button must remain at least 44 × 44 pixels.
- Preserve all existing move and remove behavior.

---

### Task 1: Decoration note action icons

**Files:**
- Modify: `components/decoration/decoration-note-block-editor.tsx`
- Modify: `lib/decoration/notes-builder-view.test.mjs`

**Interfaces:**
- Consumes: existing `onMove(direction: -1 | 1)` and `onRemove()` callbacks
- Produces: icon-only buttons named `Move decoration note up`, `Move decoration note down`, and `Remove decoration note`

- [x] **Step 1: Write the failing source-view test**

Require the editor source to contain all three accessible names, matching titles, inline SVG markup, and no visible legacy action text nodes.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test lib/decoration/notes-builder-view.test.mjs
```

Expected: failure because the icon-only accessible controls are not implemented.

- [x] **Step 3: Implement the three icon buttons**

Add small local SVG icon components for up, down, and trash. Render them inside 44 × 44 pixel buttons with `aria-label`, `title`, existing disabled conditions, and unchanged callbacks.

- [x] **Step 4: Run focused and regression verification**

Run:

```bash
node --test lib/decoration/notes-builder-view.test.mjs
node --import tsx --test --test-reporter=dot lib/decoration/*.test.mjs lib/decoration/inventory-gallery-integration.behavior.test.tsx
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests, type checking, lint, and the static build pass; lint may retain only previously documented unrelated warnings.

- [x] **Step 5: Commit**

```bash
git add components/decoration/decoration-note-block-editor.tsx lib/decoration/notes-builder-view.test.mjs docs/superpowers/specs/2026-07-25-decoration-note-action-icons-design.md docs/superpowers/plans/2026-07-25-decoration-note-action-icons-plan.md
git commit -m "feat(decoration): use icons for note actions"
```
