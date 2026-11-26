const API_BASE = "/api";

export function getStoredToken() {
  return localStorage.getItem("petpulse_access_token");
}

export function setStoredAuth(tokens, user) {
  if (tokens?.access) {
    localStorage.setItem("petpulse_access_token", tokens.access);
  }
  if (tokens?.refresh) {
    localStorage.setItem("petpulse_refresh_token", tokens.refresh);
  }
  if (user) {
    localStorage.setItem("petpulse_user", JSON.stringify(user));
  }
}

export function clearStoredAuth() {
  localStorage.removeItem("petpulse_access_token");
  localStorage.removeItem("petpulse_refresh_token");
  localStorage.removeItem("petpulse_user");
}

export async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    // FormData needs the browser to set multipart/form-data with its boundary.
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.detail ||
      Object.entries(data)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
        .join(" | ") ||
      "Request failed.";
    const error = new Error(message);
    error.fields = data; // per-field messages, for forms that show them under each input
    throw error;
  }
  return data;
}

/** The server's error sentences without its field names (e.g. "dose_times:"), for messages shown to people. */
export function errorText(err) {
  return Object.values(err.fields || {}).flat().join(" ") || err.message;
}

/** Fetches a file with the sign-in token (an <img> or <video> can't send it) and returns it as a Blob. */
export async function apiBlob(endpoint) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Couldn't load the file.");
  return response.blob();
}
