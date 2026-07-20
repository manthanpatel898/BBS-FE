# Decoration Report Color Contrast Design

## Goal

Make all text and form values readable across the four decoration reports without changing the global application theme or banquet screens.

## Root Cause

The application base theme uses near-white inherited body text and dark-themed global form controls. Decoration reports render white surfaces, and several elements inherit those global colors. WebKit form controls also retain the global `-webkit-text-fill-color`, even where a Tailwind text utility is present.

## Design

- Scope the correction to decoration report landing, view/editor, and print pages.
- Give each report root an explicit `text-slate-950` foreground.
- Use `text-slate-950` for record values and headings, `text-slate-700` for descriptions, and `text-slate-600` for supporting metadata.
- Apply the existing `light-form-field` contract to every report `input`, `select`, and `textarea` so normal, placeholder, focus, autofill, and WebKit text-fill colors remain readable.
- Give cards, table bodies, buttons, pagination, loading states, empty states, and editor actions explicit foreground colors instead of relying on body inheritance.
- Keep semantic financial colors limited to accessible `emerald-700` and `red-700` values.
- Keep printed content black on white and exclude application chrome.

## Regression Protection

Add a source-level report contrast test that verifies:

- every interactive report form control uses the light form-field contract;
- all report page roots establish a dark foreground;
- report preview and print tables establish explicit foreground colors;
- no report uses low-contrast `text-slate-300` or `text-slate-400` for meaningful content.

Run the regression test, targeted lint, TypeScript, and the static production build before committing.

## Scope

No API, database, permission, calculation, routing, or banquet report changes are required.
