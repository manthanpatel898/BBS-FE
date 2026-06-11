import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const api = readFileSync(new URL('../lib/auth/api.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/auth/types.ts', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../components/layouts/app-layout.tsx', import.meta.url), 'utf8');

for (const exportName of [
  'fetchOdcCategories',
  'createOdcCategory',
  'updateOdcCategory',
  'deleteOdcCategory',
  'fetchOdcMenus',
  'createOdcMenu',
  'updateOdcMenu',
  'deleteOdcMenu',
  'fetchOdcCustomers',
  'createOdcCustomer',
  'updateOdcCustomer',
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

for (const endpoint of ['/odc/categories', '/odc/menus', '/odc/customers', '/odc/orders']) {
  assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')));
}

for (const typeName of [
  'OdcCategory',
  'OdcMenu',
  'OdcCustomer',
  'OdcOrder',
  'OdcCalendarOrder',
  'OdcSummaryReport',
  'OdcOrderStatus',
  'PaginatedOdcCategories',
  'PaginatedOdcMenus',
  'PaginatedOdcCustomers',
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
  existsSync(new URL('../app/(app)/odc/customers/page.tsx', import.meta.url)),
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
assert.match(layout, /\/odc\/customers/);
assert.match(layout, /\/odc\/inquiries/);
assert.match(layout, /\/odc\/reports/);
