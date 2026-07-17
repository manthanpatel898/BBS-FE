# Decoration Customer PDF and Image Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a branded decoration proposal with true PDF download plus a reusable fixed-4:3 crop workflow for catalog and custom decoration images.

**Architecture:** The backend produces one tenant-scoped customer-document DTO used by the frontend View/Print page and by a dedicated PDFKit renderer. The frontend downloads PDF bytes through an authenticated helper and uses a reusable `react-easy-crop` modal plus an isolated canvas export utility before either existing upload API is called.

**Tech Stack:** NestJS 11, Mongoose 8, PDFKit, Next.js 16 static export, React 19, TypeScript 5.8, react-easy-crop, browser Canvas API, S3 images, Node assertion tests.

## Global Constraints

- Keep every frontend route static and query-string based; do not add dynamic route segments.
- Keep View/Download/Print gated by `decoration.print`, a non-inquiry booking, and a non-empty immutable decoration snapshot.
- Generate true `application/pdf` downloads; Download must never depend on the browser print dialog.
- Use A4 portrait output and the banquet print header language: company logo, company name, and configured contact numbers.
- Put Event Type inside Event & Venue in HTML, PDF, and print output.
- Use one fixed 4:3 landscape crop and a maximum output of 1600 x 1200.
- Do not retroactively modify existing catalog or snapshot images.
- Preserve all current upload MIME, byte-signature, size, image-count, S3 ownership, tenant, RBAC, and audit protections.
- Preserve all existing banquet behavior.

---

### Task 1: Normalized customer-document contract

**Files:**
- Create (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.ts`
- Create (backend test): `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-document.spec.ts`
- Modify (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Modify (frontend): `apps/BBS-FE/lib/auth/types.ts`

**Interfaces:**
- Produces: `DecorationCustomerDocument` with `company`, `booking`, `customer`, `event`, and `categories` sections.
- Produces: `buildDecorationCustomerDocument(booking, company): DecorationCustomerDocument`.
- Consumes: mapped immutable `DecorationBooking` and restaurant branding.

- [ ] **Step 1: Write the failing contract test**

Create assertions covering category grouping, Event Type under `event.eventType`, company fallback contacts, custom items, optional descriptions, and image-null preservation:

```ts
const document = buildDecorationCustomerDocument(booking, company);
assert.equal(document.company.name, 'Zen Events');
assert.deepEqual(document.company.contactNumbers, ['9876543210']);
assert.equal(document.event.eventType, 'Wedding');
assert.equal(document.categories[0].items[0].quantity, 2);
assert.equal(document.categories[1].items[0].isCustom, true);
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/BBS-BE && npx ts-node src/modules/decoration-bookings/decoration-customer-document.spec.ts`

Expected: compilation fails because `decoration-customer-document.ts` does not exist.

- [ ] **Step 3: Implement the pure contract builder**

Define explicit serializable types and group snapshot lines without mutating the booking:

```ts
export interface DecorationCustomerDocument {
  company: { name: string; logoUrl: string | null; contactNumbers: string[] };
  booking: { id: string; bookingNumber: string; status: string };
  customer: { name: string; mobile: string };
  event: { eventType: string; startDate: string; endDate: string; startTime: string; endTime: string; timeSlot: string; location: string; hall: string | null; address: string | null };
  categories: Array<{ id: string; name: string; items: Array<{ itemName: string; quantity: number; description: string | null; image: { key: string; url: string } | null; isCustom: boolean }> }>;
}
```

- [ ] **Step 4: Hydrate company branding in the service**

Inject `RestaurantsService`, call `findOneOrFailForUser(user.restaurantId)`, call the existing customer-document availability assertion first, then return the normalized DTO rather than a raw booking. Do not expose restaurant contact-person fields when configured `contactNumbers` exist.

- [ ] **Step 5: Mirror the exact DTO in frontend types**

Add `DecorationCustomerDocument` to `lib/auth/types.ts`; keep `DecorationBooking` unchanged.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
cd apps/BBS-BE
npx ts-node src/modules/decoration-bookings/decoration-customer-document.spec.ts
npm run build
```

Expected: assertions pass and Nest build exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/modules/decoration-bookings
git commit -m "feat(decoration): normalize customer document data"
```

Commit the frontend type in the matching frontend task commit if repositories are separate.

---

### Task 2: Bounded remote image loader and PDF renderer

**Files:**
- Modify (backend): `apps/BBS-BE/package.json`
- Modify (backend): `apps/BBS-BE/package-lock.json`
- Create (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-pdf-image-loader.ts`
- Create (backend test): `apps/BBS-BE/src/modules/decoration-bookings/decoration-pdf-image-loader.spec.ts`
- Create (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Create (backend test): `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

**Interfaces:**
- Consumes: `DecorationCustomerDocument` from Task 1.
- Produces: `loadPdfImage(url, options): Promise<Buffer | null>`.
- Produces: `renderDecorationCustomerPdf(document, loadImage): Promise<Buffer>`.

- [ ] **Step 1: Install the focused PDF dependency**

Run: `cd apps/BBS-BE && npm install pdfkit && npm install --save-dev @types/pdfkit`

Expected: only PDFKit and its required dependency graph are added; Chromium/Puppeteer is not added.

- [ ] **Step 2: Write failing image-loader tests**

Use a local HTTP test server and assert: JPEG/PNG/WebP accepted, non-2xx rejected, non-image content rejected, content-length over 8 MB rejected, streamed bytes over 8 MB aborted, redirect count bounded, and timeout returns `null`.

```ts
assert.equal(await loadPdfImage(`${origin}/text`, limits), null);
assert.equal(await loadPdfImage(`${origin}/slow`, { ...limits, timeoutMs: 20 }), null);
assert.ok(await loadPdfImage(`${origin}/image`, limits));
```

- [ ] **Step 3: Verify loader RED, then implement**

Run the spec, confirm missing export, then implement with `AbortController`, `redirect: 'follow'`, an allow-list of image content types, an 8 MB hard cap, and no exception leakage for an individual image.

- [ ] **Step 4: Write failing PDF renderer tests**

Assert PDF magic bytes (`%PDF-`), a valid `%%EOF`, page count greater than one for a long selection, renderer completion when every image loader call returns `null`, and deterministic sanitized filename helper output. Content placement is covered by the normalized-contract assertions and rendered-PDF visual verification because PDFKit encodes text operators internally.

```ts
const pdf = await renderDecorationCustomerPdf(document, async () => null);
assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
assert.equal(pdf.toString('latin1').includes('%%EOF'), true);
assert.ok((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length > 1);
```

- [ ] **Step 5: Implement the A4 renderer**

Use PDFKit with fixed margins, reusable `drawHeader`, `ensureSpace`, `drawInfoTable`, `drawCategory`, and `drawItemCard` functions. Add page numbers, repeat a compact header after page one, use 4:3 image boxes, and never split one item card across pages.

- [ ] **Step 6: Render and visually inspect a fixture PDF**

Write the test fixture under `tmp/pdfs/decoration-proposal.pdf`, render it with:

```bash
pdftoppm -png tmp/pdfs/decoration-proposal.pdf tmp/pdfs/decoration-proposal
```

Inspect every PNG for clipping, broken glyphs, page breaks, image aspect ratio, and header consistency; keep fixtures out of git.

- [ ] **Step 7: Verify and commit**

Run both specs plus `npm run build` and `npm run lint`, then commit:

```bash
git add package.json package-lock.json src/modules/decoration-bookings
git commit -m "feat(decoration): render branded customer PDFs"
```

---

### Task 3: Authenticated PDF endpoint, headers, and audit

**Files:**
- Modify (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.controller.ts`
- Modify (backend): `apps/BBS-BE/src/modules/decoration-bookings/decoration-bookings.service.ts`
- Create (backend test): `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf-endpoint.spec.ts`

**Interfaces:**
- Produces: `GET /decoration/bookings/:id/customer-document.pdf`.
- Consumes: `renderDecorationCustomerPdf` and normalized document builder.

- [ ] **Step 1: Write failing endpoint/service tests**

Cover correct tenant, wrong tenant, missing permission, inquiry, confirmed-without-snapshot, successful PDF, sanitized filename, `Cache-Control: no-store`, and one audit record only after successful rendering.

- [ ] **Step 2: Verify RED**

Run the new spec and confirm the route/service method is missing.

- [ ] **Step 3: Implement one shared authorization/data method**

Extract `getCustomerDocument(user, id)` so JSON and PDF paths share ownership and availability checks. Add `customerDocumentPdf(user, id)` that renders and audits without weakening controller guards.

- [ ] **Step 4: Stream the PDF response**

Use `@Res({ passthrough: true }) response: Response`, set:

```ts
response.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="${filename}"`,
  'Cache-Control': 'private, no-store, max-age=0',
});
return new StreamableFile(pdf);
```

- [ ] **Step 5: Verify and commit**

Run endpoint spec, document specs, build, and lint. Commit with `feat(decoration): add customer PDF download endpoint`.

---

### Task 4: Frontend PDF download workflow and action routing

**Files:**
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Create: `apps/BBS-FE/lib/decoration/customer-document-download.ts`
- Create: `apps/BBS-FE/lib/decoration/customer-document-download.test.mjs`
- Modify: `apps/BBS-FE/components/decoration/decoration-event-detail-modal.tsx`
- Modify: `apps/BBS-FE/app/(app)/decoration/print/page.tsx`
- Create: `apps/BBS-FE/lib/decoration/customer-document-actions.test.mjs`

**Interfaces:**
- Produces: `downloadDecorationCustomerPdf(token, bookingId): Promise<{ blob: Blob; filename: string }>`.
- Produces: `saveDownloadedPdf(result): void` with guaranteed object-URL cleanup.

- [ ] **Step 1: Write failing download tests**

Test PDF content-type validation, `Content-Disposition` parsing, safe fallback filename, 401 session-expiry handling, API error extraction, object URL click, URL revocation, and duplicate-request prevention.

- [ ] **Step 2: Verify RED and implement the API helper**

Fetch the `.pdf` endpoint with bearer authentication, require an OK response and `application/pdf`, and never use `authorizedRequest` JSON parsing for binary content.

- [ ] **Step 3: Write failing action-routing tests**

Assert View and Print remain query-string links, Download is a button invoking the binary helper, View does not call print, and Print waits for readiness.

- [ ] **Step 4: Implement Download busy/error state**

Move only Download into an event handler. Keep View/Print static links. Disable Download while active, show `Downloading…`, surface a non-destructive error inside Event Detail, and revoke object URLs in `finally`.

- [ ] **Step 5: Make Print image-aware**

In the print page, wait for `document.fonts.ready` and every printable image to complete or fail before invoking `window.print()` for `mode=print`. Remove automatic printing for `mode=download`.

- [ ] **Step 6: Verify and commit**

Run focused tests, all decoration tests, `npx tsc --noEmit`, lint, and static build. Commit with `feat(decoration): download customer proposal PDFs`.

---

### Task 5: Branded HTML View and Print layout

**Files:**
- Modify: `apps/BBS-FE/lib/auth/types.ts`
- Modify: `apps/BBS-FE/lib/auth/api.ts`
- Modify: `apps/BBS-FE/app/(app)/decoration/print/page.tsx`
- Create: `apps/BBS-FE/components/decoration/decoration-customer-document.tsx`
- Create: `apps/BBS-FE/lib/decoration/customer-document-layout.test.mjs`

**Interfaces:**
- Consumes: normalized `DecorationCustomerDocument` from Task 1.
- Produces: `DecorationCustomerDocumentView({ document })` shared by View and Print modes.

- [ ] **Step 1: Write the failing layout regression**

Assert company logo/name/contacts exist in the header; `Event Type` occurs inside the Event & Venue section; no event-type subtitle remains in the document header; snapshot groups use the normalized categories; and print CSS defines A4/page-break behavior.

- [ ] **Step 2: Verify RED and implement the shared component**

Follow the banquet header structure from `app/print/order/print-order-view.tsx`. Omit the logo block and contact row when missing. Use semantic headings, compact tables, robust image fallbacks, and 4:3 image containers.

- [ ] **Step 3: Replace raw booking rendering**

Update `fetchDecorationCustomerDocument` to return the normalized DTO. Keep the print route query-only and preserve its Back behavior.

- [ ] **Step 4: Verify responsive and print states**

Check phone, tablet, desktop, and print preview. Confirm long descriptions wrap, missing images do not collapse cards, and category groups/page headers do not overlap.

- [ ] **Step 5: Verify and commit**

Run focused/all decoration tests, TypeScript, lint, and build. Commit with `refactor(decoration): align customer document with banquet print`.

---

### Task 6: Crop geometry and image export utility

**Files:**
- Modify: `apps/BBS-FE/package.json`
- Modify: `apps/BBS-FE/package-lock.json`
- Create: `apps/BBS-FE/lib/decoration/image-crop.ts`
- Create: `apps/BBS-FE/lib/decoration/image-crop.test.mjs`

**Interfaces:**
- Produces: `normalizeCropRotation(value): 0 | 90 | 180 | 270`.
- Produces: `calculateCropOutput(source, crop, rotation, max): CropOutputPlan`.
- Produces: `exportDecorationCrop(file, cropPixels, rotation): Promise<File>`.

- [ ] **Step 1: Install crop UI dependency**

Run: `cd apps/BBS-FE && npm install react-easy-crop`.

- [ ] **Step 2: Write failing pure geometry tests**

Cover 4:3 enforcement, 90/270 dimension swap, crop clamping, max 1600 x 1200, small-image no-upscale, normalized rotations, and deterministic output filenames.

- [ ] **Step 3: Verify RED and implement pure helpers**

Keep math independent of DOM APIs so Node tests execute it directly.

- [ ] **Step 4: Implement canvas export**

Use `createImageBitmap(file, { imageOrientation: 'from-image' })`, a rotated source canvas, crop coordinates from react-easy-crop, a bounded output canvas, and `canvas.toBlob`. Export transparent sources as PNG and opaque sources as JPEG at quality `0.88`; always return a `File` with a matching extension/MIME.

- [ ] **Step 5: Add lifecycle/error tests**

Use injected bitmap/canvas adapters to test zero dimensions, decode rejection, null blob, cleanup, MIME selection, and no-upscale behavior without a real browser canvas.

- [ ] **Step 6: Verify and commit**

Run focused tests, TypeScript, and build. Commit with `feat(decoration): add bounded image crop export`.

---

### Task 7: Reusable mobile crop modal

**Files:**
- Create: `apps/BBS-FE/components/decoration/decoration-image-crop-modal.tsx`
- Create: `apps/BBS-FE/lib/decoration/image-crop-modal.test.mjs`
- Reuse: `apps/BBS-FE/components/ui/body-portal.tsx`
- Reuse: `apps/BBS-FE/components/ui/use-modal-viewport.ts`

**Interfaces:**
- Produces: `DecorationImageCropModal({ file, busy, onCancel, onConfirm })`.
- Consumes: `exportDecorationCrop` from Task 6.

- [ ] **Step 1: Write failing component/source regressions**

Assert `aspect={4 / 3}`, zoom range, 90-degree rotate, reset, cancel, confirm, accessible labels, safe-area classes, body portal, modal viewport ownership, and original-trigger focus restoration callback.

- [ ] **Step 2: Verify RED and implement the modal**

Use a full-height mobile sheet and centered desktop dialog. Keep the original `File`, crop position, zoom, rotation, crop pixels, processing error, and object URL local to the modal.

- [ ] **Step 3: Implement cleanup and close protection**

Revoke the source preview URL exactly once; block backdrop/Escape close while exporting; return the confirmed cropped `File`; do not upload from inside the crop modal.

- [ ] **Step 4: Verify interaction**

Test mouse drag, touch/pinch, zoom keyboard controls, rotate/reset, Cancel, Confirm, error retry, mobile scrolling lock, and focus return.

- [ ] **Step 5: Verify and commit**

Run tests, TypeScript, lint, and build. Commit with `feat(decoration): add mobile image crop modal`.

---

### Task 8: Catalog image crop integration

**Files:**
- Modify: `apps/BBS-FE/components/decoration/settings/decoration-catalog-section.tsx`
- Modify: `apps/BBS-FE/lib/decoration/catalog-images.ts`
- Modify: `apps/BBS-FE/lib/decoration/catalog-images.test.mjs`
- Create: `apps/BBS-FE/lib/decoration/catalog-crop-integration.test.mjs`

**Interfaces:**
- Consumes: `DecorationImageCropModal` and cropped `File`.
- Preserves: existing `uploadDecorationItemImage` and `createDecorationItemWithOptionalImage` contracts.

- [ ] **Step 1: Write failing integration regressions**

Assert both Add Item initial image and existing-item Camera/Gallery selection open the crop modal; no upload occurs before Confirm; Cancel causes no state/upload change; Confirm revalidates and uploads only the cropped file; upload failure retains the cropped file for retry.

- [ ] **Step 2: Verify RED and add crop state**

Introduce one pending source file and one confirmed cropped file per active upload workflow. Do not place crop state in global settings state.

- [ ] **Step 3: Preserve validations and retry**

Run `materializeDecorationImageFile` before opening crop and again on the cropped result. Preserve the 12-image count check. Clear retained crop only after successful upload or explicit replacement/cancel of the parent form.

- [ ] **Step 4: Verify and commit**

Run focused catalog/crop tests, all decoration tests, TypeScript, lint, and build. Commit with `feat(decoration): crop catalog images before upload`.

---

### Task 9: Custom decoration crop integration

**Files:**
- Modify: `apps/BBS-FE/components/decoration/decoration-selection-modal.tsx`
- Create: `apps/BBS-FE/lib/decoration/custom-crop-integration.test.mjs`

**Interfaces:**
- Consumes: `DecorationImageCropModal` and `uploadCustomDecorationImage`.
- Produces no API/schema changes; saved custom snapshot structure remains unchanged.

- [ ] **Step 1: Write failing integration regressions**

Assert Camera/Gallery opens crop first, parent selections remain intact, Cancel returns to Choose Decoration, Confirm uploads only cropped bytes, successful upload adds one custom editor, duplicate Confirm is blocked, and failed upload retains the crop for retry.

- [ ] **Step 2: Verify RED and implement pending-crop state**

Keep crop and upload as distinct states so modal closure cannot lose current catalog choices/custom form values. Disable only relevant upload/save actions while processing.

- [ ] **Step 3: Verify mobile nested-popup behavior**

Confirm the crop portal sits above Choose Decoration, Escape/backdrop closes only the crop layer, body scroll remains locked, and closing crop restores focus to Camera/Gallery.

- [ ] **Step 4: Verify and commit**

Run focused selection/crop tests, all decoration tests, TypeScript, lint, and build. Commit with `feat(decoration): crop custom selection images`.

---

### Task 10: End-to-end regression and release checklist

**Files:**
- Modify: `apps/BBS-FE/docs/superpowers/plans/2026-07-17-decoration-customer-pdf-and-image-crop.md` to mark completed checkboxes only after evidence.
- No production changes unless verification finds a defect.

- [x] **Step 1: Run complete backend verification**

```bash
cd apps/BBS-BE
npx ts-node src/modules/decoration-bookings/decoration-customer-document.spec.ts
npx ts-node src/modules/decoration-bookings/decoration-pdf-image-loader.spec.ts
npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
npx ts-node src/modules/decoration-bookings/decoration-customer-pdf-endpoint.spec.ts
npm run build
npm run lint
```

Expected: all new specs pass, build exits 0, and no new lint error/warning is introduced.

- [x] **Step 2: Run complete frontend verification**

```bash
cd apps/BBS-FE
node --test lib/decoration/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: zero test failures, TypeScript/build exit 0, and no new lint error/warning.

- [ ] **Step 3: Verify document scenarios**

Manually test: missing logo, multiple contacts, single/multi-day event, banquet with hall, outdoor venue without hall, custom items, missing snapshot image, long descriptions, enough items for three PDF pages, View, direct PDF Download, and Print.

- [ ] **Step 4: Verify crop scenarios**

On phone/tablet/desktop test: camera JPEG with EXIF rotation, gallery PNG transparency, WebP, 8 MB boundary, invalid renamed file, very small image, portrait image, extreme zoom, 90/180/270 rotation, Cancel, Confirm, failed upload retry, and nested popup close hierarchy.

- [x] **Step 5: Render final PDFs for visual QA**

Render representative downloaded PDFs with `pdftoppm`, inspect every page, and require zero clipping, overlap, broken image, unreadable text, or incorrect page numbering.

- [ ] **Step 6: Confirm migration and deployment requirements**

No database migration is expected. Confirm backend deployment installs PDFKit, frontend deployment installs react-easy-crop, S3/network policy permits server-side reads of snapshot images, and static route generation remains successful.

- [x] **Step 7: Final commits**

Commit checklist evidence separately in the frontend repository with `docs(decoration): complete PDF and crop verification`. Do not push or merge unless explicitly requested.
