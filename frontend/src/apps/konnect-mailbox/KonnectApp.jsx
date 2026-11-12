import { useEffect, useRef, useState } from "react";
import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { portalRequest } from "../client-portal/api/portalApi.js";
import { MailboxView } from "./MailboxView.jsx";

const API = "/clientportal/api/konnect";
export function KonnectApp() {
  return <PortalSession>{(user) => <Mailbox user={user} />}</PortalSession>;
}

function Mailbox({ user }) {
  const [folder, setFolder] = useState("inbox");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({
    messages: [],
    total: 0,
    counts: {},
    pageSize: 25,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const selected = useRef(selectedId);
  selected.current = selectedId;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setVersion((value) => value + 1);
    };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const parameters = new URLSearchParams({
      folder,
      q: query,
      page: String(page),
    });
    portalRequest(`${API}/messages?${parameters}`)
      .then((data) => {
        if (!active) return;
        if (page > 1 && !data.messages.length) {
          setPage(page - 1);
          return;
        }
        setResult(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [folder, query, page, version]);
  useEffect(() => {
    let active = true;
    setMessage(null);
    setDetailError("");
    if (!selectedId) {
      setReading(false);
      return;
    }
    setReading(true);
    portalRequest(`${API}/messages/${selectedId}`)
      .then(async (data) => {
        if (!active) return;
        // Keep the received message readable if updating its read marker fails.
        setMessage(data.message);
        if (!data.message.read) {
          data = await portalRequest(`${API}/messages/${selectedId}`, {
            method: "PATCH",
            body: { read: true },
          });
          if (active) setVersion((value) => value + 1);
        }
        if (active) setMessage(data.message);
      })
      .catch((requestError) => {
        if (active) setDetailError(requestError.message);
      })
      .finally(() => {
        if (active) setReading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function update(patch) {
    if (!message || busy) return;
    const id = message.id;
    setBusy(true);
    setDetailError("");
    try {
      const data = await portalRequest(`${API}/messages/${id}`, {
        method: "PATCH",
        body: patch,
      });
      if (selected.current === id) setMessage(data.message);
      setVersion((value) => value + 1);
    } catch (requestError) {
      if (selected.current === id) setDetailError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function chooseFolder(value) {
    setFolder(value);
    setPage(1);
    setSelectedId(null);
  }
  return (
    <MailboxView
      user={user}
      folder={folder}
      onFolder={chooseFolder}
      search={search}
      onSearch={(value) => {
        setSearch(value);
        setSelectedId(null);
      }}
      result={result}
      selectedId={selectedId}
      onSelect={setSelectedId}
      message={message}
      loading={loading}
      reading={reading}
      error={error}
      detailError={detailError}
      busy={busy}
      onUpdate={update}
      onRefresh={() => setVersion((value) => value + 1)}
      page={page}
      onPage={(value) => {
        setPage(value);
        setSelectedId(null);
      }}
    />
  );
}
