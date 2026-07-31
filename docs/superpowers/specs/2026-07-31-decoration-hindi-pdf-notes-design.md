# Decoration Hindi PDF Notes Design

## Goal

Ensure event-decoration booking notes and general notes remain readable in
downloaded PDFs when users enter Hindi, Gujarati, English, or a combination of
these languages.

## Font Strategy

- Continue bundling Noto Sans Gujarati for Gujarati text.
- Bundle Noto Sans Devanagari for Hindi/Devanagari text under the SIL Open Font
  License.
- Continue using Helvetica for plain English text.
- Copy both bundled font files and their license information into the NestJS
  production build. The renderer must not depend on fonts installed on the
  application server.

## Script-Aware Rendering

- Detect Gujarati characters with Unicode range `U+0A80-U+0AFF`.
- Detect Devanagari characters with Unicode range `U+0900-U+097F`.
- Split multiline notes into script-compatible blocks while preserving every
  newline and paragraph break.
- Render Gujarati blocks with Noto Sans Gujarati, Devanagari blocks with Noto
  Sans Devanagari, and English-only blocks with Helvetica.
- For a line containing more than one Indic script, split it into grapheme-safe
  runs and render each run with the matching embedded font without changing the
  original text order.
- Continue replacing unsupported color emoji pictographs with stable bullet
  markers. Preserve currency symbols, punctuation, numbers, and plain text.

## PDF Coverage

- Apply script-aware rendering to booking Notes.
- Apply the same behaviour to decoration General Notes.
- Reuse the script-aware measurement logic for pagination so text is measured
  with the same font used during rendering.
- Prevent clipping, overlap, lost paragraphs, and broken page continuation for
  long Hindi or mixed-language notes.

## Compatibility

- Existing English and Gujarati PDF behaviour remains unchanged.
- Browser View and Event Detail already use browser Unicode fonts and require no
  visual change.
- No API, schema, frontend form, or database migration is required.
- Banquet PDFs remain unchanged.

## Testing and Verification

- Add unit coverage for English, Gujarati, Hindi, and mixed-script font
  selection.
- Add a PDF regression fixture containing real Hindi paragraphs, Gujarati text,
  English text, `₹`, line breaks, and emoji markers.
- Verify the generated PDF embeds both Noto Indic fonts.
- Extract text as a structural check and render every affected PDF page to PNG
  for visual inspection.
- Run decoration PDF regressions, backend lint, backend build, and confirm both
  fonts are copied into `dist/assets/fonts`.
