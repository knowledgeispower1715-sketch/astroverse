/**
 * AstroVerse Mobile OS - Unified API Client
 * Manages HTTP communication, token authorization headers, timeouts, and fallback routing.
 */

// Production Vercel domain or local proxy
export const API_BASE_URL = 'https://astroverse-eta.vercel.app';

class ApiClient {
  private authToken: string | null = null;

  public setToken(token: string | null) {
    this.authToken = token;
  }

  public getToken(): string | null {
    return this.authToken;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        return {
          error: data?.error || data?.message || `Request failed with status ${response.status}`,
          status: response.status
        };
      }

      return { data, status: response.status };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        error: isTimeout ? 'Network request timed out. Please check your internet connection.' : (err?.message || 'Network error'),
        status: 0
      };
    }
  }

  public get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers
    });
  }

  public put<T>(endpoint: string, body: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers
    });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
