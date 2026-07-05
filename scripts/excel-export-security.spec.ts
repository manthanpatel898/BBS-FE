import { strict as assert } from 'node:assert';
import { escapeCsvValue, sanitizeSpreadsheetCellValue } from '../lib/excel';

assert.equal(sanitizeSpreadsheetCellValue('=HYPERLINK("https://example.com")'), '\'=HYPERLINK("https://example.com")');
assert.equal(sanitizeSpreadsheetCellValue('+SUM(1,2)'), "'+SUM(1,2)");
assert.equal(sanitizeSpreadsheetCellValue('-10+20'), "'-10+20");
assert.equal(sanitizeSpreadsheetCellValue('@cmd'), "'@cmd");
assert.equal(sanitizeSpreadsheetCellValue('   =SUM(1,2)'), "'   =SUM(1,2)");
assert.equal(sanitizeSpreadsheetCellValue('Regular text'), 'Regular text');
assert.equal(sanitizeSpreadsheetCellValue(42), 42);
assert.equal(sanitizeSpreadsheetCellValue(null), null);

assert.equal(escapeCsvValue('=1+1'), '"\'=1+1"');
assert.equal(escapeCsvValue('hello "world"'), '"hello ""world"""');
