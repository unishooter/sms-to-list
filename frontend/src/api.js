const BASE = '/api';

function getToken() {
  return localStorage.getItem('google_credential');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expired or invalid — clear it so the app prompts re-login
    localStorage.removeItem('google_credential');
    window.dispatchEvent(new Event('auth:expired'));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const getLists = () => request('/lists');

export const getListItems = (listId) => request(`/lists/${listId}/items`);

export const updateItemStatus = (itemId, status) =>
  request(`/items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const updateListStatus = (listId, status) =>
  request(`/lists/${listId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const moveItem = (itemId, listId) =>
  request(`/items/${itemId}/list`, {
    method: 'PATCH',
    body: JSON.stringify({ listId }),
  });
