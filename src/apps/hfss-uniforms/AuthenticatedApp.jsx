import { useEffect, useState } from "react";
import { UniformLayout } from "./components/UniformLayout.jsx";
import { AccessPage } from "./pages/AccessPage.jsx";
import { AccountPage } from "./pages/AccountPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { ReceiptsPage } from "./pages/ReceiptsPage.jsx";
import { SalesPage } from "./pages/SalesPage.jsx";
import { StockPage } from "./pages/StockPage.jsx";
import { uniformRequest } from "./api/uniformApi.js";

const basePath = "/hfssuniformsapp";
const pageIds = new Set([
  "dashboard",
  "sales-records",
  "pos",
  "receipts",
  "stock-manager",
  "access-management",
  "account",
]);

function readPage() {
  const page = window.location.pathname
    .slice(basePath.length + 1)
    .split("/")[0];
  return pageIds.has(page) ? page : "dashboard";
}

export function AuthenticatedApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(readPage);
  const [error, setError] = useState("");

  useEffect(() => {
    uniformRequest("/api/auth/me")
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        if (currentUser.mustChangePassword) navigate("account", true);
      })
      .catch(() => {
        window.location.assign(`${basePath}/signin`);
      });
  }, []);

  useEffect(() => {
    if (user && page === "access-management" && user.role !== "admin") {
      navigate("dashboard", true);
    }
  }, [page, user]);

  useEffect(() => {
    const handlePopState = () => setPage(readPage());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPage, replace = false) {
    if (user?.mustChangePassword && nextPage !== "account") return;
    const url = `${basePath}/${nextPage}`;
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setPage(nextPage);
  }

  async function logout() {
    try {
      await uniformRequest("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign(`${basePath}/signin`);
    }
  }

  if (!user)
    return (
      <main className="container">
        <p className="loading">Loading Uniform Shop Manager...</p>
        {error && <p className="status-message error">{error}</p>}
      </main>
    );
  const pages = {
    dashboard: <DashboardPage />,
    "sales-records": <SalesPage />,
    pos: <PosPage />,
    receipts: <ReceiptsPage />,
    "stock-manager": <StockPage user={user} />,
    "access-management": <AccessPage />,
    account: (
      <AccountPage
        user={user}
        onUserUpdated={(nextUser) => {
          setUser(nextUser);
          setError("");
        }}
      />
    ),
  };

  return (
    <UniformLayout
      user={user}
      currentPage={page}
      navigate={navigate}
      logout={logout}
    >
      {pages[page] || pages.dashboard}
    </UniformLayout>
  );
}
