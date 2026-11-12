import { apiFetch } from "../../../api/http.js";
async function readJson(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "The request could not be completed.",
    );
  }

  return data;
}

export async function getProjects() {
  const response = await apiFetch("/clientportal/api/projects", {
    credentials: "include",
    cache: "no-store",
  });

  const data = await readJson(response);
  return data.projects || [];
}

export async function sendContactMessage(message) {
  const response = await apiFetch("/clientportal/api/konnect/contact", {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      website: message.website,
      username: "nielseninnovations",
    }),
  });

  return readJson(response);
}
