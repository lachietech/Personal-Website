export function CredentialField({ label, ...inputProps }) {
  return (
    <label className="credential-field">
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  );
}
