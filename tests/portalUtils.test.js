import assert from "node:assert/strict";
import test from "node:test";
import {
  amountOwing,
  invoiceHours,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
} from "../src/apps/client-portal/utils/portalUtils.js";

const invoice = {
  status: "sent",
  taxRate: 0.1,
  items: [
    { quantity: 2, rate: 50 },
    { quantity: 1.5, rate: 80 },
  ],
  hours: [{ hours: 2.5 }, { hours: 1.25 }],
};

test("portal invoice totals include line items and GST", () => {
  assert.equal(invoiceSubtotal(invoice), 220);
  assert.equal(invoiceTax(invoice), 22);
  assert.equal(invoiceTotal(invoice), 242);
});

test("portal account calculations exclude paid invoices", () => {
  assert.equal(invoiceHours(invoice), 3.75);
  assert.equal(
    amountOwing({
      invoices: [invoice, { ...invoice, status: "paid" }],
    }),
    242,
  );
});
