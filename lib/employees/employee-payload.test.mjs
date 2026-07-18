import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildEmployeeCreatePayload,
  buildEmployeeUpdatePayload,
} from './employee-payload.ts';

const managerForm = {
  firstName: 'Manthan',
  lastName: 'Patel',
  username: 'manthan3',
  displayRole: 'Manager',
  contactNo: '8980938142',
  password: '',
  isActive: true,
  canAccessOdc: true,
  permissions: [],
};

test('employee edit omits an unchanged password', () => {
  const payload = buildEmployeeUpdatePayload(managerForm, 'BANQUET');
  assert.equal('password' in payload, false);
});

test('employee edit includes a trimmed explicit password change', () => {
  const payload = buildEmployeeUpdatePayload(
    { ...managerForm, password: '  Secure123  ' },
    'BANQUET',
  );
  assert.equal(payload.password, 'Secure123');
});

test('event-decoration employee payloads omit ODC configuration', () => {
  const update = buildEmployeeUpdatePayload(managerForm, 'EVENT_DECORATION');
  const create = buildEmployeeCreatePayload(
    { ...managerForm, password: 'Secure123' },
    'EVENT_DECORATION',
  );
  assert.equal('canAccessOdc' in update, false);
  assert.equal('canAccessOdc' in create, false);
});

test('banquet Manager payload retains ODC configuration', () => {
  assert.equal(
    buildEmployeeUpdatePayload(managerForm, 'BANQUET').canAccessOdc,
    true,
  );
  assert.equal(
    buildEmployeeUpdatePayload(
      { ...managerForm, displayRole: 'Company Admin' },
      'BANQUET',
    ).canAccessOdc,
    false,
  );
});

test('employee screen gates ODC controls by business type', async () => {
  const source = await readFile(
    new URL('../../app/(app)/employees/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /user\?\.businessType !== 'EVENT_DECORATION'/);
  assert.match(source, /buildEmployeeUpdatePayload/);
  assert.match(source, /buildEmployeeCreatePayload/);
});
