import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../../app/(app)/bookings/page.tsx', import.meta.url),
  'utf8',
);

assert.match(source, /mobileFullScreen/);
assert.match(source, /data-package-wizard-header="true"/);
assert.match(source, /data-package-wizard-scroll="true"/);
assert.doesNotMatch(
  source,
  /data-package-wizard-content="true"[^>]*pb-24/,
  'the mobile wizard must not reserve an artificial footer-sized blank area',
);
assert.match(source, /Save · \{selectedPackageItemCount\} items/);
