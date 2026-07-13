import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBusinessHomeRoute,
  isRouteAllowedForBusiness,
  getDecorationRoutePermission,
  getDecorationHomeRoute,
} from './business-routes.ts';

test('keeps missing and banquet business types on existing routes', () => {
  assert.equal(getBusinessHomeRoute(undefined), '/dashboard');
  assert.equal(getBusinessHomeRoute('BANQUET'), '/dashboard');
  assert.equal(isRouteAllowedForBusiness('/bookings', undefined), true);
});

test('selects a permitted decoration landing page without redirect loops', () => {
  assert.equal(getDecorationHomeRoute(['decoration.view']), '/decoration/dashboard');
  assert.equal(
    getDecorationHomeRoute(['decoration.bookings.view']),
    '/decoration/events',
  );
  assert.equal(getDecorationHomeRoute([]), '/access-denied');
});

test('maps decoration routes to explicit RBAC permissions', () => {
  assert.equal(getDecorationRoutePermission('/decoration/dashboard'), 'decoration.view');
  assert.equal(getDecorationRoutePermission('/decoration/events/123'), 'decoration.bookings.view');
  assert.equal(getDecorationRoutePermission('/decoration/reports'), 'decoration.reports.view');
  assert.equal(getDecorationRoutePermission('/decoration/import'), 'decoration.import.manage');
  assert.equal(
    getDecorationRoutePermission('/decoration/configuration'),
    'decoration.configuration.view',
  );
  assert.equal(getDecorationRoutePermission('/employees'), null);
});

test('routes decoration companies into their isolated module', () => {
  assert.equal(
    getBusinessHomeRoute('EVENT_DECORATION'),
    '/decoration/dashboard',
  );
  assert.equal(
    isRouteAllowedForBusiness('/decoration/dashboard', 'EVENT_DECORATION'),
    true,
  );
  assert.equal(
    isRouteAllowedForBusiness('/bookings', 'EVENT_DECORATION'),
    false,
  );
});

test('prevents banquet companies from manually opening decoration routes', () => {
  assert.equal(
    isRouteAllowedForBusiness('/decoration/dashboard', 'BANQUET'),
    false,
  );
  assert.equal(isRouteAllowedForBusiness('/settings', 'BANQUET'), true);
});

test('keeps shared routes accessible to both businesses', () => {
  for (const route of ['/employees', '/audit-logs', '/reset-password']) {
    assert.equal(isRouteAllowedForBusiness(route, 'BANQUET'), true);
    assert.equal(isRouteAllowedForBusiness(route, 'EVENT_DECORATION'), true);
  }
});
