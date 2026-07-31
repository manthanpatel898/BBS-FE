import { strict as assert } from 'assert';
import { decorationCustomerRows } from './customer-details';

assert.deepEqual(
  decorationCustomerRows({
    name: 'Asha Shah',
    mobile: '9123456789',
    alternativeMobile: '9000000000',
    address: '  44 Sunrise Society\nAhmedabad  ',
  }),
  [
    ['Name', 'Asha Shah'],
    ['Mobile', '9123456789'],
    ['Alternative mobile', '9000000000'],
    ['Address', '44 Sunrise Society\nAhmedabad'],
  ],
);

assert.deepEqual(
  decorationCustomerRows({
    name: 'Legacy Customer',
    mobile: '9123456789',
  }),
  [
    ['Name', 'Legacy Customer'],
    ['Mobile', '9123456789'],
  ],
);

assert.equal(
  decorationCustomerRows({
    name: 'Blank Address',
    mobile: '9123456789',
    address: ' \n ',
  }).some(([label]) => label === 'Address'),
  false,
);
