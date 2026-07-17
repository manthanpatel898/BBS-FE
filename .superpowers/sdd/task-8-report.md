# Task 8 Report: Catalog Image Crop Integration

## Implemented

- Add Item validates/materializes the source before opening the reusable crop modal and revalidates the confirmed crop. A replacement remains provisional until confirmation, so cancel preserves the prior preview and upload file.
- Existing-item Camera / gallery validates source bytes and the 12-image limit before cropping, then checks the latest item image count again immediately before upload.
- Failed uploads retain the confirmed cropped `File` for retry. Opening or cancelling a replacement crop preserves that retry; only a confirmed replacement supersedes it.
- Synchronous locks prevent duplicate confirm/retry calls before React rerenders. Selection and upload generation tokens ignore out-of-order materialization, unmount completion, and completion for a changed item identity.
- Backend upload errors are handled non-destructively and retain the confirmed crop. Crop/upload state remains local to the active modal or card, and existing API helper contracts remain unchanged.

## Behavioral TDD Evidence

- RED captured replacement-state loss, missing retry preservation, stale materialization, and missing latest-count behavior.
- The real React suite covers Add Item cancel/replace/confirm, existing-item failure/retry/replace, cropped-file validation failure, out-of-order selection, duplicate suppression, latest-prop count enforcement, changed-item/unmount isolation, and accessible control names.
- Focused command: `node --import tsx --test --test-reporter=spec lib/decoration/catalog-crop-integration.behavior.test.tsx`.

## Verification

- All decoration tests, TypeScript, ESLint, and the Next.js static build were rerun after the review fixes.
- The pre-existing `next-env.d.ts` modification remains preserved and excluded from Task 8 commits.
