import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../../app/(app)/restaurants/page.tsx', import.meta.url),
  'utf8',
);

assert.doesNotMatch(
  source,
  /invoicePriceMode:\s*'GST_EXCLUSIVE'/,
  'Server-controlled invoicePriceMode must not be sent by the restaurant form',
);
