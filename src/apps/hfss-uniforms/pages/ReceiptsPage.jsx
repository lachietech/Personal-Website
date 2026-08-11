import { useState } from "react";
import { useUniformData } from "../hooks/useUniformData.js";
import { uniformMoney, uniformRequest } from "../api/uniformApi.js";

export function ReceiptsPage() {
  const {
    data: receipts = [],
    loading,
    error,
  } = useUniformData("/api/pos/orders/receipts?limit=250");
  const [receipt, setReceipt] = useState(null);
  const [receiptError, setReceiptError] = useState("");

  async function viewReceipt(id) {
    try {
      setReceiptError("");
      setReceipt(await uniformRequest(`/api/pos/orders/${id}/receipt`));
    } catch (requestError) {
      setReceiptError(requestError.message);
    }
  }

  return (
    <section className="section active">
      <h2>Receipts</h2>
      <p>Review completed uniform shop orders.</p>
      <div className="card table-container">
        {loading && <p className="loading">Loading receipts...</p>}
        {(error || receiptError) && (
          <p className="status-message error">{error || receiptError}</p>
        )}
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Cashier</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {receipts.map((item) => (
              <tr key={item._id}>
                <td>{item.orderNumber}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>{uniformMoney(item.total)}</td>
                <td>{item.paymentMethod}</td>
                <td>{item.cashierUsername || "-"}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => viewReceipt(item._id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {receipt && (
        <div className="card">
          <div className="section-header-row">
            <h3>{receipt.orderNumber}</h3>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReceipt(null)}
            >
              Close
            </button>
          </div>
          <pre className="receipt-preview">{receipt.text}</pre>
        </div>
      )}
    </section>
  );
}
