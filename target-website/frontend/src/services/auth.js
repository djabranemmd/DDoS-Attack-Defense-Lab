
const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "nexora_access_token";

async function authRequest(endpoint, payload = null, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method: payload ? "POST" : "GET",
    headers,
  };

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed with status ${response.status}`
    );
  }

  return data;
}

export async function registerUser(userData) {
  return authRequest("/api/auth/register", userData);
}

export async function loginUser(credentials) {
  return authRequest("/api/auth/login", credentials);
}

export async function getCurrentUser(token = getAccessToken()) {
  if (!token) {
    throw new Error("Authentication required");
  }

  return authRequest("/api/auth/me", null, token);
}

export function saveAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}
