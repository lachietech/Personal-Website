export const emptyBilling = {
  businessName: "Nielsen Innovations",
  abn: "",
  bankName: "",
  accountName: "",
  bsb: "",
  accountNumber: "",
  paymentReference: "Use the invoice number as payment reference",
  paymentTerms: "Payment due by the invoice due date.",
};

export function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function invoiceSubtotal(invoice) {
  return (invoice?.items || []).reduce(
    (total, item) =>
      total + Number(item.quantity || 0) * Number(item.rate || 0),
    0,
  );
}

export function invoiceTax(invoice) {
  return invoiceSubtotal(invoice) * Number(invoice?.taxRate || 0);
}

export function invoiceTotal(invoice) {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

export function invoiceHours(invoice) {
  return (invoice?.hours || []).reduce(
    (total, entry) => total + Number(entry.hours || 0),
    0,
  );
}

export function amountOwing(client) {
  return (client?.invoices || [])
    .filter((invoice) => invoice.status !== "paid")
    .reduce((total, invoice) => total + invoiceTotal(invoice), 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function printInvoice() {
  const cleanup = () => document.body.classList.remove("invoice-printing");
  document.body.classList.add("invoice-printing");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 5000);
}
