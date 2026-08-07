let csrfTokenPromise;

export async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/csrf-token", {
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to fetch the security token.");
        }
        return response.json();
      })
      .then((data) => data.csrfToken);
  }

  return csrfTokenPromise;
}

export async function portalRequest(path, options = {}) {
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  const requestOptions = {
    method,
    credentials: "same-origin",
    headers,
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers["x-csrf-token"] = await getCsrfToken();
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, requestOptions);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export async function portalUpload(path, formData) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-csrf-token": await getCsrfToken() },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Upload failed.");
  }

  return data;
}
