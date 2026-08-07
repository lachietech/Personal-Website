export function Brand({ className = "", compact = false }) {
  return (
    <a className={className} href="#home">
      <span className="brand-mark">N</span>
      <span className="brand-name">
        Nielsen {compact ? "Innovations" : <strong>Innovations</strong>}
      </span>
    </a>
  );
}
