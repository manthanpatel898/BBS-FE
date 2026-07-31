# Decoration Hindi PDF Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Hindi, Gujarati, English, and mixed-language decoration notes correctly in downloaded PDFs.

**Architecture:** Bundle Noto Sans Devanagari beside the existing Gujarati font and introduce a grapheme-safe script-run abstraction shared by text measurement and PDF drawing. Booking Notes and General Notes will use the same paginated Unicode renderer, keeping existing English/Gujarati output compatible and server-independent.

**Tech Stack:** NestJS, TypeScript, PDFKit/fontkit, Graphemer, Poppler verification tools.

## Global Constraints

- Change only event-decoration customer PDF generation.
- Do not depend on operating-system fonts.
- Preserve note content, order, newlines, paragraphs, punctuation, numbers, and `₹`.
- Replace unsupported color emoji pictographs with stable bullet markers.
- Existing English and Gujarati output must remain readable.
- No API, frontend, database, index, or migration change is required.

---

### Task 1: Add script-aware text contracts and a failing regression

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`

**Interfaces:**
- Produces: `DecorationPdfTextRun` and `decorationPdfTextRuns(value)`.
- Consumes: normalized Unicode note text.

- [ ] **Step 1: Write failing font-selection tests**

Add assertions for:

```ts
assert.equal(decorationPdfFontForText("हिंदी नोट"), "NotoSansDevanagari");
assert.deepEqual(
  decorationPdfTextRuns("Gujarati ગુજરાતી | Hindi हिंदी | English"),
  [
    { text: "Gujarati ", font: "Helvetica" },
    { text: "ગુજરાતી", font: "NotoSansGujarati" },
    { text: " | Hindi ", font: "Helvetica" },
    { text: "हिंदी", font: "NotoSansDevanagari" },
    { text: " | English", font: "Helvetica" },
  ],
);
```

Runs must split only at grapheme boundaries so vowel signs and conjuncts are
never separated from their base characters.

- [ ] **Step 2: Write a failing real-PDF regression**

Use a fixture containing Hindi paragraphs, Gujarati, English, `₹500`, blank
lines, and emoji markers in both `notes` and `generalNotes`. Assert a valid PDF
is returned and later verify both embedded font names.

- [ ] **Step 3: Run the focused spec and confirm failure**

```bash
cd apps/BBS-BE
npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
```

Expected: Hindi font/run assertions fail because Devanagari is not supported.

---

### Task 2: Bundle and register Noto Sans Devanagari

**Files:**
- Create: `apps/BBS-BE/src/assets/fonts/NotoSansDevanagari.ttf`
- Create: `apps/BBS-BE/src/assets/fonts/OFL-NotoSansDevanagari.txt`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`

**Interfaces:**
- Produces registered PDF font name `NotoSansDevanagari`.
- Uses the existing Nest `assets/**/*` build-copy configuration.

- [ ] **Step 1: Add the official Noto font and license**

Use the official Noto Devanagari release. Keep the upstream filename content
unchanged and include its SIL OFL 1.1 license and copyright notice.

- [ ] **Step 2: Register both Indic fonts at PDF creation**

```ts
pdf.registerFont("NotoSansGujarati", GUJARATI_FONT_PATH);
pdf.registerFont("NotoSansDevanagari", DEVANAGARI_FONT_PATH);
```

- [ ] **Step 3: Implement grapheme-safe script detection**

Classify `U+0900-U+097F` as Devanagari, `U+0A80-U+0AFF` as Gujarati, and all
remaining graphemes as Helvetica. Merge adjacent runs using the same font.

- [ ] **Step 4: Run the focused font/run tests**

Run the Task 1 command and expect the font-selection assertions to pass.

---

### Task 3: Use one Unicode renderer for Notes and General Notes

**Files:**
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.ts`
- Modify: `apps/BBS-BE/src/modules/decoration-bookings/decoration-customer-pdf.spec.ts`

**Interfaces:**
- Consumes: `decorationPdfTextRuns(value)`.
- Produces: measured and rendered paginated text blocks.

- [ ] **Step 1: Add a shared measurement function**

Measure text using the exact font runs used for drawing. Preserve explicit
newline boundaries and compute the maximum line height from fonts appearing on
that line. Keep the current note card width and line gap.

- [ ] **Step 2: Add a shared drawing function**

Draw script runs with PDFKit's continued text mode while retaining the current
x position, wrapping width, colors, and paragraph spacing. Reset continued mode
at every explicit newline and at the end of each block.

- [ ] **Step 3: Replace single-font note rendering**

Use the shared renderer in both `drawNotes` and `drawGeneralNotes`. Pagination
must use the shared measurement result so the final line cannot clip.

- [ ] **Step 4: Run the focused PDF regression**

```bash
cd apps/BBS-BE
WRITE_DECORATION_PDF_FIXTURE=1 npx ts-node src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
```

Expect all existing and new PDF assertions to pass.

---

### Task 4: Visual and production verification

**Files:**
- Verify: `apps/BBS-BE/tmp/pdfs/decoration-proposal-hindi.pdf`
- Verify: `apps/BBS-BE/dist/assets/fonts/`

- [ ] **Step 1: Inspect embedded fonts and extracted structure**

```bash
cd apps/BBS-BE
pdffonts tmp/pdfs/decoration-proposal-hindi.pdf
pdftotext -layout tmp/pdfs/decoration-proposal-hindi.pdf -
```

Confirm embedded subsets for both Noto Sans Devanagari and Noto Sans Gujarati.

- [ ] **Step 2: Render every Hindi fixture page**

```bash
mkdir -p tmp/pdfs/rendered-hindi
pdftoppm -png -r 144 tmp/pdfs/decoration-proposal-hindi.pdf tmp/pdfs/rendered-hindi/page
```

Visually verify conjuncts, matras, `₹`, bullets, mixed-language lines,
paragraph spacing, page continuation, and lack of clipping.

- [ ] **Step 3: Run backend regression and production build**

```bash
for spec in src/modules/decoration-bookings/*.spec.ts; do npx ts-node "$spec"; done
npm run lint
npm run build
test -f dist/assets/fonts/NotoSansGujarati.ttf
test -f dist/assets/fonts/NotoSansDevanagari.ttf
git diff --check
```

- [ ] **Step 4: Commit the backend change**

```bash
git add src/assets/fonts src/modules/decoration-bookings/decoration-customer-pdf.ts src/modules/decoration-bookings/decoration-customer-pdf.spec.ts
git commit -m "fix: render Hindi notes in decoration PDFs"
```

- [ ] **Step 5: Confirm final state**

Report the commit and verification results, and state explicitly that deployment
requires only the updated backend build and no database migration.
