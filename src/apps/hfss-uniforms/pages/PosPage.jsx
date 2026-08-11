import { useMemo, useState } from "react";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useUniformData } from "../hooks/useUniformData.js";
import { uniformMoney, uniformRequest } from "../api/uniformApi.js";

export function PosPage() {
  const {
    data: products = [],
    loading,
    error,
    reload,
  } = useUniformData("/api/pos/products");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [amountTendered, setAmountTendered] = useState("");
  const [message, setMessage] = useState(null);

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? products.filter((product) =>
          [product.name, product.category, product.size, product.sku]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : products;
  }, [products, query]);

  const items = products
    .filter((product) => cart[product._id])
    .map((product) => ({ ...product, qty: cart[product._id] }));
  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0,
  );

  function changeQuantity(product, quantity) {
    const nextQuantity = Math.max(
      0,
      Math.min(Number(product.stockOnHand), Number(quantity) || 0),
    );
    setCart((current) => ({ ...current, [product._id]: nextQuantity }));
  }

  async function checkout() {
    try {
      const order = await uniformRequest("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item._id, qty: item.qty })),
          paymentMethod,
          amountTendered: Number(amountTendered || 0),
        }),
      });
      setMessage({
        type: "success",
        text: `Order ${order.orderNumber} completed.`,
      });
      setCart({});
      setAmountTendered("");
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  return (
    <section className="section active">
      <div className="section-header-row">
        <div>
          <h2>Point of Sale</h2>
          <p>Build an order using current shop-floor stock.</p>
        </div>
        <input
          aria-label="Search products"
          placeholder="Search products"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <StatusMessage message={message} />
      <div className="two-column-layout">
        <div className="card table-container">
          {loading && <p className="loading">Loading products...</p>}
          {error && <p className="status-message error">{error}</p>}
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Available</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product._id}>
                  <td>
                    <strong>{product.name}</strong>
                    <br />
                    <small>
                      {product.category} {product.size}
                    </small>
                  </td>
                  <td>{uniformMoney(product.price)}</td>
                  <td>{product.stockOnHand}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={product.stockOnHand}
                      value={cart[product._id] || 0}
                      onChange={(event) =>
                        changeQuantity(product, event.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="card">
          <h3>Current order</h3>
          {items.length === 0 ? (
            <p>No products selected.</p>
          ) : (
            items.map((item) => (
              <p key={item._id}>
                {item.qty} x {item.name}{" "}
                <strong>{uniformMoney(item.price * item.qty)}</strong>
              </p>
            ))
          )}
          <h3>Total: {uniformMoney(total)}</h3>
          <div className="form-group">
            <label>Payment method</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="center-pay">CentrePay</option>
            </select>
          </div>
          {paymentMethod === "cash" && (
            <div className="form-group">
              <label>Amount tendered</label>
              <input
                type="number"
                min={total}
                step="0.01"
                value={amountTendered}
                onChange={(event) => setAmountTendered(event.target.value)}
              />
            </div>
          )}
          <button
            className="btn btn-primary"
            type="button"
            disabled={!items.length}
            onClick={checkout}
          >
            Complete order
          </button>
        </aside>
      </div>
    </section>
  );
}
