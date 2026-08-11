import { useMemo, useState } from "react";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useUniformData } from "../hooks/useUniformData.js";
import { uniformRequest } from "../api/uniformApi.js";

const emptyRecord = { category: "", size: "", months: [], sales: [] };

export function SalesPage() {
  const {
    data: records = [],
    loading,
    error,
    reload,
  } = useUniformData("/api/sales");
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => records.find((record) => record._id === selectedId),
    [records, selectedId],
  );
  const [draft, setDraft] = useState(emptyRecord);
  const [message, setMessage] = useState(null);

  function edit(record) {
    setSelectedId(record._id);
    setDraft({
      category: record.category,
      size: record.size,
      months: record.months,
      sales: record.sales,
    });
  }

  function reset() {
    setSelectedId(null);
    setDraft(emptyRecord);
  }

  async function save(event) {
    event.preventDefault();
    try {
      await uniformRequest(
        selectedId ? `/api/sales/${selectedId}` : "/api/sales",
        {
          method: selectedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      setMessage({ type: "success", text: "Sales record saved." });
      reset();
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  async function remove() {
    if (
      !selected ||
      !window.confirm(`Delete ${selected.category} ${selected.size}?`)
    )
      return;
    try {
      await uniformRequest(`/api/sales/${selected._id}`, { method: "DELETE" });
      reset();
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  async function addMonth(event) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await uniformRequest(`/api/sales/${selected._id}/add-month`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: values.month,
          value: Number(values.value),
        }),
      });
      form.reset();
      reload();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  return (
    <section className="section active">
      <div className="section-header-row">
        <div>
          <h2>Sales Records</h2>
          <p>Maintain monthly performance by product and size.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={reset}>
          New record
        </button>
      </div>
      <div className="card">
        <form className="form-grid" onSubmit={save}>
          <div className="form-group">
            <label>Category</label>
            <input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Months (comma separated)</label>
            <input
              value={draft.months.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  months: e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Sales (comma separated)</label>
            <input
              value={draft.sales.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sales: e.target.value
                    .split(",")
                    .map((item) => Number(item.trim())),
                })
              }
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save record
            </button>
            {selected && (
              <button className="btn btn-danger" type="button" onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </form>
        {selected && (
          <form className="inline-form" onSubmit={addMonth}>
            <input name="month" placeholder="Month, e.g. Aug-26" required />
            <input
              name="value"
              type="number"
              min="0"
              placeholder="Sales"
              required
            />
            <button className="btn btn-secondary">Add month</button>
          </form>
        )}
        <StatusMessage message={message} />
      </div>

      <div className="card table-container">
        {loading && <p className="loading">Loading sales…</p>}
        {error && <p className="status-message error">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Size</th>
              <th>Latest month</th>
              <th>Latest sales</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record._id}>
                <td>{record.category}</td>
                <td>{record.size}</td>
                <td>{record.months.at(-1) || "—"}</td>
                <td>{record.sales.at(-1) ?? "—"}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => edit(record)}
                  >
                    Edit
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
