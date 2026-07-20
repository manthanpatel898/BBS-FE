# Decoration Required Follow-ups Design

## Goal

Replace the decoration follow-up month/date calendar with a full-width actionable queue that matches the banquet platform's visual language and shows only work that staff must perform now.

## Queue eligibility

A decoration booking appears when all of the following are true:

- The booking is not completed, cancelled, or a closed inquiry.
- The event has not ended before today.
- It has no pending follow-up history, or its latest pending follow-up is overdue or due today.

A newly created inquiry with no follow-up history appears immediately, regardless of how far in the future its event is.

A booking is hidden when:

- A follow-up was taken today.
- Its next follow-up is scheduled after today. It becomes visible automatically on that scheduled date.
- The booking is completed, cancelled, closed, or its event is in the past.

## Page design

- Use the full available content width; remove month headings, date tiles, and date sidebars.
- Use the banquet follow-up typography, spacing, borders, badges, buttons, and empty/loading/error treatments.
- Render responsive action cards: one column on mobile, increasing columns where space permits.
- Each card shows customer name and mobile, event type, venue/hall, event date/time, latest note when available, and a clear Pending, Due Today, or Overdue badge.
- Each card provides Call, View Details, and Add Follow-up actions.
- Existing event-detail and add-follow-up popups remain in the established overlay flow.

## State updates

After a follow-up is saved, update the local booking data and recalculate the queue immediately. If the new follow-up is taken today, scheduled in the future, or closes the inquiry, its card disappears without requiring a page reload.

## Reliability and testing

- Keep queue eligibility in a pure domain helper shared by the page presentation.
- Add tests for new inquiries, overdue and today schedules, future schedules, follow-ups taken today, past events, and terminal statuses.
- Verify mobile/full-width rendering, popup navigation, production build, lint, and relevant regressions.
