# Task 5 Report: Branded HTML View and Print Layout

## Outcome

- Added `DecorationCustomerDocumentView`, a shared renderer for the normalized `DecorationCustomerDocument` DTO.
- Replaced raw `DecorationBooking` rendering in the customer document route.
- Added the optional banquet-style company logo, company name, and configured contact numbers to the document header.
- Kept Event Type exclusively inside the Event & Venue details.
- Rendered normalized immutable snapshot categories directly, with semantic sections/articles, 4:3 images, stable missing-image fallbacks, custom markers, quantities, and wrapping descriptions.
- Preserved the static query-only route, print-after-assets behavior, and booking-specific Back link.
- Added responsive phone-first layout and A4 portrait print rules with page-break protection and print-safe image colors.
- Added retry behavior for failed document requests.

The normalized `DecorationCustomerDocument` interface was already present at the requested base commit, so `lib/auth/types.ts` required no duplicate change. `fetchDecorationCustomerDocument` now returns that interface.

## Strict TDD Evidence

RED:

```text
node --test lib/decoration/customer-document-layout.test.mjs
tests 5, pass 0, fail 5
```

The failures were caused by the missing shared component and the old booking-based route/API contract.

GREEN:

```text
node --test lib/decoration/customer-document-layout.test.mjs \
  lib/decoration/customer-document-actions.test.mjs \
  lib/decoration/customer-document-print-readiness.test.mjs
tests 10, pass 10, fail 0
```

## Verification

```text
node --test lib/decoration/*.test.mjs
tests 102, pass 102, fail 0

npx tsc --noEmit
exit 0

npm run lint
exit 0; 0 errors, 1 unrelated pre-existing warning in app/(app)/odc/reports/page.tsx

npm run build
exit 0; compiled, TypeScript checked, and 46 static pages generated including /decoration/print
```

The first sandboxed build attempt was blocked because Turbopack could not bind a local worker port. Re-running the same build with the required permission succeeded.

## Visual Verification

Live phone, tablet, desktop, and print-preview inspection could not be completed because the in-app browser reported no available rendering targets in this session. No substitute browser was used. Layout coverage is provided by the source regression asserting responsive two-column behavior, stable 4:3 containers/fallbacks, wrapping text, A4 portrait rules, print color adjustment, and page-break protection; the static production route also builds successfully.

## Scope Notes

- Preserved the pre-existing uncommitted `next-env.d.ts` modification and did not include it in this task.
- Base frontend commit: `2e629256754fb9892193e89c62991e6bc7098fff`.
- Planned commit message: `refactor(decoration): align customer document with banquet print`.
