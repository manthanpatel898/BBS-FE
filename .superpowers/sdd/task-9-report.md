# Task 9 Report: Custom Decoration Crop Integration

## Implemented

- Custom Camera / gallery now validates and materializes the selected source before opening the reusable 4:3 crop modal. No upload begins until crop confirmation, and only the revalidated cropped `File` reaches the existing upload API.
- Crop, confirmed-retry, and upload states are separate. Cancel returns to the unchanged selection chooser; catalog choices and custom editor values survive crop open/cancel; a failed upload retains the confirmed crop for an explicit retry.
- A synchronous upload lock prevents duplicate confirm/retry requests before React rerenders. Selection and upload generations ignore out-of-order materialization, stale completion, and completion after unmount; successful upload creates exactly one custom editor.
- Only upload-related controls, parent close/save, and crop actions are blocked while the upload is active. Catalog choice/edit controls remain usable.
- The shared modal viewport lifecycle now has stack ownership: Escape targets only the top layer and reference-counted body locking remains active until the final modal unmounts. The crop portal remains at `z-[80]` above selection at `z-[75]`; existing crop behavior retains backdrop-only close, focus return, and busy close protection.
- Review follow-up: Camera / gallery is a genuinely focusable button that owns the hidden file input. The selection flow passes its explicit focus ref into the crop modal and restores it after Cancel, Escape, successful Confirm, and upload settlement; busy upload disables both the trigger and file input.
- No API, schema, or saved custom snapshot contract changed. The pre-existing `next-env.d.ts` content was preserved.

## Behavioral TDD Evidence

- RED: all four initial integration/lifecycle regressions failed: the custom chooser uploaded immediately, no crop integration seams/state existed, and one Escape event closed both nested modal owners.
- GREEN: the real React tests cover crop-first Camera/gallery, inert cancel, catalog/custom form preservation, cropped-byte identity, exactly-one editor, synchronous duplicate blocking, failed-upload retry identity, unrelated-control availability, out-of-order selection, stale/unmount completion, and React Strict Mode replay.
- Nested modal tests cover top-layer-only Escape and body-lock ownership; the existing real crop suite covers mobile viewport sizing, mouse drag, touch pinch, backdrop, busy blocking, focus trapping, and focus restoration.
- A real nested selection + actual crop-modal regression proves focus returns to Camera / gallery after Cancel, Escape, and Confirm. Shared lifecycle regressions additionally cover parent-first/out-of-order unmount, exact pre-existing overflow restoration, React Strict Mode effect replay, and a blocked top layer preventing both itself and the underlying parent from closing.

## Verification

- Focused integration and modal behavior suites passed.
- All 120 decoration tests, TypeScript, full ESLint, static Next.js build, and `git diff --check` passed in the final verification run recorded with the Task 9 commit.
