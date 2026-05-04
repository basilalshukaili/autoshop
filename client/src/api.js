const BASE = '/api';

function getToken() {
  return localStorage.getItem('autoshop_token');
}

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const tok = getToken();
  if (tok) headers['x-auth-token'] = tok;
  const r = await fetch(`${BASE}${path}`, { ...opts, headers });
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) {
    const err = new Error(body?.error || `HTTP ${r.status}`);
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body || {}) });
export const put = (p, body) => api(p, { method: 'PUT', body: JSON.stringify(body || {}) });
export const patch = (p, body) => api(p, { method: 'PATCH', body: JSON.stringify(body || {}) });
export const del = (p) => api(p, { method: 'DELETE' });
