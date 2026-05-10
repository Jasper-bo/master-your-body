export { ApiClientError } from "@/lib/client/api-transport";
import { createApiRequester } from "@/lib/client/api-transport";

const request = createApiRequester();

export async function apiRequest<TData>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
) {
  return request(path, init, options) as Promise<TData>;
}
