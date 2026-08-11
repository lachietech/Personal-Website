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
  const response = await fetch("/clientportal/api/projects", {
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = await readJson(response);
  return data.projects || [];
}

export async function sendContactMessage(message) {
  const tokenResponse = await fetch("/csrf-token", {
    credentials: "same-origin",
  });
  const { csrfToken } = await readJson(tokenResponse);

  const response = await fetch("/contact", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(message),
  });

  return readJson(response);
}
