import type { NextResponse } from "next/server";
import type { TokenPair } from "@/lib/server/jwt";
import { serverEnv } from "@/lib/server/env";

export const ACCESS_COOKIE = "vitalpulse_access";
export const REFRESH_COOKIE = "vitalpulse_refresh";

const cookieDefaults = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: serverEnv.sessionCookieSecure,
  path: "/",
};

export function setAuthCookies(response: NextResponse, tokens: TokenPair) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieDefaults,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieDefaults,
    maxAge: Math.max(
      1,
      Math.floor((tokens.refreshExpiresAt.getTime() - Date.now()) / 1000),
    ),
  });

  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...cookieDefaults,
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    ...cookieDefaults,
    maxAge: 0,
  });

  return response;
}
