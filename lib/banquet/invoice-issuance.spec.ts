import { strict as assert } from 'assert';
import { buildBanquetInvoiceIssuePayload } from './invoice-issuance';

const minimal = buildBanquetInvoiceIssuePayload({
  customerName: '  Manthan Patel  ',
  customerMobile: '  9999999999  ',
  customerAddress: '   ',
  customerState: '',
  customerCountry: '',
  customerGstNumber: '',
  discountType: 'NONE',
  discountValue: 0,
});

assert.deepEqual(minimal, {
  customerName: 'Manthan Patel',
  customerMobile: '9999999999',
  customerCountry: 'India',
});

const detailed = buildBanquetInvoiceIssuePayload({
  customerName: 'Manthan Patel',
  customerMobile: '9999999999',
  customerAddress: '  Ahmedabad  ',
  customerState: ' Gujarat ',
  customerCountry: ' India ',
  customerGstNumber: '  24abcde1234f1z5  ',
  discountType: 'FIXED',
  discountValue: 50_000,
});

assert.deepEqual(detailed, {
  customerName: 'Manthan Patel',
  customerMobile: '9999999999',
  customerAddress: 'Ahmedabad',
  customerState: 'Gujarat',
  customerCountry: 'India',
  customerGstNumber: '24ABCDE1234F1Z5',
  discountType: 'FIXED',
  discountValue: 50_000,
});
