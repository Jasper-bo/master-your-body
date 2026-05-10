import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { createTokenPair, verifyJwt } from "@/lib/server/jwt";
import { prisma } from "@/lib/server/prisma";
import {
  hashToken,
  persistRefreshToken,
  revokeRefreshToken,
} from "@/lib/server/token-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return fail("UNAUTHORIZED", "Refresh Token 无效或已过期", 401);
  }

  try {
    const tokens = await rotateRefreshToken(refreshToken);
    const response = ok({
      expiresIn: tokens.expiresIn,
    });

    return setAuthCookies(response, tokens);
  } catch {
    return clearAuthCookies(
      fail("UNAUTHORIZED", "Refresh Token 无效或已过期", 401),
    );
  }
}

export async function GET(request: NextRequest) {
  const redirectPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return redirectToLogin(request, redirectPath);
  }

  try {
    const tokens = await rotateRefreshToken(refreshToken);
    const response = NextResponse.redirect(new URL(redirectPath, request.url));

    return setAuthCookies(response, tokens);
  } catch {
    return redirectToLogin(request, redirectPath);
  }
}

async function rotateRefreshToken(refreshToken: string) {
  const payload = await verifyJwt(
    refreshToken,
    "refresh",
    serverEnv.jwtRefreshSecret,
  );
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (
    !storedToken ||
    storedToken.revoked ||
    storedToken.expiresAt.getTime() <= Date.now() ||
    storedToken.userId !== payload.sub
  ) {
    throw new Error("Invalid refresh token");
  }

  await revokeRefreshToken(refreshToken);

  const tokens = await createTokenPair(storedToken.user);
  await persistRefreshToken(storedToken.userId, tokens);

  return tokens;
}

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard";
  }

  return redirect;
}

function redirectToLogin(request: NextRequest, redirectPath: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", redirectPath);

  return clearAuthCookies(NextResponse.redirect(loginUrl));
}
