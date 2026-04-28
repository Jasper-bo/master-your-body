export const ACCESS_TOKEN_KEY = "vitalpulse.accessToken";
export const REFRESH_TOKEN_KEY = "vitalpulse.refreshToken";

export function storeAuthTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
