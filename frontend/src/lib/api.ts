import type { AliasResult, AuthPayload, ShortUrl, UrlListResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  details?: unknown;
};

type RequestOptions = {
  token?: string;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? "Request failed", payload?.details);
  }

  return payload?.data as T;
};

export const api = {
  baseUrl: API_BASE_URL,

  googleLogin: (input: { credential: string }) =>
    request<AuthPayload>("/api/auth/google", {
      method: "POST",
      body: input
    }),

  me: (token: string) => request<{ user: AuthPayload["user"] }>("/api/auth/me", { token }),

  listUrls: (token: string, query: { search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    params.set("page", String(query.page ?? 1));
    params.set("limit", String(query.limit ?? 20));

    if (query.search) {
      params.set("search", query.search);
    }

    return request<UrlListResponse>(`/api/urls?${params.toString()}`, { token });
  },

  createUrl: (token: string, input: { originalUrl: string; customAlias?: string }) =>
    request<ShortUrl>("/api/urls", {
      token,
      method: "POST",
      body: input
    }),

  updateUrl: (token: string, id: string, input: { originalUrl?: string; customAlias?: string | null }) =>
    request<ShortUrl>(`/api/urls/${id}`, {
      token,
      method: "PATCH",
      body: input
    }),

  deleteUrl: (token: string, id: string) =>
    request<void>(`/api/urls/${id}`, {
      token,
      method: "DELETE"
    }),

  searchAliases: (token: string, query: { q: string; limit?: number }) => {
    const params = new URLSearchParams();
    params.set("q", query.q);
    params.set("limit", String(query.limit ?? 10));

    return request<AliasResult[]>(`/api/urls/custom-names/search?${params.toString()}`, { token });
  }
};
