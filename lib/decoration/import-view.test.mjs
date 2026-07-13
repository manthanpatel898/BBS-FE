import test from 'node:test';
import assert from 'node:assert/strict';
import { filterImportRows, validateImportFile } from './import-view.ts';

test('accepts bounded csv and xlsx files only', () => {
  assert.equal(validateImportFile({ name: 'records.csv', size: 1024 }), null);
  assert.equal(validateImportFile({ name: 'records.xlsx', size: 1024 }), null);
  assert.match(validateImportFile({ name: 'records.xls', size: 1024 }) ?? '', /CSV or XLSX/);
  assert.match(validateImportFile({ name: 'large.csv', size: 5 * 1024 * 1024 + 1 }) ?? '', /5 MB/);
});

test('filters valid invalid and warning preview rows', () => {
  const rows = [
    { rowNumber: 2, isValid: true, warnings: [], errors: [] },
    { rowNumber: 3, isValid: false, warnings: [], errors: ['Bad date'] },
    { rowNumber: 4, isValid: true, warnings: ['Missing follow-up date'], errors: [] },
  ];
  assert.deepEqual(filterImportRows(rows, 'valid').map((row) => row.rowNumber), [2, 4]);
  assert.deepEqual(filterImportRows(rows, 'invalid').map((row) => row.rowNumber), [3]);
  assert.deepEqual(filterImportRows(rows, 'warning').map((row) => row.rowNumber), [4]);
});
