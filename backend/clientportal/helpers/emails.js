import { Resend } from "resend";
import {
  dateOnly,
  escapeEmailHtml,
  invoiceHours,
  invoiceTotal,
  money,
  portalUrl
} from "./portal-data.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

function emailFrom() {
  return process.env.CLIENT_PORTAL_EMAIL_FROM || "Nielsen Innovations <contactus@nielseninnovations.com>";
}

export function invoiceEmailHtml(client, invoice, message, billing) {
  const lineRows = invoice.items.map((item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeEmailHtml(item.description)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.rate)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(Number(item.quantity || 0) * Number(item.rate || 0))}</td>
    </tr>
  `).join("");

  const hourRows = (invoice.hours || []).map((entry) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${dateOnly(entry.date)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${entry.hours}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeEmailHtml(entry.work)}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827;">
      <h2>${escapeEmailHtml(billing.businessName)} invoice ${escapeEmailHtml(invoice.number)}</h2>
      <p><strong>ABN:</strong> ${escapeEmailHtml(billing.abn || "Not supplied")}</p>
      <p>Hi ${escapeEmailHtml(client.contact)},</p>
      <p>${escapeEmailHtml(message)}</p>
      <p><strong>Total:</strong> ${money(invoiceTotal(invoice))}<br>
      <strong>Due:</strong> ${dateOnly(invoice.due)}<br>
      <strong>Status:</strong> ${invoice.status}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:18px;">
        <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Rate</th><th align="right">Amount</th></tr></thead>
        <tbody>${lineRows || '<tr><td colspan="4" style="padding:8px;">No line items listed.</td></tr>'}</tbody>
      </table>
      <p style="text-align:right;"><strong>Invoice total: ${money(invoiceTotal(invoice))}</strong></p>
      <h3>Hours breakdown</h3>
      <p><strong>Total hours:</strong> ${invoiceHours(invoice).toFixed(2)}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th align="left">Date</th><th align="right">Hours</th><th align="left">Work completed</th></tr></thead>
        <tbody>${hourRows || '<tr><td colspan="3" style="padding:8px;">No hours recorded.</td></tr>'}</tbody>
      </table>
      <h3>Payment details</h3>
      <p>
        <strong>Bank:</strong> ${escapeEmailHtml(billing.bankName || "Not supplied")}<br>
        <strong>Account name:</strong> ${escapeEmailHtml(billing.accountName || "Not supplied")}<br>
        <strong>BSB:</strong> ${escapeEmailHtml(billing.bsb || "Not supplied")}<br>
        <strong>Account number:</strong> ${escapeEmailHtml(billing.accountNumber || "Not supplied")}<br>
        <strong>Reference:</strong> ${escapeEmailHtml(billing.paymentReference || invoice.number)}
      </p>
      <p>${escapeEmailHtml(billing.paymentTerms || "")}</p>
      <p style="margin-top:24px;"><a href="${portalUrl('/login')}">Open your client portal</a></p>
    </div>
  `;
}

export async function sendPortalEmail({ to, subject, html }) {
  if (!emailReady()) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  const { error } = await resend.emails.send({
    from: emailFrom(),
    to: [to],
    subject,
    html
  });

  if (error) {
    throw new Error(error.message || "Unable to send email");
  }

  return { sent: true };
}