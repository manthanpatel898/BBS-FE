import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./invoice-calculation.ts', import.meta.url), 'utf8');
assert.match(source, /Math\.round\(\(grossPaise \* discountValue\) \/ 10_000\)/);
assert.match(source, /advanceReceivedPaise/);
