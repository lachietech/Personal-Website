import { useMemo, useState } from "react";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useUniformData } from "../hooks/useUniformData.js";
import { uniformMoney, uniformRequest } from "../api/uniformApi.js";

const emptyProduct = {
  name: "",
  category: "",
  size: "",
  sku: "",
  price: 0,
  stockOnHand: 0,
  stockInWarehouse: 0,
  active: true,
};

export function StockPage({ user }) {
  const {
    data: products = [],
    loading,
    error,
    reload,
  } = useUniformData("/api/pos/products/all");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyProduct);
  const [message, setMessage] = useState(null);
  const selected = useMemo(
    () => products.find((product) => product._id === selectedId),
    [products, selectedId],
  );

  function edit(product) {
    setSelectedId(product._id);
    setDraft({ ...emptyProduct, ...product });
  }
  function reset() {
    setSelectedId(null);
    setDraft(emptyProduct);
  }

  async function save(event) {
    event.preventDefault();
    try {
      await uniformRequest(
        selectedId ? `/api/pos/products/${selectedId}` : "/api/pos/products",
        {
          method: selectedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      setMessage({ type: "success", text: "Product saved." });
      reset();
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  async function stockAction(path, body, successText) {
    try {
      await uniformRequest(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMessage({ type: "success", text: successText });
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Deactivate ${selected.name}?`)) return;
    try {
      await uniformRequest(`/api/pos/products/${selected._id}`, {
        method: "DELETE",
      });
      reset();
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  return (
    <section className="section active">
      <div className="section-header-row">
        <div>
          <h2>Stock Manager</h2>
          <p>Maintain catalogue details and stock locations.</p>
        </div>
        {user.role === "admin" && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              stockAction(
                "/api/pos/products/sync-from-sales",
                {},
                "Products synced from sales records.",
              )
            }
          >
            Sync sales records
          </button>
        )}
      </div>
      <div className="card">
        <form className="form-grid" onSubmit={save}>
          {["name", "category", "size", "sku"].map((field) => (
            <div className="form-group" key={field}>
              <label>{field[0].toUpperCase() + field.slice(1)}</label>
              <input
                value={draft[field]}
                required={field === "name" || field === "category"}
                onChange={(event) =>
                  setDraft({ ...draft, [field]: event.target.value })
                }
              />
            </div>
          ))}
          {["price", "stockOnHand", "stockInWarehouse"].map((field) => (
            <div className="form-group" key={field}>
              <label>
                {field === "price"
                  ? "Price"
                  : field === "stockOnHand"
                    ? "Shop floor"
                    : "Warehouse"}
              </label>
              <input
                type="number"
                min="0"
                step={field === "price" ? "0.01" : "1"}
                value={draft[field]}
                onChange={(event) =>
                  setDraft({ ...draft, [field]: Number(event.target.value) })
                }
              />
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn-primary">Save product</button>
            <button className="btn btn-secondary" type="button" onClick={reset}>
              New
            </button>
            {selected && (
              <button className="btn btn-danger" type="button" onClick={remove}>
                Deactivate
              </button>
            )}
          </div>
        </form>
        <StatusMessage message={message} />
      </div>
      <div className="card table-container">
        {loading && <p className="loading">Loading stock...</p>}
        {error && <p className="status-message error">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Shop floor</th>
              <th>Warehouse</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>
                  {product.name}
                  <br />
                  <small>
                    {product.category} {product.size}
                  </small>
                </td>
                <td>{uniformMoney(product.price)}</td>
                <td>{product.stockOnHand}</td>
                <td>{product.stockInWarehouse}</td>
                <td>{product.active ? "Active" : "Inactive"}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => edit(product)}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    disabled={!product.stockInWarehouse}
                    onClick={() =>
                      stockAction(
                        `/api/pos/products/${product._id}/transfer`,
                        { quantity: 1 },
                        "One item moved to the shop floor.",
                      )
                    }
                  >
                    Transfer 1
                  </button>{" "}
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() =>
                      stockAction(
                        `/api/pos/products/${product._id}/add-stock`,
                        { quantity: 1, location: "warehouse" },
                        "One warehouse item added.",
                      )
                    }
                  >
                    Add 1
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
