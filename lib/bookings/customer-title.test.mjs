import assert from 'node:assert/strict';
import test from 'node:test';
import {
  composeCustomerDisplayName,
  parseCustomerDisplayName,
} from './customer-title.ts';

test('parses supported titles from existing customer names', () => {
  assert.deepEqual(parseCustomerDisplayName('Mr Rahul Shah'), {
    title: 'Mr',
    name: 'Rahul Shah',
  });
  assert.deepEqual(parseCustomerDisplayName('Mrs Priya Patel'), {
    title: 'Mrs',
    name: 'Priya Patel',
  });
  assert.deepEqual(parseCustomerDisplayName('Ms Asha Mehta'), {
    title: 'Ms',
    name: 'Asha Mehta',
  });
});

test('treats unsupported or absent titles as none', () => {
  assert.deepEqual(parseCustomerDisplayName('Dr Kiran Shah'), {
    title: 'None',
    name: 'Dr Kiran Shah',
  });
  assert.deepEqual(parseCustomerDisplayName('Amit Mehta'), {
    title: 'None',
    name: 'Amit Mehta',
  });
});

test('composes names without duplicate title prefixes', () => {
  assert.equal(composeCustomerDisplayName('Mr', 'Rahul Shah'), 'Mr Rahul Shah');
  assert.equal(composeCustomerDisplayName('Mr', 'Mr Rahul Shah'), 'Mr Rahul Shah');
  assert.equal(composeCustomerDisplayName('None', 'Mrs Priya Patel'), 'Priya Patel');
  assert.equal(composeCustomerDisplayName('Mrs', '  Priya   Patel  '), 'Mrs Priya Patel');
});
