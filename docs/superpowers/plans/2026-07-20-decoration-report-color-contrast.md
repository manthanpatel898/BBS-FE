# Decoration Report Color Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make every decoration report label, value, control, table, card, state, and print element readable on its background.

**Architecture:** Keep the global dark application theme unchanged. Enforce a light-surface color contract inside the three decoration report routes and reuse the existing `light-form-field` class for WebKit-safe form text.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Node source regression test.

## Global Constraints

- Do not change banquet report screens, report APIs, data, routing, or permissions.
- Meaningful text on white surfaces must use slate-600 or darker.
- Form controls must use `light-form-field` to override global dark-theme text and WebKit text fill.
- Printed content must remain black on white.

---

### Task 1: Contrast regression test

**Files:**
- Create: `lib/decoration/report-contrast.test.mjs`
- Test: `lib/decoration/report-contrast.test.mjs`

**Interfaces:**
- Consumes: decoration report page source files
- Produces: source-level invariants for root foregrounds, form controls, and low-contrast utility exclusions

- [x] **Step 1: Write the failing test**

Read landing, view, and print source files. Assert each establishes `text-slate-950`; every report `input`, `select`, and `textarea` class contains `light-form-field`; and meaningful report markup contains neither `text-slate-300` nor `text-slate-400`.

- [x] **Step 2: Verify RED**

Run: `node lib/decoration/report-contrast.test.mjs`

Expected: failure for missing root foreground and missing `light-form-field` classes.

### Task 2: Scoped report foreground contract

**Files:**
- Modify: `app/(app)/decoration/reports/page.tsx`
- Modify: `app/(app)/decoration/reports/view/page.tsx`
- Modify: `app/(app)/decoration/reports/print/page.tsx`

**Interfaces:**
- Consumes: existing Tailwind slate palette and `light-form-field` global contract
- Produces: explicit readable foregrounds on all report surfaces

- [x] **Step 1: Apply minimal scoped colors**

Set route roots and white cards/tables to `text-slate-950`; supporting copy to `text-slate-700` or `text-slate-600`; action controls to explicit foregrounds; and all form controls to `light-form-field`.

- [x] **Step 2: Verify GREEN**

Run: `node lib/decoration/report-contrast.test.mjs`

Expected: all contrast assertions pass.

### Task 3: Regression verification and commit

**Files:**
- Modify: `docs/superpowers/plans/2026-07-20-decoration-report-color-contrast.md`

- [x] **Step 1: Run targeted checks**

```bash
node lib/decoration/report-contrast.test.mjs
npx eslint 'app/(app)/decoration/reports/page.tsx' 'app/(app)/decoration/reports/view/page.tsx' 'app/(app)/decoration/reports/print/page.tsx'
npx tsc --noEmit
npm run build
```

Expected: zero test, lint, type, or build failures; static report routes remain prerendered.

- [x] **Step 2: Commit**

```bash
git add app/(app)/decoration/reports lib/decoration/report-contrast.test.mjs docs/superpowers/plans/2026-07-20-decoration-report-color-contrast.md
git commit -m "fix decoration report text contrast"
```
