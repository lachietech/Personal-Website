export const MAX_LINE_ITEMS = 60;
export const MAX_HOUR_ENTRIES = 120;

export function validateUsername(username) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return "Username must be 3-32 characters and use only letters, numbers, dots, underscores, or hyphens";
  }
  return null;
}

export function validatePassword(password) {
  if (password.length < 12 || password.length > 256) {
    return "Password must be 12-256 characters";
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include upper case, lower case, and a number";
  }
  return null;
}

export function getRequiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return trimmed;
}

export function getOptionalText(value, maxLength) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error("Invalid text value");
  }
  return value.trim().slice(0, maxLength);
}

export function getEmail(value) {
  const email = getRequiredText(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }
  return email;
}

export function getDate(value, field) {
  const date = new Date(`${String(value || "")}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid`);
  }
  return date;
}

export function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
