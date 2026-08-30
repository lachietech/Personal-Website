import { useState } from "react";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useUniformData } from "../hooks/useUniformData.js";
import { uniformRequest } from "../api/uniformApi.js";

export function AccessPage() {
  const { data: users, error, reload } = useUniformData("/api/auth/users", {
    initialData: [],
  });
  const {
    data: auditLogs,
    error: auditError,
    reload: reloadAudit,
  } = useUniformData("/api/auth/audit-logs", { initialData: [] });
  const [message, setMessage] = useState(null);
  const [draft, setDraft] = useState({
    username: "",
    password: "",
    role: "staff",
  });

  async function createUser(event) {
    event.preventDefault();
    try {
      await uniformRequest("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setDraft({ username: "", password: "", role: "staff" });
      setMessage({ type: "success", text: "User created." });
      reload();
      reloadAudit();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  async function updateUser(user, updates) {
    try {
      await uniformRequest(`/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          role: user.role,
          active: user.active,
          ...updates,
        }),
      });
      setMessage({ type: "success", text: `${user.username} updated.` });
      reload();
      reloadAudit();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  return (
    <section className="section active">
      <h2>Access Management</h2>
      <p>Create and manage staff access.</p>
      <div className="card">
        <form className="form-grid" onSubmit={createUser}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={draft.username}
              onChange={(event) =>
                setDraft({ ...draft, username: event.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Temporary password</label>
            <input
              type="password"
              value={draft.password}
              onChange={(event) =>
                setDraft({ ...draft, password: event.target.value })
              }
              minLength="12"
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={draft.role}
              onChange={(event) =>
                setDraft({ ...draft, role: event.target.value })
              }
            >
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary">Create user</button>
          </div>
        </form>
        <StatusMessage message={message} />
        {error && <p className="status-message error">{error}</p>}
      </div>
      <div className="card table-container">
        <h3>Users</h3>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last sign in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.active ? "Active" : "Inactive"}</td>
                <td>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : "Never"}
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() =>
                      updateUser(user, {
                        role: user.role === "admin" ? "staff" : "admin",
                      })
                    }
                  >
                    Make {user.role === "admin" ? "staff" : "admin"}
                  </button>{" "}
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => updateUser(user, { active: !user.active })}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card table-container">
        <h3>Recent audit activity</h3>
        {auditError && <p className="status-message error">{auditError}</p>}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.actorUsername || "-"}</td>
                <td>{log.targetUsername || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
