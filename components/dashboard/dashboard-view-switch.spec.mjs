import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardViewSwitch } from './dashboard-view-switch.tsx';
import { SinglePageDashboard } from './single-page-dashboard.tsx';
import { props } from './single-page-dashboard.spec.tsx';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://local.test' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const root = createRoot(document.getElementById('root'));
const render = async (id) => act(() => root.render(React.createElement(DashboardViewSwitch, { key: id, userId: id, restaurantId: 'venue' }, (view) => React.createElement('p', { id: 'view' }, view))));
await render('alice');
assert.equal(document.getElementById('view').textContent, 'current');
await act(() => document.querySelectorAll('button')[1].click());
assert.equal(document.getElementById('view').textContent, 'new');
await render('bob');
assert.equal(document.getElementById('view').textContent, 'current');
await render('alice');
assert.equal(document.getElementById('view').textContent, 'new');
const opened = [];
await act(() => root.render(React.createElement(SinglePageDashboard, { ...props, onSelectRecordType: (type) => opened.push(type) })));
for (const label of ['Inquiries · Last 7 Days', 'Confirmed · Last 7 Days', 'Follow Ups', 'Completed Event', 'Closed Inquiries']) {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes(label));
  assert.ok(button, label);
  await act(() => button.click());
}
assert.deepEqual(opened, ['recent_inquiries', 'recent_confirmed', 'followups', 'completed', 'cancelled']);
await act(() => root.unmount());
dom.window.close();
console.log('Dashboard switch interaction and account change passed');
