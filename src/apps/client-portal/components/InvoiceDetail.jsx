import {
  formatDate,
  invoiceHours,
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  money,
} from "../utils/portalUtils.js";

function BillingDetails({ billing, invoice }) {
  return (
    <div className="billing-details">
      <div>
        <p className="eyebrow">Business</p>
        <h2>{billing.businessName || "Nielsen Innovations"}</h2>
        <p>
          <strong>ABN:</strong> {billing.abn || "Not supplied"}
        </p>
      </div>
      <div>
        <p className="eyebrow">Payment</p>
        <p>
          <strong>Bank:</strong> {billing.bankName || "Not supplied"}
          <br />
          <strong>Account name:</strong> {billing.accountName || "Not supplied"}
          <br />
          <strong>BSB:</strong> {billing.bsb || "Not supplied"}
          <br />
          <strong>Account number:</strong>{" "}
          {billing.accountNumber || "Not supplied"}
          <br />
          <strong>Reference:</strong>{" "}
          {billing.paymentReference || invoice.number}
        </p>
        <p>{billing.paymentTerms}</p>
      </div>
    </div>
  );
}

export function InvoiceDetail({ client, invoice, billing, onEdit }) {
  if (!client || !invoice) {
    return (
      <article className="invoice-detail">
        <div className="empty-state">
          <i className="bi bi-receipt" aria-hidden="true" />
          <h3>No invoice selected</h3>
          <p>Select an invoice to view itemised billing details.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="invoice-detail">
      <div className="invoice-top">
        <div>
          <p className="eyebrow">Invoice</p>
          <h2>{invoice.number}</h2>
        </div>
        <div className="invoice-meta">
          <span>
            <strong>Client:</strong> {client.business}
          </span>
          <span>
            <strong>Issued:</strong> {formatDate(invoice.issued)}
          </span>
          <span>
            <strong>Due:</strong> {formatDate(invoice.due)}
          </span>
          <span className={`status-pill status-${invoice.status}`}>
            {invoice.status}
          </span>
          {onEdit && (
            <button className="action-button" type="button" onClick={onEdit}>
              <i className="bi bi-pencil-square" aria-hidden="true" />
              Edit invoice
            </button>
          )}
        </div>
      </div>

      <BillingDetails billing={billing} invoice={invoice} />

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="number-cell">Qty</th>
            <th className="number-cell">Rate</th>
            <th className="number-cell">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item) => (
            <tr key={item.id || item.description}>
              <td>{item.description}</td>
              <td className="number-cell">{Number(item.quantity || 0)}</td>
              <td className="number-cell">{money(item.rate)}</td>
              <td className="number-cell">
                {money(Number(item.quantity || 0) * Number(item.rate || 0))}
              </td>
            </tr>
          ))}
          {!invoice.items?.length && (
            <tr>
              <td colSpan="4">No line items yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="totals-table" aria-label="Invoice totals">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td className="number-cell">{money(invoiceSubtotal(invoice))}</td>
          </tr>
          <tr>
            <td>GST {Math.round(Number(invoice.taxRate || 0) * 100)}%</td>
            <td className="number-cell">{money(invoiceTax(invoice))}</td>
          </tr>
          <tr>
            <td>Total</td>
            <td className="number-cell">{money(invoiceTotal(invoice))}</td>
          </tr>
        </tbody>
      </table>

      <div className="hours-summary">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hours</p>
            <h2>{invoiceHours(invoice).toFixed(2)} total hours</h2>
          </div>
        </div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="number-cell">Hours</th>
              <th>Work completed</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.hours || []).map((entry) => (
              <tr key={entry.id || `${entry.date}-${entry.work}`}>
                <td>{formatDate(entry.date)}</td>
                <td className="number-cell">{Number(entry.hours || 0)}</td>
                <td>{entry.work}</td>
              </tr>
            ))}
            {!invoice.hours?.length && (
              <tr>
                <td colSpan="3">No hours recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="invoice-notes">
        <strong>Notes</strong>
        <p>{invoice.notes || "No notes added."}</p>
      </div>
    </article>
  );
}
