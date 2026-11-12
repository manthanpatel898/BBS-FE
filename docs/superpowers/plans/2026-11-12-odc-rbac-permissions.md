# ODC RBAC Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow employees to use only the ODC capabilities explicitly assigned to them, without changing banquet access or company-admin behavior.

**Architecture:** Reuse the existing ODC permission keys. The frontend will gate navigation, pages, actions, and follow-ups by permissions; the backend will enforce the same permissions at the API boundary and retain restaurant scoping. Company and super admins remain full-access roles.

**Tech Stack:** Next.js/React, NestJS, existing JWT/RBAC guards, TypeScript, Jest/node tests.

## Global Constraints

- No database migration; reuse existing employee permission records.
- No changes to banquet routes or banquet permission behavior.
- Backend authorization remains authoritative; frontend hiding is convenience only.
- Preserve restaurant scoping and audit logging.

## Review Focus

- Employee with `odc.orders.update` can save additional inquiry information.
- Employee without `odc.orders.update` receives `403` and cannot edit.
- Employee with `odc.orders.followups.manage` can add a follow-up.
- Employee with menu permissions can see and manage ODC menus; others cannot.
- Company admin and super admin behavior remains unchanged.

### Task 1: Frontend permission constants and navigation

**Files:**
- Modify: `lib/auth/permissions.ts`
- Modify: `components/layouts/app-layout.tsx`
- Modify: `components/auth/config-route.tsx`
- Modify: `app/(app)/odc/menus/page.tsx`
- Modify: `app/(app)/odc/categories/page.tsx`

- [ ] Add ODC permission constants and permission-aware ODC navigation/page protection.
- [ ] Gate menu/category create, edit, and delete controls by their assigned permissions.
- [ ] Verify employee without permissions does not see configuration links.

### Task 2: ODC inquiry actions and follow-ups

**Files:**
- Modify: `app/(app)/odc/inquiries/page.tsx`

- [ ] Replace company-admin-only edit and follow-up UI checks with `hasPermission` checks.
- [ ] Keep action visibility aligned with the existing status rules.
- [ ] Keep transfer and other restricted actions unchanged unless their existing permission is explicitly present.

### Task 3: Backend permission enforcement

**Files:**
- Modify: `apps/BBS-BE/src/modules/odc/odc-orders.controller.ts`
- Modify: `apps/BBS-BE/src/modules/odc/odc-menus.controller.ts`
- Modify: `apps/BBS-BE/src/modules/odc/odc-categories.controller.ts`
- Modify: existing permission guard/decorator integration files as required.

- [ ] Allow `odc.orders.update` for employee users.
- [ ] Enforce `odc.orders.followups.manage` for follow-up writes.
- [ ] Enforce ODC menu/category create, update, and delete permissions.
- [ ] Preserve implicit full access for company and super admins and existing restaurant scoping.

### Task 4: Verification

**Files:**
- Modify/add: focused frontend and backend permission tests.

- [ ] Run frontend lint/type checks and focused tests.
- [ ] Run backend build and ODC tests.
- [ ] Manually verify the four RBAC scenarios in a non-production restaurant.
- [ ] Commit frontend and backend branches separately with clear messages.
