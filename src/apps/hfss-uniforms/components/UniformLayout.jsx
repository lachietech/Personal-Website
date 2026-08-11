const navigation = [
  ["dashboard", "Dashboard"],
  ["sales-records", "Sales Records"],
  ["pos", "Point of Sale"],
  ["receipts", "Receipts"],
  ["stock-manager", "Stock Manager"],
  ["account", "My Account"],
];

export function UniformLayout({
  user,
  currentPage,
  navigate,
  logout,
  children,
}) {
  const items =
    user.role === "admin"
      ? [...navigation, ["access-management", "Access Management"]]
      : navigation;

  return (
    <div className="container">
      <header>
        <div className="header-shell">
          <div>
            <span className="brand-kicker">Harris Fields State School</span>
            <h1>Uniform Shop Manager</h1>
            <p>
              Sales, forecasting, stock planning, and point of sale in one place
            </p>
          </div>
          <div className="session-panel">
            <span className="session-label">Signed in as</span>
            <strong>{user.username}</strong>
            <span className="session-role">
              {user.role === "admin" ? "Administrator" : "Staff"}
            </span>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <nav className="navbar" aria-label="Uniform Shop sections">
        {items.map(([id, label]) => (
          <button
            className={`nav-btn${currentPage === id ? " active" : ""}`}
            type="button"
            disabled={user.mustChangePassword && id !== "account"}
            onClick={() => navigate(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
