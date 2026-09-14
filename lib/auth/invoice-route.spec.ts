import { strict as assert } from 'node:assert';
import { isRouteAllowedForBusiness } from './business-routes';
for (const path of ['/invoices', '/invoices/']) {
  assert.equal(isRouteAllowedForBusiness(path, 'BANQUET'), true);
  assert.equal(isRouteAllowedForBusiness(path, null), true);
  assert.equal(isRouteAllowedForBusiness(path, 'EVENT_DECORATION'), false);
}
assert.equal(isRouteAllowedForBusiness('/invoices-other', 'BANQUET'), false);
console.log('Invoice business-route regression passed');
