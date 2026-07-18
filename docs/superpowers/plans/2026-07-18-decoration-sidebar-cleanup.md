# Decoration Sidebar Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `Decoration Catalog` and `Import Data` from the event-decoration sidebar without removing their direct routes or permissions.

**Architecture:** Change only the `EVENT_DECORATION` navigation array in `AppLayout`. Add a focused regression that inspects the decoration navigation block and separately confirms the existing route-permission mappings remain available.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- Keep `/decoration/catalog` and `/decoration/import` pages and APIs unchanged.
- Keep their direct-route permission mappings unchanged.
- Do not change banquet navigation or decoration Settings.
- No database migration is required.

---

### Task 1: Remove the two decoration sidebar entries

**Files:**
- Modify: `components/layouts/app-layout.tsx`
- Create: `lib/decoration/sidebar-navigation.test.mjs`

**Interfaces:**
- Consumes: the existing `EVENT_DECORATION` navigation block in `AppLayout`.
- Produces: the same decoration sidebar without `/decoration/catalog` and `/decoration/import` links.

- [ ] **Step 1: Write the failing navigation regression**

Create a Node test that reads `components/layouts/app-layout.tsx`, isolates the `EVENT_DECORATION` navigation block, and asserts it contains neither `href: '/decoration/catalog'` nor `href: '/decoration/import'`. Read `lib/auth/business-routes.ts` separately and assert both route-permission mappings still exist.

```js
assert.doesNotMatch(decorationNavigation, /href:\s*['"]\/decoration\/catalog/);
assert.doesNotMatch(decorationNavigation, /href:\s*['"]\/decoration\/import/);
assert.match(routePermissions, /\['\/decoration\/catalog',\s*'decoration\.catalog\.view'\]/);
assert.match(routePermissions, /\['\/decoration\/import',\s*'decoration\.import\.manage'\]/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test lib/decoration/sidebar-navigation.test.mjs`

Expected: FAIL because both sidebar links still exist.

- [ ] **Step 3: Implement the minimal sidebar change**

Delete the `canViewCatalog` and `canImport` calculations and their two conditional navigation entries from the event-decoration branch. Do not change route permission mappings, page files, or APIs.

- [ ] **Step 4: Verify the focused and full gates**

Run:

```bash
node --test lib/decoration/sidebar-navigation.test.mjs
node --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: focused test passes; all decoration tests pass; TypeScript, lint, static build, and diff check exit successfully.

- [ ] **Step 5: Commit**

```bash
git add components/layouts/app-layout.tsx lib/decoration/sidebar-navigation.test.mjs
git commit -m "fix(decoration): simplify sidebar navigation"
```
