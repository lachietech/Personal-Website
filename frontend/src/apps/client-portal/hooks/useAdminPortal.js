import { useCallback, useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { emptyBilling } from "../utils/portalUtils.js";

export function useAdminPortal() {
  const [clients, setClients] = useState([]);
  const [billing, setBilling] = useState(emptyBilling);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const adminData = await portalRequest("/clientportal/api/admin/clients");

      setClients(adminData.clients);
      setBilling(adminData.billing || emptyBilling);
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
    billing,
    setBilling,
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
