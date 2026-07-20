# Decoration Required Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decoration follow-up month calendar with a full-width queue containing only follow-ups requiring action now.

**Architecture:** Keep queue eligibility in the pure `lib/decoration/followups.ts` domain helper and render its result directly in the existing workspace. Existing event-detail and follow-up modals remain responsible for their workflows; a saved booking is merged locally and the queue is recalculated immediately.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS, Node test runner through `tsx`.

## Global Constraints

- Match the banquet follow-up typography, borders, badges, actions, and responsive behavior.
- Use the full available content width and do not render month headings, date tiles, or a date sidebar.
- Show new inquiries immediately; show scheduled follow-ups only when due; hide taken, terminal, and past-event records.
- Preserve the query-string/static-deployment overlay flow.

---

### Task 1: Actionable queue domain rules

**Files:**
- Modify: `lib/decoration/followups.ts`
- Test: `lib/decoration/followups.test.mjs`

**Interfaces:**
- Produces: `buildDecorationRequiredFollowupQueue(bookings, todayKey): DecorationFollowupScheduleEntry[]`
- Consumes: `DecorationBooking`, `DecorationFollowup`, `decorationDateKey`

- [ ] **Step 1: Write failing eligibility tests**

Add assertions proving that a new future inquiry and overdue/today follow-ups appear, while a follow-up taken today, a future schedule, a past event, and terminal statuses do not.

```ts
const queue = buildDecorationRequiredFollowupQueue([
  booking({ id: 'new', followups: [] }),
  booking({ id: 'overdue', followups: [followup({ nextDate: '2026-07-19' })] }),
  booking({ id: 'today', followups: [followup({ nextDate: '2026-07-20' })] }),
  booking({ id: 'future', followups: [followup({ nextDate: '2026-07-21' })] }),
  booking({ id: 'taken', followups: [followup({ date: '2026-07-20' })] }),
], '2026-07-20');
assert.deepEqual(queue.map(({ booking }) => booking.id), ['overdue', 'today', 'new']);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx tsx --test lib/decoration/followups.test.mjs`

Expected: failure because `buildDecorationRequiredFollowupQueue` is not exported.

- [ ] **Step 3: Implement the queue selector**

```ts
const ACTIONABLE_STATES = new Set<DecorationFollowupState>(['OVERDUE', 'DUE_TODAY', 'PENDING']);

export function buildDecorationRequiredFollowupQueue(bookings: DecorationBooking[], todayKey = decorationDateKey(new Date())) {
  return buildDecorationFollowupSchedule(bookings, todayKey)
    .filter((entry) => ACTIONABLE_STATES.has(entry.state))
    .sort((left, right) => priority(left.state) - priority(right.state)
      || left.dateKey.localeCompare(right.dateKey)
      || left.booking.customer.name.localeCompare(right.booking.customer.name));
}
```

Use priority order `OVERDUE`, `DUE_TODAY`, then `PENDING`.

- [ ] **Step 4: Run the domain tests and confirm GREEN**

Run: `npx tsx --test lib/decoration/followups.test.mjs`

Expected: all follow-up tests pass.

- [ ] **Step 5: Commit the domain change**

```bash
git add lib/decoration/followups.ts lib/decoration/followups.test.mjs
git commit -m "fix decoration actionable followup rules"
```

### Task 2: Full-width banquet-style follow-up queue

**Files:**
- Modify: `components/decoration/decoration-followup-workspace.tsx`
- Test: `lib/decoration/followup-workspace.behavior.test.tsx`

**Interfaces:**
- Consumes: `buildDecorationRequiredFollowupQueue`
- Preserves: `DecorationEventDetailModal`, `DecorationFollowupModal`, and local `updated(booking)` replacement flow

- [ ] **Step 1: Write the failing workspace behavior test**

Render the workspace with one actionable and one future-scheduled booking, then assert the actionable customer is visible, the future customer is absent, there are no month/date buttons, and the Call, View Details, and Add Follow-up actions exist.

```tsx
assert.ok(view.getByText('Action Customer'));
assert.equal(view.queryByText('Future Customer'), null);
assert.equal(view.queryByRole('button', { name: /July 22/i }), null);
assert.ok(view.getByRole('link', { name: /Call Action Customer/i }));
assert.ok(view.getByRole('button', { name: 'View Details' }));
assert.ok(view.getByRole('button', { name: 'Add Follow-up' }));
```

- [ ] **Step 2: Run the behavior test and confirm RED**

Run: `npx tsx --test lib/decoration/followup-workspace.behavior.test.tsx`

Expected: failure because the current workspace renders month/date cards.

- [ ] **Step 3: Replace month/date presentation with the queue**

Use this page structure:

```tsx
<div className="w-full px-3 pb-10 sm:px-6 lg:px-8">
  <section className="mb-6">
    <h2 className="text-2xl font-bold text-slate-900">Required Follow Ups</h2>
    <p className="mt-2 text-sm text-slate-500">Open inquiries requiring action now.</p>
  </section>
  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
    {queue.map((entry) => <FollowupCard key={entry.booking.id} entry={entry} />)}
  </div>
</div>
```

Remove `SelectedDay`, month grouping, `DayCard`, and `DaySidebar`. Retain banquet-style neutral cards, compact badges, telephone action, and existing modal state.

- [ ] **Step 4: Recalculate immediately after saving**

Keep the existing immutable replacement:

```ts
function updated(booking: DecorationBooking) {
  setBookings((current) => replaceBooking(current, booking));
  setFollowupBooking(null);
}
```

Because `queue` is derived with `useMemo`, a taken, future-scheduled, or closed item disappears immediately.

- [ ] **Step 5: Run behavior and domain tests**

Run: `npx tsx --test lib/decoration/followups.test.mjs lib/decoration/followup-workspace.behavior.test.tsx`

Expected: all tests pass.

- [ ] **Step 6: Commit the workspace**

```bash
git add components/decoration/decoration-followup-workspace.tsx lib/decoration/followup-workspace.behavior.test.tsx
git commit -m "feat decoration required followup workspace"
```

### Task 3: Production regression verification

**Files:**
- Modify only if verification exposes a defect in files from Tasks 1–2.

**Interfaces:**
- Verifies the static-export application and existing modal workflows.

- [ ] **Step 1: Run all relevant automated tests**

```bash
npx tsx --test lib/decoration/followups.test.mjs lib/decoration/followup-workspace.behavior.test.tsx
```

Expected: zero failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: zero new errors; unrelated existing warnings may remain documented.

- [ ] **Step 3: Run the static production build**

Run: `npm run build`

Expected: successful static generation including `/decoration/followups`.

- [ ] **Step 4: Verify the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended follow-up files changed.

- [ ] **Step 5: Commit any verification fix and confirm clean status**

```bash
git add components/decoration/decoration-followup-workspace.tsx lib/decoration/followups.ts lib/decoration/followups.test.mjs lib/decoration/followup-workspace.behavior.test.tsx
git commit -m "test decoration followup workspace regression"
git status --short
```

Expected: clean working tree.
