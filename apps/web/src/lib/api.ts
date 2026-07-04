import type { ApiError } from "@ligas/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiRequestError extends Error {
  constructor(public readonly payload: ApiError) {
    super(payload.message);
    this.name = "ApiRequestError";
  }
}

/**
 * Cliente HTTP del navegador. `credentials: "include"` para que viaje la
 * cookie httpOnly del refresh token.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body: unknown = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new ApiRequestError(body as ApiError);
  return body as T;
}

// El access token vive en memoria (nunca en localStorage). Al recargar la
// página se recupera vía POST /auth/refresh usando la cookie httpOnly.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function authedApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  return api<T>(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
}
