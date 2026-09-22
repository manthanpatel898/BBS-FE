import assert from "node:assert/strict";
import { previewInvoiceNumbers } from "./invoice-numbering";
const config = {
  format: "NUMBER_YEAR" as const,
  prefix: "",
  minimumDigits: 1,
  yearStyle: "FULL" as const,
  resetAnnually: true,
  startingNumber: 1,
};
assert.deepEqual(previewInvoiceNumbers(config, "2026-27", 12), [
  "12/2026-2027",
  "13/2026-2027",
  "14/2026-2027",
]);
assert.equal(
  previewInvoiceNumbers(
    {
      ...config,
      format: "PREFIX_YEAR_NUMBER",
      prefix: "LB",
      yearStyle: "SHORT",
      minimumDigits: 5,
    },
    "2026-27",
    1,
  )[0],
  "LB/2026-27/00001",
);
assert.throws(() => previewInvoiceNumbers(config, "2026-27", 0));
assert.throws(
  () =>
    previewInvoiceNumbers(
      { ...config, format: "PREFIX_NUMBER" },
      "2026-27",
      12,
    ),
  /year/i,
);
assert.throws(
  () =>
    previewInvoiceNumbers(
      { ...config, format: "PREFIX_NUMBER_YEAR", prefix: "LONGPREFIX" },
      "2026-27",
      12,
    ),
  /16/,
);
console.log("Invoice numbering preview tests passed");
