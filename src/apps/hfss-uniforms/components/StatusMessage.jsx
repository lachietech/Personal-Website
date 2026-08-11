export function StatusMessage({ message }) {
  if (!message?.text) return null;
  return (
    <p className={`status-message ${message.type || "info"}`} role="status">
      {message.text}
    </p>
  );
}
