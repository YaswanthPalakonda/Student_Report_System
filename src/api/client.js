const API_BASE = '/api';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE_NAME = 'srs_csrf';

let cachedCsrfToken = null;
let csrfPromise = null;
let unauthorizedHandler = null;

export class ApiClientError extends Error {
  constructor(message, { status = 500, code = 'REQUEST_FAILED', details = null } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }

  return null;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorMessage(payload, status) {
  const apiError = payload?.error;
  if (!apiError) {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 429) return 'Too many requests. Please wait and try again.';
    return `Request failed with status ${status}.`;
  }

  const firstFieldMessage = apiError.details?.fields?.[0]?.message;
  if (firstFieldMessage && apiError.message === 'The request data is invalid.') {
    return firstFieldMessage;
  }

  return apiError.message || `Request failed with status ${status}.`;
}

export async function fetchCsrfToken(forceRefresh = false) {
  if (!forceRefresh) {
    const cookieToken = readCookie(CSRF_COOKIE_NAME);
    if (cookieToken) {
      cachedCsrfToken = cookieToken;
      return cookieToken;
    }

    if (cachedCsrfToken) {
      return cachedCsrfToken;
    }
  }

  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    const response = await fetch(`${API_BASE}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw new ApiClientError(extractErrorMessage(payload, response.status), {
        status: response.status,
        code: payload?.error?.code || 'CSRF_FETCH_FAILED',
        details: payload?.error?.details || null
      });
    }

    const token = payload?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
    if (!token) {
      throw new ApiClientError('Unable to obtain a CSRF token.', {
        status: 500,
        code: 'CSRF_TOKEN_UNAVAILABLE'
      });
    }

    cachedCsrfToken = token;
    return token;
  })();

  try {
    return await csrfPromise;
  } finally {
    csrfPromise = null;
  }
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = `${API_BASE}${normalizedPath}`;

  if (!query) {
    return base;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    headers: customHeaders = {},
    skipAuthRedirect = false,
    _csrfRetried = false
  } = options;

  const upperMethod = method.toUpperCase();
  const isMutation = STATE_CHANGING_METHODS.has(upperMethod);

  const headers = {
    Accept: 'application/json',
    ...customHeaders
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (isMutation) {
    const csrfToken = await fetchCsrfToken(false);
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method: upperMethod,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiClientError('Unable to reach the server. Please check your connection.', {
      status: 0,
      code: 'NETWORK_ERROR'
    });
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const code = payload?.error?.code || 'REQUEST_FAILED';

    if (
      isMutation &&
      !_csrfRetried &&
      response.status === 403 &&
      (code === 'CSRF_TOKEN_MISSING' || code === 'CSRF_TOKEN_INVALID')
    ) {
      cachedCsrfToken = null;
      await fetchCsrfToken(true);
      return apiRequest(path, { ...options, _csrfRetried: true });
    }

    if (response.status === 401 && !skipAuthRedirect && unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new ApiClientError(extractErrorMessage(payload, response.status), {
      status: response.status,
      code,
      details: payload?.error?.details || null
    });
  }

  return payload?.data ?? null;
}

export const api = {
  getCsrf: () => fetchCsrfToken(true),
  login: credentials =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuthRedirect: true
    }),
  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
      skipAuthRedirect: true
    }),
  me: () =>
    apiRequest('/auth/me', {
      method: 'GET',
      skipAuthRedirect: true
    }),

  // Admin
  getAdminOverview: () => apiRequest('/admin/overview'),
  listUsers: query => apiRequest('/users', { query }),
  getUser: id => apiRequest(`/users/${id}`),
  createUser: data => apiRequest('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => apiRequest(`/users/${id}`, { method: 'PATCH', body: data }),
  deleteUser: id => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  // Assignments
  listAssignments: () => apiRequest('/assignments'),
  createAssignment: data => apiRequest('/assignments', { method: 'POST', body: data }),
  deleteAssignment: id => apiRequest(`/assignments/${id}`, { method: 'DELETE' }),

  // Reports
  listReports: query => apiRequest('/reports', { query }),
  getReport: id => apiRequest(`/reports/${id}`),
  createReport: data => apiRequest('/reports', { method: 'POST', body: data }),
  updateReport: (id, data) => apiRequest(`/reports/${id}`, { method: 'PATCH', body: data }),

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: data => apiRequest('/settings', { method: 'PUT', body: data }),

  // Teacher
  getTeacherOverview: () => apiRequest('/teacher/overview'),
  getTeacherStudents: query => apiRequest('/teacher/students', { query }),
  getTeacherRoster: query => apiRequest('/teacher/roster', { query }),

  // Student
  getStudentOverview: () => apiRequest('/student/overview')
};
