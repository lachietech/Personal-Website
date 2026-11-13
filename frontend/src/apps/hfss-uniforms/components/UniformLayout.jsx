import { useEffect, useRef } from "react";
import { AppTopbar } from "../../../components/AppTopbar.jsx";

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
  const workspace = useRef(null);
  useEffect(() => {
    workspace.current?.scrollTo(0, 0);
  }, [currentPage]);

  const items =
    user.role === "admin"
      ? [...navigation, ["access-management", "Access Management"]]
      : navigation;

  return (
    <div className="uniform-app">
      <AppTopbar
        brand={
          <a
            className="app-brand"
            href="/hfssuniformsapp/dashboard"
            aria-label="Harris Fields Uniform Shop"
          >
            <span className="app-brand-mark" aria-hidden="true">
              HF
            </span>
            <span>Uniform Shop</span>
          </a>
        }
      >
        <span
          className="app-topbar-user"
          title={`${user.username} · ${user.role === "admin" ? "Administrator" : "Staff"}`}
        >
          {user.username}
        </span>
        <button className="btn btn-secondary" type="button" onClick={logout}>
          Sign Out
        </button>
      </AppTopbar>
      <nav className="navbar" aria-label="Uniform Shop sections">
        {items.map(([id, label]) => (
          <button
            className={`nav-btn${currentPage === id ? " active" : ""}`}
            type="button"
            disabled={user.mustChangePassword && id !== "account"}
            aria-current={currentPage === id ? "page" : undefined}
            onClick={() => navigate(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>
      <main
        ref={workspace}
        className="uniform-workspace"
        tabIndex={-1}
        aria-label="Uniform Shop workspace"
      >
        {children}
      </main>
    </div>
  );
}
