# Decoration Mobile Responsive Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden all event-decoration and shared operational screens for mobile-first use, readable light surfaces, tablet/desktop scaling and static deployment.

**Architecture:** Add source-level regression invariants, reuse the existing `light-form-field` contract, and improve modules in small scoped batches. Keep APIs, data models, permissions and static query-string routing unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Node source regression tests.

## Global Constraints

- Mobile is priority one; tablet and desktop are priority two.
- Do not modify banquet business behavior or backend contracts.
- All frontend routes remain statically generated.
- Meaningful text on light surfaces uses slate-600 or darker.
- All light form controls use `light-form-field` or `decoration-light-field`.

---

### Task 1: Shared regression contract

**Files:**
- Create: `lib/decoration/mobile-responsive-audit.test.mjs`

- [x] Write assertions for light-field constants, CommonModal foregrounds, mobile Audit Log cards, Event Detail wrapping and query-string decoration routes.
- [x] Run `node lib/decoration/mobile-responsive-audit.test.mjs` and verify RED.

### Task 2: Shared forms and CommonModal

**Files:**
- Modify: `components/ui/common-modal.tsx`
- Modify: decoration inquiry/confirmation/payment/follow-up and settings form components
- Modify: `app/(app)/employees/page.tsx`
- Modify: `app/(app)/audit-logs/page.tsx`

- [x] Apply the shared light-field class and explicit readable modal foregrounds.
- [x] Run the audit test and verify the shared assertions pass.

### Task 3: Mobile Audit Logs

**Files:**
- Modify: `app/(app)/audit-logs/page.tsx`

- [x] Add mobile cards with equivalent expanded details and keep the table for `md` and above.
- [x] Make filters and pagination stack safely on 320px screens.
- [x] Run audit test and targeted ESLint.

### Task 4: Event workflows and follow-ups

**Files:**
- Modify: `components/decoration/decoration-event-detail-modal.tsx`
- Modify: `components/decoration/decoration-advance-ledger.tsx`
- Modify: `components/decoration/decoration-followup-workspace.tsx`
- Modify: related popup components

- [x] Wrap narrow headers/actions, strengthen labels and preserve fixed action/footer behavior.
- [x] Run audit test, TypeScript and targeted ESLint.

### Task 5: Employees, settings, dashboard and calendar

**Files:**
- Modify: `app/(app)/employees/page.tsx`
- Modify: decoration settings components
- Modify: decoration dashboard/calendar/sidebar components

- [x] Strengthen light-surface secondary copy, preserve mobile cards and protect narrow layout edges.
- [x] Run audit test, TypeScript and targeted ESLint.

### Task 6: Static regression and commit

- [x] Run `node lib/decoration/mobile-responsive-audit.test.mjs`.
- [x] Run targeted ESLint and `npx tsc --noEmit`.
- [x] Run `npm run build` and verify every route is static.
- [x] Mark checklist complete and commit the batch.
