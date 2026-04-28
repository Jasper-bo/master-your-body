import type { ApiResponse } from "@/types/api";
import { getAccessToken } from "@/lib/client/auth-storage";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function apiRequest<TData>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
) {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const json = (await response.json()) as ApiResponse<TData>;

  if (!json.success) {
    throw new ApiClientError(
      json.error.message,
      response.status,
      json.error.code,
    );
  }

  return json.data;
}
