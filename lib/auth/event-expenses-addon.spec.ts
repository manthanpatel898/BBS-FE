import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canAccessEventExpenses, isEventExpenseRoute } from './event-expenses-addon';
test('paid expense access requires explicit entitlement on an event company', () => {
 assert.equal(canAccessEventExpenses(null), false);
 assert.equal(canAccessEventExpenses({ businessType: 'EVENT_DECORATION' }), false);
 assert.equal(canAccessEventExpenses({ businessType: 'EVENT_DECORATION', canAccessEventExpenses: true }), true);
 assert.equal(canAccessEventExpenses({ businessType: 'BANQUET', canAccessEventExpenses: true }), false);
});
test('only the addon pages are gated, leaving normal event reports available', () => {
 assert.equal(isEventExpenseRoute('/decoration/reports/accounts/'), true);
 assert.equal(isEventExpenseRoute('/decoration/reports/expenses'), true);
 assert.equal(isEventExpenseRoute('/decoration/reports/view'), false);
 assert.equal(isEventExpenseRoute('/decoration/events'), false);
});


import { getHomeRouteForUser } from './navigation';
import { AuthUser } from './types';
test('an expense-only employee is not sent into a disabled paid report', () => {
 const user={businessType:'EVENT_DECORATION',role:'employee',effectivePermissions:['decoration.expenses.view'],canAccessEventExpenses:false} as AuthUser;
 assert.equal(getHomeRouteForUser(user),'/access-denied');
 assert.equal(getHomeRouteForUser({...user,canAccessEventExpenses:true}),'/decoration/reports/expenses');
});
