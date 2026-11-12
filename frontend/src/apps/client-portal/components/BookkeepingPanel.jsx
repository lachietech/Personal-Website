import { useMemo, useState } from "react";
import {
  cleanAmount,
  guessColumn,
  importFingerprint,
  looksDuplicate,
  normalizeDate,
  parseCsv,
} from "../bookkeeping/importUtils.js";
import { downloadCsv, reportTotals } from "../bookkeeping/reportUtils.js";
import { portalRequest, portalUpload } from "../api/portalApi.js";
import { money, today } from "../utils/portalUtils.js";
import { FormMessage } from "./PortalLayout.jsx";

const emptyTransaction = {
  date: today(),
  type: "expense",
  amount: "",
  description: "",
  category: "Uncategorized",
  account: "Business Checking",
  debitAccount: "",
  creditAccount: "",
  reviewed: false,
};

function transactionRowsFromCsv(text, existing, categories, accounts) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const column = Object.fromEntries(
    [
      "date",
      "description",
      "amount",
      "debit",
      "credit",
      "type",
      "account",
      "category",
    ].map((field) => [field, guessColumn(headers, field)]),
  );

  return rows
    .slice(1)
    .map((row) => {
      const debit = column.debit >= 0 ? cleanAmount(row[column.debit]) : 0;
      const credit = column.credit >= 0 ? cleanAmount(row[column.credit]) : 0;
      const signedAmount =
        column.amount >= 0 ? cleanAmount(row[column.amount]) : credit - debit;
      const typeText =
        column.type >= 0 ? String(row[column.type]).toLowerCase() : "";
      const type = typeText
        ? /income|credit|deposit/.test(typeText)
          ? "income"
          : "expense"
        : signedAmount >= 0
          ? "income"
          : "expense";
      const categoryValue = column.category >= 0 ? row[column.category] : "";
      const accountValue = column.account >= 0 ? row[column.account] : "";
      const transaction = {
        date: normalizeDate(row[column.date]),
        description: String(row[column.description] || "").trim(),
        amount: Math.abs(signedAmount),
        type,
        category:
          categories.includes(categoryValue) && categoryValue
            ? categoryValue
            : type === "income"
              ? "Client Income"
              : "Uncategorized",
        account: accounts.includes(accountValue)
          ? accountValue
          : "Business Checking",
        reviewed: false,
      };
      transaction.importFingerprint = importFingerprint(transaction);
      return transaction;
    })
    .filter(
      (transaction) =>
        transaction.date &&
        transaction.description &&
        transaction.amount > 0 &&
        !looksDuplicate(transaction, existing),
    );
}

export function BookkeepingPanel({ data, setData }) {
  const [selectedId, setSelectedId] = useState(null);
  const [values, setValues] = useState(emptyTransaction);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState({ type: "", reviewed: "" });
  const [importRows, setImportRows] = useState([]);
  const [message, setMessage] = useState(null);

  const filteredTransactions = useMemo(() => {
    return data.transactions.filter((transaction) => {
      if (filter.type && transaction.type !== filter.type) return false;
      if (filter.reviewed && String(transaction.reviewed) !== filter.reviewed) {
        return false;
      }
      return true;
    });
  }, [data.transactions, filter]);
  const totals = useMemo(
    () => reportTotals(filteredTransactions),
    [filteredTransactions],
  );

  function edit(transaction) {
    setSelectedId(transaction.id);
    setValues({ ...transaction });
    setMessage(null);
  }

  function resetForm() {
    setSelectedId(null);
    setValues(emptyTransaction);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const response = await portalRequest(
        selectedId
          ? `/clientportal/api/bookkeeping/transactions/${selectedId}`
          : "/clientportal/api/bookkeeping/transactions",
        { method: selectedId ? "PUT" : "POST", body: values },
      );
      setData((current) => ({
        ...current,
        transactions: selectedId
          ? current.transactions.map((item) =>
              item.id === response.transaction.id ? response.transaction : item,
            )
          : [response.transaction, ...current.transactions],
      }));
      resetForm();
      setMessage({ type: "success", text: "Transaction saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function removeTransaction() {
    if (!selectedId || !window.confirm("Delete this transaction?")) return;
    try {
      await portalRequest(
        `/clientportal/api/bookkeeping/transactions/${selectedId}`,
        { method: "DELETE" },
      );
      setData((current) => ({
        ...current,
        transactions: current.transactions.filter(
          (item) => item.id !== selectedId,
        ),
      }));
      resetForm();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function uploadReceipt(file) {
    if (!selectedId || !file) return;
    const formData = new FormData();
    formData.append("receipt", file);
    try {
      const response = await portalUpload(
        `/clientportal/api/bookkeeping/transactions/${selectedId}/receipt`,
        formData,
      );
      setData((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          item.id === response.transaction.id ? response.transaction : item,
        ),
      }));
      setMessage({ type: "success", text: "Receipt uploaded." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function bulkCategorize(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const response = await portalRequest(
        "/clientportal/api/bookkeeping/transactions/bulk-categorize",
        {
          method: "POST",
          body: {
            ids: selectedIds,
            category: formData.get("category"),
            account: formData.get("account"),
            reviewed: true,
          },
        },
      );
      setData((current) => ({
        ...current,
        transactions: response.transactions,
      }));
      setSelectedIds([]);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function readCsv(file) {
    if (!file) return;
    const text = await file.text();
    setImportRows(
      transactionRowsFromCsv(
        text,
        data.transactions,
        data.categories,
        data.accounts,
      ),
    );
  }

  async function importCsv() {
    try {
      const response = await portalRequest(
        "/clientportal/api/bookkeeping/import",
        {
          method: "POST",
          body: { transactions: importRows },
        },
      );
      setData((current) => ({
        ...current,
        transactions: response.transactions,
      }));
      setImportRows([]);
      setMessage({
        type: "success",
        text: `Imported ${response.imported}; skipped ${response.skipped}.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function saveRule(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    try {
      const response = await portalRequest(
        "/clientportal/api/bookkeeping/rules",
        {
          method: "POST",
          body,
        },
      );
      setData((current) => ({
        ...current,
        rules: [
          response.rule,
          ...current.rules.filter((rule) => rule.id !== response.rule.id),
        ],
      }));
      form.reset();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function removeRule(ruleId) {
    await portalRequest(`/clientportal/api/bookkeeping/rules/${ruleId}`, {
      method: "DELETE",
    });
    setData((current) => ({
      ...current,
      rules: current.rules.filter((rule) => rule.id !== ruleId),
    }));
  }

  function exportTransactions() {
    downloadCsv("bookkeeping-transactions.csv", [
      [
        "Date",
        "Type",
        "Description",
        "Category",
        "Account",
        "Amount",
        "Reviewed",
      ],
      ...filteredTransactions.map((transaction) => [
        transaction.date,
        transaction.type,
        transaction.description,
        transaction.category,
        transaction.account,
        transaction.amount,
        transaction.reviewed ? "Yes" : "No",
      ]),
    ]);
  }

  return (
    <section className="invoice-panel bookkeeping-panel bookkeeping-dashboard">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Bookkeeping</p>
          <h2>Books</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={exportTransactions}
        >
          Export CSV
        </button>
      </div>

      <section className="summary-grid bookkeeping-summary">
        <article className="summary-panel primary">
          <span className="summary-label">Income</span>
          <strong>{money(totals.income)}</strong>
        </article>
        <article className="summary-panel">
          <span className="summary-label">Expenses</span>
          <strong>{money(totals.expenses)}</strong>
        </article>
        <article className="summary-panel">
          <span className="summary-label">Net</span>
          <strong>{money(totals.net)}</strong>
        </article>
      </section>

      <div className="bookkeeping-grid">
        <form
          className="stack-form bookkeeping-card"
          onSubmit={saveTransaction}
        >
          <div className="panel-heading">
            <h3>{selectedId ? "Edit transaction" : "Add transaction"}</h3>
            {selectedId && (
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
              >
                New
              </button>
            )}
          </div>
          <div className="form-grid">
            <label>
              Date
              <input
                type="date"
                value={values.date}
                onChange={(event) =>
                  setValues({ ...values, date: event.target.value })
                }
                required
              />
            </label>
            <label>
              Type
              <select
                value={values.type}
                onChange={(event) =>
                  setValues({ ...values, type: event.target.value })
                }
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={values.amount}
                onChange={(event) =>
                  setValues({ ...values, amount: event.target.value })
                }
                required
              />
            </label>
            <label>
              Category
              <select
                value={values.category}
                onChange={(event) =>
                  setValues({ ...values, category: event.target.value })
                }
              >
                {data.categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Account
              <select
                value={values.account}
                onChange={(event) =>
                  setValues({ ...values, account: event.target.value })
                }
              >
                {data.accounts.map((account) => (
                  <option key={account}>{account}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Description
            <input
              value={values.description}
              onChange={(event) =>
                setValues({ ...values, description: event.target.value })
              }
              required
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={values.reviewed}
              onChange={(event) =>
                setValues({ ...values, reviewed: event.target.checked })
              }
            />
            Reviewed
          </label>
          {selectedId && (
            <label>
              Receipt
              <input
                type="file"
                onChange={(event) => uploadReceipt(event.target.files[0])}
              />
            </label>
          )}
          <div className="form-actions">
            <button className="action-button" type="submit">
              Save transaction
            </button>
            {selectedId && (
              <button
                className="danger-button"
                type="button"
                onClick={removeTransaction}
              >
                Delete
              </button>
            )}
          </div>
        </form>

        <section className="bookkeeping-card">
          <h3>Bank import</h3>
          <p>Upload a CSV; common bank columns are detected automatically.</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => readCsv(event.target.files[0])}
          />
          <p>{importRows.length} new transactions ready.</p>
          <button
            className="action-button"
            type="button"
            disabled={!importRows.length}
            onClick={importCsv}
          >
            Import transactions
          </button>
        </section>
      </div>

      <section className="bookkeeping-card">
        <div className="filter-bar">
          <select
            value={filter.type}
            onChange={(event) =>
              setFilter({ ...filter, type: event.target.value })
            }
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={filter.reviewed}
            onChange={(event) =>
              setFilter({ ...filter, reviewed: event.target.value })
            }
          >
            <option value="">All review states</option>
            <option value="true">Reviewed</option>
            <option value="false">Needs review</option>
          </select>
        </div>
        <form className="bulk-actions" onSubmit={bulkCategorize}>
          <select name="category" required>
            {data.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select name="account">
            {data.accounts.map((account) => (
              <option key={account}>{account}</option>
            ))}
          </select>
          <button className="secondary-button" disabled={!selectedIds.length}>
            Categorize selected
          </button>
        </form>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th className="number-cell">Amount</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  onDoubleClick={() => edit(transaction)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(transaction.id)}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, transaction.id]
                            : current.filter((id) => id !== transaction.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => edit(transaction)}
                    >
                      {transaction.date}
                    </button>
                  </td>
                  <td>{transaction.description}</td>
                  <td>{transaction.category}</td>
                  <td>{transaction.type}</td>
                  <td className="number-cell">{money(transaction.amount)}</td>
                  <td>
                    {transaction.receipt ? (
                      <a
                        href={`/clientportal/api/bookkeeping/transactions/${transaction.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bookkeeping-card">
        <h3>Auto-categorization</h3>
        <form className="rule-form" onSubmit={saveRule}>
          <input name="contains" placeholder="Description contains" required />
          <select name="category">
            {data.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select name="account">
            {data.accounts.map((account) => (
              <option key={account}>{account}</option>
            ))}
          </select>
          <button className="secondary-button">Save rule</button>
        </form>
        <div className="rule-list">
          {data.rules.map((rule) => (
            <div className="rule-row" key={rule.id}>
              <span>
                <strong>{rule.contains}</strong> → {rule.category} /{" "}
                {rule.account}
              </span>
              <button
                className="icon-button danger-icon"
                type="button"
                onClick={() => removeRule(rule.id)}
                aria-label="Delete rule"
              >
                <i className="bi bi-trash3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
      <FormMessage message={message} />
    </section>
  );
}
