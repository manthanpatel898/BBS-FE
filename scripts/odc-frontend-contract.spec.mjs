import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const api = readFileSync(new URL('../lib/auth/api.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/auth/types.ts', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../components/layouts/app-layout.tsx', import.meta.url), 'utf8');
const bookingModeToggle = readFileSync(new URL('../components/bookings/booking-mode-toggle.tsx', import.meta.url), 'utf8');
const bookingsPage = readFileSync(new URL('../app/(app)/bookings/page.tsx', import.meta.url), 'utf8');
const odcInquiriesPage = readFileSync(new URL('../app/(app)/odc/inquiries/page.tsx', import.meta.url), 'utf8');

for (const exportName of [
  'fetchOdcCategories',
  'createOdcCategory',
  'updateOdcCategory',
  'deleteOdcCategory',
  'fetchOdcMenus',
  'createOdcMenu',
  'updateOdcMenu',
  'deleteOdcMenu',
  'fetchOdcOrders',
  'fetchOdcCalendarOrders',
  'fetchOdcSummaryReport',
  'createOdcOrder',
  'fetchOdcOrderById',
  'updateOdcOrderStatus',
  'addOdcOrderFollowUp',
  'addOdcAdvancePayment',
]) {
  assert.match(api, new RegExp(`export async function ${exportName}\\b`));
}

for (const endpoint of ['/odc/categories', '/odc/menus', '/odc/orders']) {
  assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')));
}

for (const typeName of [
  'OdcCategory',
  'OdcMenu',
  'OdcOrder',
  'OdcCalendarOrder',
  'OdcSummaryReport',
  'OdcOrderStatus',
  'PaginatedOdcCategories',
  'PaginatedOdcMenus',
  'PaginatedOdcOrders',
]) {
  assert.match(types, new RegExp(`interface ${typeName}\\b|type ${typeName}\\b`));
}

assert.equal(
  existsSync(new URL('../app/(app)/odc/categories/page.tsx', import.meta.url)),
  true,
);
assert.equal(
  existsSync(new URL('../app/(app)/odc/menus/page.tsx', import.meta.url)),
  true,
);
assert.equal(
  existsSync(new URL('../app/(app)/odc/inquiries/page.tsx', import.meta.url)),
  true,
);
assert.equal(
  existsSync(new URL('../app/(app)/odc/reports/page.tsx', import.meta.url)),
  true,
);
assert.match(layout, /canAccessOdc/);
assert.match(layout, /\/odc\/categories/);
assert.match(layout, /\/odc\/menus/);
assert.doesNotMatch(layout, /label: 'ODC Inquiries'/);
assert.match(bookingModeToggle, /data-booking-mode-toggle/);
assert.match(bookingModeToggle, /href="\/bookings"/);
assert.match(bookingModeToggle, /href="\/odc\/inquiries"/);
assert.match(bookingsPage, /data-booking-calendar-toolbar[\s\S]*<BookingModeToggle activeMode="banquet"/);
assert.match(odcInquiriesPage, /data-booking-calendar-toolbar[\s\S]*<BookingModeToggle activeMode="odc"/);
assert.match(bookingsPage, /isCalendarActionsOpen[\s\S]*<BookingModeToggle activeMode="banquet"/);
assert.match(bookingsPage, /isCalendarActionsOpen[\s\S]*Search/);
assert.match(odcInquiriesPage, /isCalendarActionsOpen[\s\S]*<BookingModeToggle activeMode="odc"/);
assert.match(odcInquiriesPage, /aria-label="Search ODC inquiries"/);
assert.match(odcInquiriesPage, /calendarSearchResults/);
assert.match(odcInquiriesPage, /search: calendarSearchQuery/);
