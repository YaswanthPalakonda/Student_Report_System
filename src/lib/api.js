const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let csrfToken = '';
export const setCsrfToken = value => { csrfToken = value || ''; };
export async function api(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, { method, credentials: 'include', signal,
      headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken } : {}) },
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('session-expired'));
    const details = payload?.errors?.map(item => `${item.field}: ${item.message}`).join(' ');
    const error = new Error(details || payload?.message || 'The server returned an unexpected response. Check the API configuration.');
    error.status = response.status;
    throw error;
  }
  return payload.data;
}
