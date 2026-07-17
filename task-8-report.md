# Task 8 Report: Catalog Image Crop Integration

## Implemented

- Add Item validates and materializes the selected source before opening the reusable 4:3 crop modal.
- Cancel leaves the Add Item form and image selection unchanged; confirm revalidates the cropped file and uses only that file during item creation/upload.
- Existing-item Camera / gallery validates the 12-image limit and source bytes before cropping, then revalidates and uploads only the confirmed crop.
- Existing-item upload failures retain the confirmed cropped `File` locally and expose a retry action that reuses it. The retained file clears after success or when the user selects an explicit replacement.
- Crop/upload state remains inside the active Item modal or item card. Existing upload helper contracts are unchanged.

## TDD Evidence

- RED: both real React workflow tests failed because `ItemModal` and `CatalogItemCard` did not expose or implement crop behavior.
- GREEN: `node --import tsx --test --test-reporter=spec lib/decoration/catalog-crop-integration.behavior.test.tsx` — 2/2 passed.
- Focused crop/catalog suite — 18/18 passed.
- All decoration tests — 118/118 passed.

## Static Verification

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; 46 static pages generated.

The pre-existing `next-env.d.ts` modification was preserved and excluded from this task's commit.
