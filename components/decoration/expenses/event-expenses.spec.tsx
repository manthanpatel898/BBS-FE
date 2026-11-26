import '@/lib/decoration/image-crop-test-dom.mjs';
import React from 'react';
import { strict as assert } from 'node:assert';
import { afterEach, test } from 'node:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppRouterContext, AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AuthProvider } from '@/components/auth/auth-provider';
import { DecorationBooking } from '@/lib/auth/types';
import { EventExpenses } from './event-expenses';
import { DecorationEventAccount } from './event-account';
import { DecorationExpenseReport } from './expense-report';
import { ExpenseTypesSettings } from './expense-types-settings';
import DecorationReportsPage from '@/app/(app)/decoration/reports/page';
import { PaidExpense } from '@/lib/decoration/expenses/domain';

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); window.localStorage.clear(); globalThis.fetch = originalFetch; });
const router = { replace() {}, push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;
const booking = { id: '111111111111111111111111', packageRate: 60000, isPackagePriceFinalized: true } as DecorationBooking;
const type = { id: '222222222222222222222222', name: 'Restaurant commission', kind: 'PERCENTAGE', isActive: true };
const entry: PaidExpense = { id: '333333333333333333333333', bookingId: booking.id, typeId: type.id, typeName: 'Restaurant commission', kind: 'PERCENTAGE', value: 10, baseAmount: 50000, amount: 5000, paidDate: '2026-01-01', mode: 'CASH', remark: 'Already paid', recordedBy: 'Test User', updatedBy: 'Test User', revision: 0 };
function mount(component: React.ReactNode, permissions: string[], query = '', addon = true) {
  window.localStorage.setItem('banquate_auth_session', JSON.stringify({ savedAt: Date.now(), session: { accessToken: 'test-token', user: { id: 'test-user', firstName: 'Test', lastName: 'User', role: 'employee', businessType: 'EVENT_DECORATION', canAccessEventExpenses: addon, effectivePermissions: permissions } } }));
  return render(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/decoration/events"><SearchParamsContext.Provider value={new URLSearchParams(query)}><AuthProvider>{component}</AuthProvider></SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
}
const ok = (data: unknown) => Response.json({ success: true, message: 'OK', data });

test('manage-only employee can record a paid percentage expense using current finalized price', async () => {
  let saved: Record<string, unknown> | null = null;
  globalThis.fetch = async (url, init) => {
    if (init?.method === 'POST') { saved = JSON.parse(String(init.body)); return ok(entry); }
    return ok(String(url).endsWith('/types') ? [type] : []);
  };
  mount(<EventExpenses booking={booking} />, ['decoration.expenses.manage']);
  const add = await screen.findByRole('button', { name: 'Add Expense' });
  await waitFor(() => assert.equal((add as HTMLButtonElement).disabled, false));
  fireEvent.click(add);
  fireEvent.change(screen.getByLabelText('Percentage (%)'), { target: { value: '10' } });
  assert.ok(screen.getByText(/Paid expense: ₹6,000.00/));
  fireEvent.click(screen.getByRole('button', { name: 'Save paid expense' }));
  await waitFor(() => assert.ok(saved));
  assert.equal((saved as unknown as Record<string, unknown>).value, 10);
  assert.equal((saved as unknown as Record<string, unknown>).typeId, type.id);
  assert.equal((saved as unknown as Record<string, unknown>).mode, 'CASH');
  await waitFor(() => assert.equal(screen.queryByRole('form'), null));
});

test('editing a percentage entry keeps the recorded basis until explicit recalculation is selected', async () => {
  let saved: Record<string, unknown> | null = null;
  globalThis.fetch = async (url, init) => {
    if (init?.method === 'PATCH') { saved = JSON.parse(String(init.body)); return ok(entry); }
    return ok(String(url).endsWith('/types') ? [type] : [entry]);
  };
  mount(<EventExpenses booking={booking} />, ['decoration.expenses.manage']);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Restaurant commission' }));
  assert.ok(screen.getByText(/Paid expense: ₹5,000.00/));
  fireEvent.click(screen.getByRole('checkbox', { name: /Use current finalized event price/ }));
  assert.ok(screen.getByText(/Paid expense: ₹6,000.00/));
  fireEvent.click(screen.getByRole('button', { name: 'Save paid expense' }));
  await waitFor(() => assert.ok(saved));
  assert.equal((saved as unknown as Record<string, unknown>).recalculate, true);
  assert.equal((saved as unknown as Record<string, unknown>).revision, 0);
  await waitFor(() => assert.equal(screen.queryByRole('form'), null));
});

test('view-only employee sees recorded expenses without editing actions', async () => {
  globalThis.fetch = async (url) => ok(String(url).endsWith('/types') ? [type] : [entry]);
  mount(<EventExpenses booking={booking} />, ['decoration.expenses.view']);
  assert.ok(await screen.findByText('Restaurant commission'));
  assert.equal(screen.queryByRole('button', { name: 'Add Expense' }), null);
  assert.equal(screen.queryByRole('button', { name: /^Edit/ }), null);
});

test('account statement shows customer dues separately from expenses and hides export without permission', async () => {
  globalThis.fetch = async (url) => ok(String(url).includes('/events?') ? { items: [], totalPages: 0 } : {
    event: { id: booking.id, bookingNumber: 'DEC-001', customerName: 'Customer', functionName: 'Wedding', eventDate: '2026-11-26', status: 'CONFIRMED', venueName: 'Venue' },
    totals: { finalizedPrice: 50000, received: 30000, outstanding: 20000, totalExpenses: 7000, margin: 43000, receivedLessExpenses: 23000 }, payments: [], expenses: [entry],
  });
  mount(<DecorationEventAccount />, ['decoration.accounts.view'], `event=${booking.id}`);
  assert.ok((await screen.findAllByText('₹20,000.00')).length >= 1);
  assert.ok(screen.getByText('₹43,000.00'));
  assert.ok(screen.getByRole('option', { name: /Wedding · Customer/ }));
  assert.ok(screen.getAllByText('Customer balance pending').length >= 1);
  assert.equal(screen.queryByRole('button', { name: 'Export Excel' }), null);
});

test('company expense type manager can deactivate a type without removing its history', async () => {
  let saved: Record<string, unknown> | null = null;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'PATCH') { saved = JSON.parse(String(init.body)); return ok({ ...type, isActive: false }); }
    return ok([{ ...type, isActive: saved ? false : true }]);
  };
  mount(<ExpenseTypesSettings />, ['decoration.expense_types.manage']);
  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
  await screen.findByRole('button', { name: 'Activate' });
  assert.equal((saved as unknown as Record<string, unknown>).isActive, false);
  assert.ok(screen.getByText('Restaurant commission'));
});


test('expense report shows full-filter totals and sends paid-date filters when applied', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.includes('/report?')) {
      requests.push(path);
      return ok({ items: [entry], total: 7000, count: 3, page: 1, totalPages: 1, daily: [{ _id: '2026-01-01', total: 7000, count: 3 }], byEvent: [] });
    }
    return ok(path.endsWith('/types') ? [type] : { items: [], totalPages: 0 });
  };
  mount(<DecorationExpenseReport />, ['decoration.expenses.view']);
  await screen.findByText('Total paid expenses · all matching records');
  assert.ok(screen.getAllByText('₹7,000.00').length > 0);
  assert.ok(screen.getByText('₹5,000.00'));
  fireEvent.change(screen.getByLabelText('Paid from'), { target: { value: '2026-01-01' } });
  fireEvent.change(screen.getByLabelText('Paid through'), { target: { value: '2026-01-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => assert.equal(requests.length, 2));
  assert.equal(new URL(requests[1]).searchParams.get('dateFrom'), '2026-01-01');
  assert.equal(new URL(requests[1]).searchParams.get('dateTo'), '2026-01-31');
  await screen.findByText('Total paid expenses · all matching records');
  assert.equal(screen.queryByRole('button', { name: 'Export Excel' }), null);
});


test('unchecked add-on hides the event expense section and makes no expense API calls', async () => {
 let calls=0;
 globalThis.fetch=async()=>{calls+=1;return ok([]);};
 const view=mount(<EventExpenses booking={booking}/>, ['decoration.expenses.view','decoration.expenses.manage','decoration.accounts.view'], '', false);
 assert.equal(view.container.textContent, '');
 assert.equal(calls,0);
});
test('unchecked add-on hides both financial report cards while retaining ordinary reports', () => {
 mount(<DecorationReportsPage/>, ['decoration.reports.view','decoration.expenses.view','decoration.accounts.view'], '', false);
 assert.equal(screen.queryByRole('link',{name:/Expense Report/}),null);
 assert.equal(screen.queryByRole('link',{name:/Event Account Statement/}),null);
 assert.ok(screen.getByRole('link',{name:/Booking Report/}));
});
test('direct account, report and expense type surfaces cannot load data without the add-on', () => {
 let calls=0;
 globalThis.fetch=async()=>{calls+=1;return ok([]);};
 for(const component of [<DecorationEventAccount key="account"/>,<DecorationExpenseReport key="report"/>,<ExpenseTypesSettings key="types"/>]) {
  mount(component, ['decoration.accounts.view','decoration.expenses.view','decoration.expense_types.manage'], `event=${booking.id}`, false);
  assert.ok(screen.getByText(/add-on is not enabled/));
  cleanup();
 }
 assert.equal(calls,0);
});
