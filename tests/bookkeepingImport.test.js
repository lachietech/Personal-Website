import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanAmount,
  guessColumn,
  importFingerprint,
  looksDuplicate,
  normalizeDate,
  parseCsv
} from "../public/static/clientportal/js/bookkeeping/import-utils.js";

test("CSV parsing supports escaped quotes and embedded commas", () => {
  const rows = parseCsv('Date,Description,Amount\n2026-01-02,"Coffee, ""team""",-12.50');

  assert.deepEqual(rows, [
    ["Date", "Description", "Amount"],
    ["2026-01-02", 'Coffee, "team"', "-12.50"]
  ]);
});

test("bank values and Australian dates are normalized", () => {
  assert.equal(cleanAmount("($1,234.50)"), -1234.5);
  assert.equal(normalizeDate("31/1/2026"), "2026-01-31");
});

test("column guessing and duplicate matching are reusable", () => {
  assert.equal(guessColumn(["Posted Date", "Merchant"], "description"), 1);

  const transaction = {
    date: "2026-01-01",
    type: "expense",
    amount: 25,
    description: "Example Software",
    debitAccount: "Software",
    creditAccount: "Checking"
  };
  const existing = [{ ...transaction, id: "existing" }];

  assert.equal(looksDuplicate(transaction, existing), true);
  assert.equal(importFingerprint(transaction).length > 0, true);
});
