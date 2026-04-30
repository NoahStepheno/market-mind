import { useAuth } from "@/store/auth";
import type { AuthExchangeResponse, User } from "@/types/auth";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<string> | null = null;

async function performRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    useAuth.getState().clearAuth();
    window.location.href = "/login";
    throw new ApiError(res.status, 401, "Session expired");
  }

  const data = await res.json();
  useAuth.getState().setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  });
  return data.accessToken;
}

async function getValidAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken, tokenExpiresAt } = useAuth.getState();

  if (!accessToken || !refreshToken) return null;

  if (tokenExpiresAt && Date.now() > tokenExpiresAt - 60_000) {
    if (!refreshPromise) {
      refreshPromise = performRefresh(refreshToken).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  return accessToken;
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    auth?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, signal, auth = true } = options;

  const reqHeaders: Record<string, string> = { ...headers };
  if (body) reqHeaders["Content-Type"] = "application/json";

  if (auth) {
    const token = await getValidAccessToken();
    if (token) reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && auth) {
    const { refreshToken } = useAuth.getState();
    if (refreshToken) {
      if (!refreshPromise) {
        refreshPromise = performRefresh(refreshToken).finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      reqHeaders["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: res.status, message: res.statusText }));
    throw new ApiError(res.status, err.code, err.message);
  }

  return res.json();
}

export async function exchangeCode(code: string): Promise<AuthExchangeResponse> {
  return apiFetch<AuthExchangeResponse>("/api/v1/auth/oauth/exchange-code", {
    method: "POST",
    body: { code },
    auth: false,
  });
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/api/v1/me");
}

export async function logout(refreshToken: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export function getGoogleStartUrl(): string {
  return `${baseUrl}/api/v1/auth/google/start`;
}

export function getWechatMpStartUrl(): string {
  return `${baseUrl}/api/v1/auth/wechat/mp/start`;
}
