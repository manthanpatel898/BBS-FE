import { strict as assert } from 'node:assert';
import { formatApiErrorMessage } from './api';
assert.equal(
  formatApiErrorMessage({
    message: [
      'customerGstNumber must be a valid GSTIN',
      'customerState is required',
    ],
  }),
  'customerGstNumber must be a valid GSTIN. customerState is required',
);
assert.equal(
  formatApiErrorMessage({ message: 'Invoice is already cancelled.' }),
  'Invoice is already cancelled.',
);
assert.equal(
  formatApiErrorMessage({ message: [] }, 'Unable to issue invoice.'),
  'Unable to issue invoice.',
);
