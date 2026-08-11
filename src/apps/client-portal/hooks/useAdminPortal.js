import { useCallback, useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { emptyBilling } from "../utils/portalUtils.js";

export function useAdminPortal() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [bookkeeping, setBookkeeping] = useState({
    categories: [],
    accounts: [],
    transactions: [],
    rules: [],
  });
  const [billing, setBilling] = useState(emptyBilling);
  const [user, setUser] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [adminData, projectData, bookkeepingData, accountData] =
        await Promise.all([
          portalRequest("/clientportal/api/admin/clients"),
          portalRequest("/clientportal/api/projects/admin"),
          portalRequest("/clientportal/api/bookkeeping"),
          portalRequest("/clientportal/api/auth/me"),
        ]);

      setClients(adminData.clients);
      setBilling(adminData.billing || emptyBilling);
      setProjects(projectData.projects);
      setBookkeeping(bookkeepingData);
      setUser(accountData.user);
      setSelectedClientId(
        (current) => current || adminData.clients[0]?.id || null,
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const selectedInvoice = useMemo(() => {
    return (
      selectedClient?.invoices.find(
        (invoice) => invoice.id === selectedInvoiceId,
      ) ||
      selectedClient?.invoices[0] ||
      null
    );
  }, [selectedClient, selectedInvoiceId]);

  useEffect(() => {
    if (
      selectedClient &&
      !selectedClient.invoices.some(
        (invoice) => invoice.id === selectedInvoiceId,
      )
    ) {
      setSelectedInvoiceId(selectedClient.invoices[0]?.id || null);
    }
  }, [selectedClient, selectedInvoiceId]);

  function replaceClient(client) {
    setClients((current) => {
      const exists = current.some((item) => item.id === client.id);
      return exists
        ? current.map((item) => (item.id === client.id ? client : item))
        : [...current, client].sort((a, b) =>
            a.business.localeCompare(b.business),
          );
    });
    setSelectedClientId(client.id);
  }

  return {
    clients,
    setClients,
    projects,
    setProjects,
    bookkeeping,
    setBookkeeping,
    billing,
    setBilling,
    user,
    setUser,
    selectedClient,
    selectedClientId,
    setSelectedClientId,
    selectedInvoice,
    selectedInvoiceId,
    setSelectedInvoiceId,
    replaceClient,
    loading,
    error,
    reload: load,
  };
}
