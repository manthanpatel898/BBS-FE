# Booking Overlay Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make booking overlays close back to the immediately preceding Event Detail or day-bookings sidebar.

**Architecture:** Store an explicit parent overlay when navigating forward. Central close helpers consume that parent and restore it, while direct-entry overlays close to the underlying page.

**Tech Stack:** React 19, TypeScript, Node test runner, Next.js 16.

## Global Constraints

- Event Detail opened from a day sidebar returns to that sidebar.
- Edit Inquiry and Menu Selection opened from Event Detail return to Event Detail.
- Direct entry continues returning to the underlying page.
- Save behavior must refresh displayed booking data.

---

### Task 1: Overlay parent model

**Files:**
- Create: `lib/bookings/overlay-navigation.ts`
- Create: `lib/bookings/overlay-navigation.test.mjs`

- [ ] Test day, detail, and direct-entry parent consumption.
- [ ] Implement a typed one-level parent container and consuming transition.
- [ ] Run the focused Node tests.

### Task 2: Booking popup integration

**Files:**
- Modify: `app/(app)/bookings/page.tsx`

- [ ] Capture the day sidebar before opening Event Detail or direct child actions.
- [ ] Capture Event Detail before opening Edit Inquiry or Menu Selection.
- [ ] Centralize close/cancel restoration for all three overlays.
- [ ] Refresh Event Detail after a successful child save.
- [ ] Run scoped lint and the frontend production build.
