const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('fk_token');
}

function setToken(token) {
  localStorage.setItem('fk_token', token);
}

function clearToken() {
  localStorage.removeItem('fk_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

export const tabletApi = {
  get: (path) => apiFetch(`/tablet${path}`),
  patch: (path, body) => apiFetch(`/tablet${path}`, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};

export { getToken, setToken, clearToken };
