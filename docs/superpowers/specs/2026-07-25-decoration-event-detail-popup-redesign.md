# Decoration Event Detail Popup Redesign

## Goal

Redesign the event-decoration booking detail popup so selected decorations are immediately visible, spacing is compact, and actions remain aligned and usable on mobile, tablet, and desktop.

## Scope

The redesign applies only to the event-decoration detail popup and its existing decoration snapshot presentation. It does not change APIs, permissions, booking state, stored data, PDF generation, child-popup navigation, or banquet behavior.

## Modal Shell

- The popup occupies the full viewport on mobile.
- At `sm` and above, it uses the existing centered `max-w-6xl` dialog with a maximum height of the viewport minus outer spacing.
- The shell remains a three-part flex layout: fixed header, independently scrolling content, and fixed footer actions.
- Only the content region scrolls.
- The header and footer never scroll out of view.
- Safe-area padding remains on the footer for mobile browser controls.

## Header

- Replace the current bordered header card inside the scrolling content with a compact fixed dialog header.
- Show booking number, customer name, event type, booking status, and close control.
- Use white background, a single bottom border, and no surrounding card border.
- Keep the close control at least 44 × 44 pixels.
- The header must accommodate long customer and event names without overlapping the status or close control.

## Content Hierarchy

The scrolling body follows this order:

1. Refresh warning, when present.
2. Compact Event & Venue summary.
3. Selected Decoration section.
4. Advance Payments.
5. General Notes, when present.

The supporting column contains:

1. Customer.
2. Payment summary.
3. Follow-ups.
4. Booking notes, when present.

At desktop width, the main/supporting columns use a two-thirds/one-third relationship. On mobile and narrow tablets, all sections become one column.

## Event & Venue Summary

- Use one compact card with lower padding and smaller gaps.
- Display event type, date, time, slot, venue, hall, address, and created by.
- Values use responsive tiles to aid scanning without introducing nested heavy borders.
- Hall remains `Not applicable` when absent.

## Selected Decoration

- Rename the visible section from `Decoration snapshot` to `Selected Decoration`.
- Place it immediately below Event & Venue and before payment details.
- Display selection count and an Edit Selection action when decoration management is available.
- Empty state remains visible and concise.
- Category headings and item counts remain.
- Use one item column on mobile and two columns from tablet upward; do not introduce a third compact column.
- Images use the existing 4:3 ratio and fill the card width.
- Each card clearly displays item name, quantity, optional description, and custom badge.
- Image preview behavior and fallbacks remain unchanged.
- The section must not create horizontal scrolling.

## Supporting Information

- Add a compact payment summary card showing package amount, received amount, and pending amount using the existing booking values.
- Follow-ups display the latest entries first with readable dates and recorded-by information.
- Customer, follow-up, general notes, and booking notes cards use reduced padding and consistent text colors.
- No unavailable data is invented.

## Action Bar

- Keep the action bar fixed to the popup bottom.
- Preserve all existing action visibility, permission checks, callbacks, loading states, download behavior, and navigation.
- Desktop and tablet buttons use an equal-width responsive grid with consistent height.
- Mobile uses an aligned two-column action grid when expanded.
- The mobile Actions toggle remains full-width and does not cause horizontal scrolling.
- The primary decoration action uses the platform amber style; confirmation uses the existing green style; other actions use neutral styling.
- Errors remain directly above the controls and inside the fixed footer.

## Responsive Rules

### Mobile

- Full-screen modal.
- Single-column content.
- 12–16 pixel body padding.
- Single-column decoration items with large images.
- Two-column expanded action grid with a full-width Actions toggle.
- No horizontal scrolling.

### Tablet

- Centered dialog where viewport space permits.
- Content may remain a single column at narrower tablet widths.
- Decoration items use two columns.
- Action buttons use two or three equal columns depending on available width.

### Desktop

- Two-thirds main column and one-third supporting column.
- Decoration items use two columns.
- Actions use equal-width columns and wrap into complete aligned rows when necessary.

## Accessibility

- Preserve dialog semantics and labels.
- Preserve keyboard access and disabled behavior.
- Maintain at least 44-pixel touch targets.
- All text meets the platform’s slate-on-white contrast standard.
- Loading and error content remain announced through the existing live regions.

## Testing

- Add source-level layout tests for fixed header/body/footer separation, selected-decoration priority, compact spacing, two-column decoration limit, and aligned action grids.
- Retain existing behavior tests for action visibility, download lifecycle, overlay navigation, image fallbacks, and snapshot grouping.
- Run the complete decoration regression suite, TypeScript, lint, security audit, and static production build.

## Migration and Backend Impact

No database migration or backend modification is required.
