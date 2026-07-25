# Decoration Note Action Icons Design

## Goal

Replace the visible `Move up`, `Move down`, and `Remove` text controls in each decoration note card with compact icons that are clearer on mobile.

## Design

- Use inline SVG chevron-up, chevron-down, and trash icons so no new package is required.
- Keep each control at least 44 × 44 pixels for touch accessibility.
- Preserve the current ordering and removal callbacks exactly.
- Preserve disabled behavior for the first note's up control and the last note's down control.
- Give every icon button an `aria-label` and matching `title` so screen readers and pointer users retain the text meaning.
- Use neutral styling for movement controls and red styling for removal.

## Testing

- Update the existing source-level view test to require the three accessible labels and SVG icon markup.
- Run the focused decoration note view test, the full decoration regression suite, TypeScript, lint, and the static production build.

## Scope

Only the decoration note card action controls change. Backend behavior, stored data, inventory selection, banquet features, and migrations remain untouched.
