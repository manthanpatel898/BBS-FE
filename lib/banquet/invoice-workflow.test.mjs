import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../../lib/auth/api.ts', import.meta.url), 'utf8');
const modal = fs.readFileSync(
  new URL('../../components/bookings/banquet-invoice-modal.tsx', import.meta.url),
  'utf8',
);
const bookingPage = fs.readFileSync(
  new URL('../../app/(app)/bookings/page.tsx', import.meta.url),
  'utf8',
);

assert.match(api, /fetchBanquetInvoicePreview/);
assert.match(api, /issueBanquetInvoice/);
assert.match(api, /downloadBanquetInvoice/);
assert.match(modal, /Customer GSTIN \(optional\)/);
assert.match(modal, /Percentage/);
assert.match(modal, /Download PDF/);
assert.match(bookingPage, /billingEnabled/);
assert.match(bookingPage, /BanquetInvoiceModal/);
