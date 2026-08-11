import assert from "node:assert/strict";
import test from "node:test";
import { validateSalesSeries } from "../src/backend/hfssuniformsapp/utils/salesValidation.js";

test("validateSalesSeries returns schema-safe primitive values", () => {
  assert.deepEqual(validateSalesSeries([" Jan 2026 "], ["12"]), {
    months: ["Jan 2026"],
    sales: [12],
  });
});

test("validateSalesSeries rejects objects and invalid numeric values", () => {
  assert.throws(() => validateSalesSeries([{ $gt: "" }], [1]), /string/);
  assert.throws(() => validateSalesSeries(["Jan 2026"], [{ $gt: 0 }]), /numbers/);
  assert.throws(() => validateSalesSeries(["Jan 2026"], [-1]), /non-negative/);
});
