/**
 * ApiClient.js
 * Centralized API client with configurable base URL.
 */
class ApiClient {
  constructor(baseUrl = "http://localhost:5000") {
    this.baseUrl = baseUrl;
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  }

  async request(endpoint, options) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API Request failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export default ApiClient;
