/**
 * JanSetu Central API Client
 *
 * Configurable client connecting JanSetu frontend to Kenneth's grievance-backend API.
 * Handles:
 *  - Configurable baseURL from environment
 *  - Automatic JWT Bearer token attachment
 *  - Automatic 401 token refresh retry flow
 *  - Normalized FastAPI error response parsing
 *  - Clean TypeScript generics for all HTTP methods
 */

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'; // Defaults to false in production integration
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const ACCESS_TOKEN_KEY = 'jansetu_access_token';
export const REFRESH_TOKEN_KEY = 'jansetu_refresh_token';

export const isUuid = (val?: string | null): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// Delay helper for mock simulation mode
export const delay = (ms: number = 80): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Token management helpers
export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setTokens(accessToken: string, refreshToken?: string) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch (e) {
      console.error('Failed to save auth tokens to localStorage', e);
    }
  },
  clearTokens() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear auth tokens', e);
    }
  },
};

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Normalizes FastAPI/Pydantic error responses into a human-readable string.
 */
function parseErrorMessage(data: any, defaultMsg: string): string {
  if (!data) return defaultMsg;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item: any) => item.msg || JSON.stringify(item))
      .join('; ');
  }
  if (data.message && typeof data.message === 'string') return data.message;
  return defaultMsg;
}

/**
 * Core fetch wrapper with auth header injection and automatic token refresh.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, headers = {}, ...rest } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
    });
  } catch (netErr: any) {
    throw new ApiError(
      netErr.message || 'Unable to connect to JanSetu backend. Check server connectivity.',
      0
    );
  }

  // Handle 401 Unauthorized with token refresh (except when calling auth endpoints)
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            tokenStorage.setTokens(data.access_token);
            isRefreshing = false;
            onRefreshed(data.access_token);
          } else {
            isRefreshing = false;
            tokenStorage.clearTokens();
            window.dispatchEvent(new CustomEvent('jansetu:session_expired'));
            throw new ApiError('Session expired. Please log in again.', 401);
          }
        } catch (err) {
          isRefreshing = false;
          tokenStorage.clearTokens();
          window.dispatchEvent(new CustomEvent('jansetu:session_expired'));
          throw new ApiError('Session expired. Please log in again.', 401);
        }
      }

      // Queue retry for concurrent requests
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber(async (newToken: string) => {
          try {
            const retryHeaders = {
              ...finalHeaders,
              Authorization: `Bearer ${newToken}`,
            };
            const retryRes = await fetch(url, { ...rest, headers: retryHeaders });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => null);
              reject(
                new ApiError(
                  parseErrorMessage(errData, 'Request failed after token refresh'),
                  retryRes.status,
                  errData
                )
              );
            } else {
              const json = await retryRes.json();
              resolve(json);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
    } else {
      tokenStorage.clearTokens();
      window.dispatchEvent(new CustomEvent('jansetu:session_expired'));
      throw new ApiError('Authentication required. Please sign in.', 401);
    }
  }

  // Handle other error responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = parseErrorMessage(
      errorData,
      `API request failed with status ${response.status}`
    );
    throw new ApiError(message, response.status, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },
  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
