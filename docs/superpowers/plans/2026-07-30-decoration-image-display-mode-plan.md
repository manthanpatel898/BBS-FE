# Decoration Image Display Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve whether a decoration image was cropped or uploaded in full, and render it consistently in fixed boxes across the event module and customer PDF.

**Architecture:** Add a backward-compatible `COVER | CONTAIN` presentation value at the upload boundary, propagate it through catalog images, custom uploads, drafts, immutable snapshots and customer documents, then centralize frontend and PDF fit resolution. Missing legacy values resolve to `COVER`; no migration is required.

**Tech Stack:** React 19, Next.js 16, TypeScript, NestJS 11, Mongoose 8, multipart FormData, PDFKit.

## Global Constraints

- `Crop & Use` produces `COVER`.
- `Use Full Image` produces `CONTAIN`.
- Missing legacy values resolve to `COVER`.
- Fixed image-box dimensions and responsive layouts remain unchanged.
- Invalid values are rejected at backend upload boundaries.
- Banquet module behavior must not change.
- No database migration is required.

---

### Task 1: Define and validate the backend display-mode contract

**Files:**
- Create: `apps/BBS-BE/src/modules/upload/decoration-image-display-mode.ts`
- Create: `apps/BBS-BE/src/modules/upload/decoration-image-display-mode.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/schemas/decoration-item.schema.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/decoration-catalog.controller.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-catalog/decoration-catalog.service.ts`
- Modify: custom-image controller/service under `apps/BBS-BE/src/modules/decoration-bookings/`

**Interfaces:**
- Produces: `DecorationImageDisplayMode = 'COVER' | 'CONTAIN'`
- Produces: `normalizeDecorationImageDisplayMode(value: unknown): DecorationImageDisplayMode`
- Upload responses include `displayMode`.

- [ ] **Step 1: Write failing normalization and upload-boundary tests**

Assert that `COVER` and `CONTAIN` survive normalization, a missing value becomes `COVER`, and unsupported values throw a `BadRequestException`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx ts-node src/modules/upload/decoration-image-display-mode.spec.ts`

- [ ] **Step 3: Implement validation and persistence**

Add the display mode to catalog image metadata, multipart request parsing, upload service results, catalog API mapping and custom-image responses.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the new spec, backend lint and backend build.

### Task 2: Propagate display mode through selection drafts and snapshots

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.service.spec.ts`
- Modify: relevant reservation/selection specs.
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/lib/decoration/notes-builder-state.ts`

**Interfaces:**
- Snapshot image: `{ key: string; url: string; displayMode: 'COVER' | 'CONTAIN' }`
- Customer-document image uses the same shape.

- [ ] **Step 1: Write failing snapshot and customer-document tests**

Assert that explicit `CONTAIN` survives save/mapping and legacy missing values become `COVER`.

- [ ] **Step 2: Run focused tests and verify RED**

Run the customer-document and selection specs directly with `ts-node`.

- [ ] **Step 3: Implement minimal propagation**

Copy the mode from catalog/custom selection data into drafts, saved snapshot lines and customer-document output.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused test set, backend lint and backend build.

### Task 3: Honor the mode in all frontend image boxes

**Files:**
- Create: `apps/BBS-FE/lib/decoration/image-display-mode.ts`
- Create: `apps/BBS-FE/lib/decoration/image-display-mode.test.ts`
- Modify: `apps/BBS-FE/components/decoration/decoration-image-crop-modal.tsx`
- Modify: catalog/settings, inventory picker/gallery, notes editor, snapshot gallery and customer-document components.
- Modify: crop/upload integration behavior tests.

**Interfaces:**
- Produces: `decorationImageFitClass(mode): 'object-cover' | 'object-contain'`
- Crop modal confirmation returns `(file, displayMode)`.

- [ ] **Step 1: Write failing mode and crop-action tests**

Assert legacy `undefined` maps to `object-cover`, `CONTAIN` maps to `object-contain`, Crop emits `COVER`, and Use Full Image emits `CONTAIN`.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run the display-mode and crop behavior specs with `tsx --test`.

- [ ] **Step 3: Implement upload propagation and rendering**

Pass mode through FormData and component state, then replace unconditional `object-cover` usage on decoration images with the shared resolver while retaining neutral fixed containers.

- [ ] **Step 4: Run focused frontend tests and verify GREEN**

Run decoration tests, frontend lint and static build.

### Task 4: Honor display mode in downloaded PDF and complete regression

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

**Interfaces:**
- PDF `COVER` uses PDFKit `{ cover: [width, height] }`.
- PDF `CONTAIN` uses PDFKit `{ fit: [width, height] }`.

- [ ] **Step 1: Write a failing PDF fit-mode test**

Render one `COVER` and one `CONTAIN` item and assert the PDF image calls use the corresponding PDFKit option.

- [ ] **Step 2: Run the PDF spec and verify RED**

Run: `npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

- [ ] **Step 3: Implement mode-aware PDF rendering**

Resolve legacy missing mode to `COVER` and select `cover` or `fit` per item without changing card geometry.

- [ ] **Step 4: Run complete verification**

Run backend lint/build and focused decoration specs; run frontend lint/build and all decoration specs; run `git diff --check` in both repositories.

- [ ] **Step 5: Commit independently in backend and frontend**

Use clear commits describing the image display-mode contract and rendering behavior.

