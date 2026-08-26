# ZenBooking Public Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved animated, mobile-first ZenBooking homepage for banquet and event decoration companies.

**Architecture:** Keep the public route statically exportable. The page remains a server component for content while a focused client component owns the solution-tab interaction; animations use scoped CSS and Intersection Observer with reduced-motion support.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Node test runner, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-25-public-homepage-redesign.md`

## Global Constraints

- Do not change authenticated banquet or decoration application flows.
- Do not add invented metrics or testimonials.
- Preserve static export compatibility.
- Mobile is first priority; tablet and desktop must not overflow horizontally.
- Honor `prefers-reduced-motion`.

---

### Task 1: Public navigation and homepage content contract

**Files:**
- Modify: `components/layouts/public-layout.tsx`
- Replace: `app/(public)/page.tsx`
- Create: `components/public/homepage.behavior.test.tsx`

**Interfaces:**
- Produces: public navigation anchors and the complete homepage content hierarchy.

- [x] Write behavior tests for the two solutions, truthful feature content, feedback guidance, CTAs, and absence of fabricated metrics.
- [x] Run the test and verify it fails against the current banquet-only page.
- [x] Implement the approved homepage content and navigation.
- [x] Run the test and verify it passes.

### Task 2: Interactive solution switcher and accessible motion

**Files:**
- Create: `components/public/home-solution-switcher.tsx`
- Create: `components/public/home-motion.tsx`
- Modify: `app/(public)/page.tsx`
- Modify: `components/public/homepage.behavior.test.tsx`

**Interfaces:**
- Produces: `HomeSolutionSwitcher` and `HomeMotion` client components.

- [x] Write failing tests for switching between Banquet and Event Decoration content and selected-state accessibility.
- [x] Run the tests and confirm the failure is caused by missing interaction.
- [x] Implement tab switching and intersection-based reveals with cleanup.
- [x] Run the tests and verify they pass.

### Task 3: Responsive, static-build, and regression verification

**Files:**
- Modify: `app/globals.css`
- Modify: `docs/superpowers/plans/2026-08-25-public-homepage-redesign.md`

**Interfaces:**
- Consumes: homepage markup and interaction components from Tasks 1 and 2.
- Produces: scoped animation styles and a verified production build.

- [x] Add responsive and reduced-motion CSS scoped to the homepage.
- [x] Run homepage behavior tests, lint, and production build.
- [x] Verify the public route remains statically generated and mark every completed checklist item.
