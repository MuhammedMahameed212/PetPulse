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
    "Content-Type": "application/json",
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
    throw new Error(message);
  }
  return data;
}

