import { apiFetch } from "../../../api/http.js";
let csrfTokenPromise;

export async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = apiFetch("/csrf-token", {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to fetch the security token.");
        }
        return response.json();
      })
      .then((data) => data.csrfToken);
    csrfTokenPromise.catch(() => {
      csrfTokenPromise = undefined;
    });
  }

  return csrfTokenPromise;
}

export async function portalRequest(path, options = {}) {
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  const requestOptions = {
    method,
    credentials: "include",
    headers,
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers["x-csrf-token"] = await getCsrfToken();
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await apiFetch(path, requestOptions);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function portalUpload(path, formData) {
  const response = await apiFetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "x-csrf-token": await getCsrfToken() },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Upload failed.");
  }

  return data;
}
