# Frontend dependency security update

The September 2026 deployment audit blocked GHSA-2883-XCG3-V3HH,
GHSA-2XP9-VWFH-VXW4, GHSA-P293-QW3H-JR36 and GHSA-RGJ7-G3M4-5G8C.

The lockfile now resolves Next.js and eslint-config-next to 16.3.5,
sharp to 0.35.4 (including patched native libraries), and js-yaml to 4.3.2.
The audit policy and its severity threshold are unchanged.

The updated build surfaced existing feedback test typing errors. Callback
results are now collected in typed arrays, and JSDOM declarations are installed
as a development dependency. No application workflows or API contracts changed.

Verify using `npm ci`, `npm run audit:ci`, `npm run lint` and `npm run build`.
Run feedback, invoice, quotation, advance-payment, spreadsheet-export and
dashboard regression tests before rollout. No database migration is required.
