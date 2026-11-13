import { AppTopbar } from "../../components/AppTopbar.jsx";

const folders = [
  ["inbox", "Inbox", "bi-inbox"],
  ["unread", "Unread", "bi-envelope"],
  ["starred", "Starred", "bi-star"],
  ["archive", "Archive", "bi-archive"],
  ["all", "All messages", "bi-stack"],
];
const date = (value, full = false) =>
  new Intl.DateTimeFormat(
    undefined,
    full
      ? { dateStyle: "medium", timeStyle: "short" }
      : { month: "short", day: "numeric" },
  ).format(new Date(value));
const initials = (value) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
function Icon({ name }) {
  return <i className={`bi ${name}`} aria-hidden="true" />;
}

export function MailboxView({
  user,
  folder,
  onFolder,
  search,
  onSearch,
  result,
  selectedId,
  onSelect,
  message,
  loading,
  reading,
  error,
  detailError,
  busy,
  onUpdate,
  onRefresh,
  page,
  onPage,
}) {
  const title = folders.find(([id]) => id === folder)?.[1] || "Inbox";
  return (
    <div className="konnect-app">
      <AppTopbar
        brand={
          <a className="konnect-wordmark" href="/clientportal/konnect">
            <span>
              <Icon name="bi-inbox-fill" />
            </span>
            konnect<span className="konnect-wordmark-sub">MAILBOX</span>
          </a>
        }
        search={
          <label className="konnect-search">
            <Icon name="bi-search" />
            <span className="visually-hidden">Search messages</span>
            <input
              type="search"
              placeholder="Search your messages"
              maxLength={120}
              value={search}
              onChange={(event) => onSearch(event.target.value)}
            />
          </label>
        }
      >
        <a href="/clientportal" className="konnect-apps-link" aria-label="Applications">
          <Icon name="bi-grid" />
          <span>Applications</span>
        </a>
        <a
          className="konnect-avatar"
          href="/clientportal/account"
          aria-label={`Account: ${user.username}`}
          title={user.username}
        >
          {initials(user.username)}
        </a>
      </AppTopbar>
      <div className="konnect-workspace">
        <aside className="konnect-sidebar">
          <p className="konnect-sidebar-heading">YOUR MAILBOX</p>
          <nav aria-label="Mailbox folders">
            {folders.map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                className={folder === id ? "active" : ""}
                aria-current={folder === id ? "page" : undefined}
                onClick={() => onFolder(id)}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {result.counts[id] > 0 && <small>{result.counts[id]}</small>}
              </button>
            ))}
          </nav>
          <div className="konnect-sidebar-bottom">
            <div className="konnect-receive-note">
              <Icon name="bi-shield-check" />
              <div>
                <strong>Your enquiries, together</strong>
                <p>
                  Messages from website contact forms, delivered directly to
                  you.
                </p>
              </div>
            </div>
          </div>
        </aside>
        <main className={`konnect-mail${selectedId ? " has-selection" : ""}`}>
          <section
            className="konnect-message-list"
            aria-label={`${title} messages`}
          >
            <div className="konnect-list-heading">
              <div>
                <h1>{title}</h1>
                <span>
                  {result.total} {result.total === 1 ? "message" : "messages"}
                </span>
              </div>
              <button
                className="konnect-icon-button"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh messages"
              >
                <Icon name="bi-arrow-clockwise" />
              </button>
            </div>
            {search && (
              <div className="konnect-search-context">
                Results for “{search}”
              </div>
            )}
            {error && (
              <div className="konnect-status error" role="alert">
                {error}
                <button onClick={onRefresh}>Try again</button>
              </div>
            )}
            {loading && (
              <div className="konnect-loading-line" role="status">
                Updating mailbox...
              </div>
            )}
            <div className="konnect-message-scroll">
              {!loading && !error && result.messages.length === 0 && (
                <div className="konnect-empty-list">
                  <Icon name={search ? "bi-search" : "bi-inbox"} />
                  <h2>
                    {search ? "No matching messages" : "You’re all caught up"}
                  </h2>
                  <p>
                    {search
                      ? "Try a different name, email or keyword."
                      : "New contact enquiries will appear here."}
                  </p>
                </div>
              )}
              {result.messages.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`konnect-message-row${!item.read ? " unread" : ""}${selectedId === item.id ? " selected" : ""}`}
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selectedId === item.id}
                >
                  <span className="konnect-sender-avatar">
                    {initials(item.sender.name)}
                  </span>
                  <span className="konnect-row-content">
                    <span className="konnect-row-heading">
                      <strong>{item.sender.name}</strong>
                      <time dateTime={item.createdAt}>
                        {date(item.createdAt)}
                      </time>
                    </span>
                    <span className="konnect-row-subject">
                      {!item.read && (
                        <span
                          className="konnect-unread-dot"
                          aria-label="Unread"
                        />
                      )}
                      {item.subject}
                    </span>
                    <span className="konnect-row-preview">{item.preview}</span>
                    <span className="konnect-row-source">
                      {item.source.name}
                      {item.starred && <Icon name="bi-star-fill" />}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="konnect-pagination">
              <span>
                Page {page} of{" "}
                {Math.max(1, Math.ceil(result.total / result.pageSize))}
              </span>
              <div>
                <button
                  onClick={() => onPage(page - 1)}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                >
                  <Icon name="bi-chevron-left" />
                </button>
                <button
                  onClick={() => onPage(page + 1)}
                  disabled={page * result.pageSize >= result.total || loading}
                  aria-label="Next page"
                >
                  <Icon name="bi-chevron-right" />
                </button>
              </div>
            </div>
          </section>
          <section className="konnect-reader" aria-label="Message reading pane">
            {selectedId && (
              <div className="konnect-reader-toolbar">
                <button
                  className="konnect-icon-button konnect-back"
                  onClick={() => onSelect(null)}
                  aria-label="Back to messages"
                >
                  <Icon name="bi-arrow-left" />
                </button>
                {message && (
                  <>
                    <button
                      className="konnect-tool"
                      aria-label={
                        message.archived ? "Move to inbox" : "Archive message"
                      }
                      disabled={busy}
                      onClick={() => onUpdate({ archived: !message.archived })}
                    >
                      <Icon
                        name={message.archived ? "bi-inbox" : "bi-archive"}
                      />
                      <span>
                        {message.archived ? "Move to inbox" : "Archive"}
                      </span>
                    </button>
                    <button
                      className="konnect-tool"
                      aria-label={message.read ? "Mark unread" : "Mark read"}
                      disabled={busy}
                      onClick={() => onUpdate({ read: !message.read })}
                    >
                      <Icon
                        name={message.read ? "bi-envelope" : "bi-envelope-open"}
                      />
                      <span>{message.read ? "Mark unread" : "Mark read"}</span>
                    </button>
                    <button
                      className={`konnect-icon-button konnect-star${message.starred ? " starred" : ""}`}
                      disabled={busy}
                      aria-label={
                        message.starred ? "Remove star" : "Star message"
                      }
                      aria-pressed={message.starred}
                      onClick={() => onUpdate({ starred: !message.starred })}
                    >
                      <Icon
                        name={message.starred ? "bi-star-fill" : "bi-star"}
                      />
                    </button>
                  </>
                )}
              </div>
            )}
            {detailError && (
              <div className="konnect-status error" role="alert">
                {detailError}
              </div>
            )}
            {reading && (
              <div className="konnect-reader-empty" role="status">
                Opening message...
              </div>
            )}
            {!selectedId && (
              <div className="konnect-reader-empty">
                <span className="konnect-empty-art">
                  <Icon name="bi-envelope-paper" />
                </span>
                <h2>A little more connected.</h2>
                <p>Select a message to read the full enquiry.</p>
                <span className="konnect-empty-caption">
                  Your inbox. A clearer picture.
                </span>
              </div>
            )}
            {!reading && message && (
              <article className="konnect-message-detail">
                <span className="konnect-source-label">
                  <Icon name="bi-globe2" />
                  {message.source.name}
                </span>
                <h2>{message.subject}</h2>
                <div className="konnect-sender">
                  <span className="konnect-sender-avatar">
                    {initials(message.sender.name)}
                  </span>
                  <div>
                    <strong>{message.sender.name}</strong>
                    <span>{message.sender.email}</span>
                    <small>To your Konnect inbox</small>
                  </div>
                  <time dateTime={message.createdAt}>
                    {date(message.createdAt, true)}
                  </time>
                </div>
                <div className="konnect-message-body">{message.body}</div>
                <footer className="konnect-message-footer">
                  <Icon name="bi-info-circle" /> Received through a contact
                  form. The sender’s email address is provided by the sender.
                </footer>
              </article>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
