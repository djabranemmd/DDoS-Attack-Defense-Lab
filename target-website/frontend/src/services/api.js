
const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return null;
  }
}

export async function checkServerHealth() {
  const data = await apiRequest("/health");

  if (!data) {
    return {
      status: "offline",
      database: "unknown",
    };
  }

  return {
    status: data.status,
    database: data.database,
  };
}

export async function getApplicationStatus() {
  return await apiRequest("/api/status");
}
