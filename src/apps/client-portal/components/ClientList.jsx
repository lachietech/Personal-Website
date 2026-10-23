import { useMemo, useState } from "react";
import { amountOwing, money } from "../utils/portalUtils.js";

export function ClientList({ clients, selectedId, onSelect, onCreate }) {
  const [search, setSearch] = useState("");
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.business, client.contact, client.email, client.username]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [clients, search]);

  return (
    <aside className="client-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Clients <span className="client-count">{clients.length}</span>
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          title="New client"
          onClick={onCreate}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          <span className="visually-hidden">New client</span>
        </button>
      </div>
      <label className="search-field">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          value={search}
          placeholder="Search clients"
          aria-label="Search clients"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="client-list">
        {filteredClients.map((client) => (
          <button
            className={`client-card${client.id === selectedId ? " active" : ""}`}
            type="button"
            aria-pressed={client.id === selectedId}
            onClick={() => onSelect(client.id)}
            key={client.id}
          >
            <strong>{client.business}</strong>
            <span>{client.contact}</span>
            <small>{money(amountOwing(client))} owing</small>
          </button>
        ))}
        {!filteredClients.length && (
          <div className="empty-state">
            <p>
              {clients.length
                ? "No matching clients."
                : "No clients yet. Add your first client to get started."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
