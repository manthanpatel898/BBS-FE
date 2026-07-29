# Full Decoration Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the complete decoration image while optimizing it for reliable mobile upload through Nginx, NestJS, and S3.

**Architecture:** Add a shared browser-side full-image exporter beside the existing crop exporter and route “Use Full Image” through it. Retain the 8 MB application file limit, normalize Multer limit failures into a friendly 413 response, and configure Nginx separately for 10 MB request bodies.

**Tech Stack:** Next.js, React, TypeScript, Canvas API, Node test runner, NestJS, Multer, Nginx.

## Global Constraints

- Full-image mode must preserve the entire frame and original aspect ratio.
- The longest edge must not exceed 2400 pixels and images must never be upscaled.
- Opaque images use JPEG quality 0.88; transparent images remain PNG.
- Application file limit remains 8 MB; Nginx request limit is 10 MB.
- Existing crop behavior, S3 paths, audit logging, and banquet flows must not change.

---

### Task 1: Shared full-image optimizer

**Files:**
- Modify: `lib/decoration/image-crop.ts`
- Modify: `lib/decoration/image-crop.test.mjs`

**Interfaces:**
- Produces: `exportDecorationFullImage(file, adapters?): Promise<File>`
- Preserves: existing `exportDecorationCrop`

- [x] **Step 1: Write failing unit tests**

Add tests proving the full exporter preserves aspect ratio, limits the longest edge to 2400, does not upscale smaller images, uses JPEG for opaque pixels, retains PNG for transparency, and releases bitmap/canvas resources.

- [x] **Step 2: Run tests and verify RED**

Run: `node --import tsx --test lib/decoration/image-crop.test.mjs`

Expected: FAIL because `exportDecorationFullImage` is not exported.

- [x] **Step 3: Implement minimal optimizer**

Decode with the existing orientation-aware adapter, calculate bounded contain dimensions, draw the complete bitmap once, detect transparency, encode using existing canvas behavior, and return a `File` with a `-full` filename.

- [x] **Step 4: Run tests and verify GREEN**

Run: `node --import tsx --test lib/decoration/image-crop.test.mjs`

Expected: all image crop/full-image tests pass.

### Task 2: Route “Use Full Image” through optimizer

**Files:**
- Modify: `components/decoration/decoration-image-crop-modal.tsx`
- Modify: `lib/decoration/image-crop-modal.behavior.test.tsx`
- Modify: `lib/decoration/custom-crop-integration.behavior.test.tsx`
- Modify: `lib/decoration/catalog-crop-integration.behavior.test.tsx`

**Interfaces:**
- Consumes: `exportDecorationFullImage`
- Produces: optimized file through the existing `onConfirm(file)` callback

- [x] **Step 1: Write failing interaction tests**

Assert that “Use Full Image” invokes the injected full-image exporter and forwards its returned file, while crop mode still invokes only the crop exporter.

- [x] **Step 2: Run tests and verify RED**

Run: `node --import tsx --test lib/decoration/image-crop-modal.behavior.test.tsx`

Expected: FAIL because the modal currently forwards original bytes.

- [x] **Step 3: Implement modal integration**

Add an injectable `exportFullImage` seam defaulting to the shared optimizer and await it before `onConfirm`.

- [x] **Step 4: Run focused integration tests**

Run: `node --import tsx --test lib/decoration/image-crop-modal.behavior.test.tsx lib/decoration/custom-crop-integration.behavior.test.tsx lib/decoration/catalog-crop-integration.behavior.test.tsx`

Expected: all pass.

### Task 3: Friendly backend upload-limit response

**Files:**
- Modify: `src/modules/decoration-selection/decoration-custom-upload.controller.ts`
- Create: `src/modules/decoration-selection/decoration-image-upload.filter.ts`
- Create: `src/modules/decoration-selection/decoration-image-upload.filter.spec.ts`

**Interfaces:**
- Produces: `DECORATION_IMAGE_MAX_BYTES = 8 * 1024 * 1024`
- Produces: route-scoped Multer exception filter translating `LIMIT_FILE_SIZE` to HTTP 413 and “Image must be 8 MB or smaller.”

- [x] **Step 1: Write failing backend tests**

Test the shared maximum and the conversion of Multer’s `LIMIT_FILE_SIZE` error into the standard HTTP 413 response envelope.

- [x] **Step 2: Run tests and verify RED**

Run: `npx ts-node src/modules/decoration-selection/decoration-image-upload.filter.spec.ts`

Expected: FAIL because the helper does not exist.

- [x] **Step 3: Implement and connect the limit**

Use the shared constant in `FileInterceptor` and apply an exception filter/interceptor limited to this upload endpoint so unrelated errors are unchanged.

- [x] **Step 4: Run test and backend checks**

Run: `npx ts-node src/modules/decoration-selection/decoration-image-upload.filter.spec.ts && npm run lint && npm run build`

Expected: test passes, lint has zero errors, build succeeds.

### Task 4: Complete regressions and deployment handoff

**Files:**
- Modify: this checklist as tasks complete

- [x] **Step 1: Run frontend decoration regression**

Run: `node --import tsx --test lib/decoration/*.test.mjs lib/decoration/*.behavior.test.tsx`

Expected: all pass.

- [x] **Step 2: Run frontend lint and static build**

Run: `npm run lint && npm run build`

Expected: both succeed.

- [x] **Step 3: Verify diffs and commit each repository**

Commit frontend image optimization separately from backend upload error handling.

- [x] **Step 4: Provide production Nginx commands**

Document how to locate the `api.zenbooking.in` server block, back up configuration, add `client_max_body_size 10M;`, validate with `nginx -t`, reload without restart, and verify a diagnostic upload.
