# Task 6 Report: Crop geometry and image export utility

Implemented from frontend base `eb56bf8108cc821bb52aba074a4c757cc766ff11`.

## Changes

- Installed `react-easy-crop@6.2.2` and its `normalize-wheel` dependency.
- Added pure crop geometry with fixed 4:3 output, clamped rotated coordinates, 90/270-degree dimension swapping, maximum 1600 x 1200 output, and no upscaling.
- Added normalized quarter-turn rotations and deterministic `-cropped.png` / `-cropped.jpg` filenames.
- Added EXIF-aware `createImageBitmap(file, { imageOrientation: 'from-image' })` canvas export.
- Added alpha detection so transparent output is encoded as PNG and opaque output as JPEG at quality `0.88`, with matching `File` MIME and extension.
- Added injectable bitmap/canvas adapters and guaranteed bitmap/canvas cleanup across success, decode failure, invalid dimensions, and encoder failure.

## TDD Evidence

RED:

```text
node --test lib/decoration/image-crop.test.mjs
ERR_MODULE_NOT_FOUND: lib/decoration/image-crop.ts
exit 1
```

GREEN:

```text
node --test lib/decoration/image-crop.test.mjs
7 tests passed, 0 failed
```

The tests cover rotation normalization, fixed aspect ratio, crop clamping, rotated bounds, maximum size, no upscale, filenames, EXIF decode options, MIME/quality selection, invalid dimensions, decode rejection, null blobs, and resource cleanup.

## Verification

- `node --test lib/decoration/image-crop.test.mjs`: 7 passed.
- `node --test lib/decoration/*.test.mjs`: 112 passed.
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0, with the pre-existing unrelated unused eslint-disable warning in `app/(app)/odc/reports/page.tsx:108`.
- `npm run build`: exit 0 outside the restricted sandbox after the sandboxed attempt was denied permission to bind Turbopack's internal processing port; all 46 routes were generated as static content.
- `npm ls react-easy-crop --depth=0`: `react-easy-crop@6.2.2`.

The pre-existing uncommitted `next-env.d.ts` change was not staged or committed.

Planned commit message: `feat(decoration): add bounded image crop export`.
