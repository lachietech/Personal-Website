export function AppTopbar({
  brand,
  search,
  children,
  label = "Application navigation",
}) {
  return (
    <header className={`app-topbar${search ? " app-topbar--search" : ""}`}>
      <div className="app-topbar-brand">{brand}</div>
      {search && <div className="app-topbar-search">{search}</div>}
      <nav className="app-topbar-actions" aria-label={label}>
        {children}
      </nav>
    </header>
  );
}
