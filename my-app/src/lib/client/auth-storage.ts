export const ACCESS_TOKEN_KEY = "vitalpulse.accessToken";
export const REFRESH_TOKEN_KEY = "vitalpulse.refreshToken";

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
