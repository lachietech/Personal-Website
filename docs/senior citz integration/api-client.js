// Copy into Sandgate frontend/src/senior-api.js. No server secrets belong here.
const base = (import.meta.env.VITE_SENIOR_CITZ_API_URL || '/senior-citz/api').replace(/\/$/, '');
let csrfToken;
let pendingToken;

async function decode(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function refreshCsrf() {
  csrfToken = undefined;
  if (!pendingToken) {
    pendingToken = fetch(`${base}/csrf-token`, { credentials: 'include', cache: 'no-store' })
      .then(decode).then(data => {
        if (!data.csrfToken) throw new Error('Missing security token');
        csrfToken = data.csrfToken;
        return csrfToken;
      }).finally(() => { pendingToken = undefined; });
  }
  return pendingToken;
}

export async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken) await refreshCsrf();
    headers.set('X-CSRF-Token', csrfToken);
  }
  // Preserve FormData's browser-generated multipart boundary.
  const response = await fetch(`${base}${path}`, { ...options, method, headers, credentials: 'include', cache: 'no-store' });
  return decode(response);
}

export async function login(username, password) {
  // Refresh also recovers from an expired session before a new sign-in attempt.
  await refreshCsrf();
  await request('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  await refreshCsrf();
}

export async function logout() {
  await request('/admin/logout', { method: 'POST' });
  csrfToken = undefined;
}
