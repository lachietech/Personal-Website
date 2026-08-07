import {
  MAX_HOUR_ENTRIES,
  MAX_LINE_ITEMS,
  dateOnly,
  getDate,
  getEmail,
  getOptionalText,
  getRequiredText,
  validateUsername
} from "./validation.js";

export function sanitizeUser(user) {
  return {
    id: user._id?.toString() || user.id,
    username: user.username,
    role: user.role,
    clientId: user.clientId?.toString() || null,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

export function serializeInvoice(invoice) {
  return {
    id: invoice._id.toString(),
    number: invoice.number,
    status: invoice.status,
    issued: dateOnly(invoice.issued),
    due: dateOnly(invoice.due),
    taxRate: invoice.taxRate,
    notes: invoice.notes || "",
    items: invoice.items.map((item) => ({
      id: item._id.toString(),
      description: item.description,
      quantity: item.quantity,
      rate: item.rate
    })),
    hours: (invoice.hours || []).map((entry) => ({
      id: entry._id.toString(),
      date: dateOnly(entry.date),
      hours: entry.hours,
      work: entry.work
    }))
  };
}

export function serializeClient(client, user = null) {
  return {
    id: client._id.toString(),
    business: client.business,
    contact: client.contact,
    email: client.email,
    notes: client.notes || "",
    username: user?.username || "",
    userActive: user?.active !== false,
    invoices: client.invoices.map(serializeInvoice)
  };
}

export function getClientPayload(body) {
  const username = String(body?.username || "").trim().toLowerCase();
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  return {
    username,
    password: String(body?.password || ""),
    business: getRequiredText(body?.business, "Business name", 160),
    contact: getRequiredText(body?.contact, "Contact name", 120),
    email: getEmail(body?.email),
    notes: getOptionalText(body?.notes, 1000),
    active: body?.active !== false
  };
}

export function getInvoicePayload(body) {
  const status = ["draft", "sent", "overdue", "paid"].includes(body?.status)
    ? body.status
    : "draft";
  const items = Array.isArray(body?.items)
    ? body.items
        .filter((item) => (
          item?.description
          || Number(item?.quantity || 0) > 0
          || Number(item?.rate || 0) > 0
        ))
        .slice(0, MAX_LINE_ITEMS)
    : [];
  const hours = Array.isArray(body?.hours)
    ? body.hours
        .filter((entry) => (
          entry?.date || Number(entry?.hours || 0) > 0 || entry?.work
        ))
        .slice(0, MAX_HOUR_ENTRIES)
    : [];

  return {
    number: getRequiredText(body?.number, "Invoice number", 40),
    status,
    issued: getDate(body?.issued, "Issued date"),
    due: getDate(body?.due, "Due date"),
    taxRate: Math.max(0, Math.min(1, Number(body?.taxRate ?? 0.1))),
    notes: getOptionalText(body?.notes, 1000),
    items: items.map((item) => ({
      description: getRequiredText(
        item?.description,
        "Line item description",
        240
      ),
      quantity: Math.max(0, Number(item?.quantity || 0)),
      rate: Math.max(0, Number(item?.rate || 0))
    })),
    hours: hours
      .map((entry) => ({
        date: getDate(entry?.date, "Work date"),
        hours: Math.max(0, Number(entry?.hours || 0)),
        work: getRequiredText(entry?.work, "Work completed", 320)
      }))
      .filter((entry) => entry.hours > 0 && entry.work)
  };
}

export function invoiceSubtotal(invoice) {
  return invoice.items.reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.rate || 0),
    0
  );
}

export function invoiceTax(invoice) {
  return invoiceSubtotal(invoice) * Number(invoice.taxRate || 0);
}

export function invoiceTotal(invoice) {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

export function invoiceHours(invoice) {
  return (invoice.hours || []).reduce(
    (total, entry) => total + Number(entry.hours || 0),
    0
  );
}
