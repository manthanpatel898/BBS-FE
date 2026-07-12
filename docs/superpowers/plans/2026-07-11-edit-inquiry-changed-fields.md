# Edit Inquiry Changed-Field PATCH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send only intentionally changed Edit Inquiry values while preserving backend RBAC enforcement.

**Architecture:** Extract normalized recursive diff logic into a frontend booking utility and use it only for update requests. Add backend comparison normalization as defense in depth without weakening permission checks.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, NestJS 11, Jest-compatible Nest specs.

## Global Constraints

- Preserve the complete create-inquiry payload.
- Omit unchanged fields, including unchanged nested customer properties.
- Preserve explicit clears and treat arrays atomically.
- Backend RBAC remains authoritative.
- Do not modify unrelated `next-env.d.ts` changes.

---

### Task 1: Changed-field payload utility

**Files:**
- Create: `lib/bookings/changed-fields.ts`
- Test: `lib/bookings/changed-fields.test.mjs`

**Interfaces:**
- Produces: `buildChangedFields(original, current)` returning a recursively partial object.

- [ ] Write table-driven failing tests for pax-only changes, unchanged customer omission, one nested customer change, explicit clearing, array equality/change, and no changes.
- [ ] Run `node --test lib/bookings/changed-fields.test.mjs` and confirm failure because the module is missing.
- [ ] Implement `buildChangedFields` with plain-object recursion, structural array comparison, and `undefined` omission.
- [ ] Run the focused tests and confirm all pass.

### Task 2: Edit Inquiry integration

**Files:**
- Modify: `app/(app)/bookings/page.tsx`

**Interfaces:**
- Consumes: `buildChangedFields(original, current)`.

- [ ] Store the normalized initial edit payload when opening Edit Inquiry.
- [ ] Build the normalized current payload on save and pass only the diff to `updateOrder`.
- [ ] Skip the request and show `No changes to save.` when the diff is empty.
- [ ] Keep the create path unchanged and reset the edit snapshot when closing/resetting.
- [ ] Run `npx eslint 'app/(app)/bookings/page.tsx' 'lib/bookings/changed-fields.ts'` and resolve scoped failures.

### Task 3: Backend comparison defense and regression test

**Files:**
- Modify: `src/modules/orders/orders.service.ts`
- Modify: `src/modules/orders/orders-permissions.spec.ts`

**Interfaces:**
- Preserves: `assertAllowedOrderUpdate` and existing permission constants.

- [ ] Add a failing test proving whitespace and null/empty representation differences do not count as protected customer-name changes.
- [ ] Normalize comparable strings with trimming while keeping non-string comparisons unchanged.
- [ ] Run the focused permission spec and confirm it passes.

### Task 4: Final verification

**Files:**
- Verify all files above.

- [ ] Run frontend unit tests and build.
- [ ] Run backend permission spec and build.
- [ ] Review both repository diffs and confirm only task files plus the pre-existing `next-env.d.ts` change are present.
