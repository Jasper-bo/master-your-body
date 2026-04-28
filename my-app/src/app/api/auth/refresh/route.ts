import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { REFRESH_COOKIE, setAuthCookies } from "@/lib/server/cookies";
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
  const body = await request.json().catch(() => null);
  const bodyRefreshToken =
    body && typeof body === "object" && "refreshToken" in body
      ? String(body.refreshToken)
      : null;
  const refreshToken = bodyRefreshToken || request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return fail("UNAUTHORIZED", "Refresh Token 无效或已过期", 401);
  }

  try {
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
      return fail("UNAUTHORIZED", "Refresh Token 无效或已过期", 401);
    }

    await revokeRefreshToken(refreshToken);

    const tokens = await createTokenPair(storedToken.user);
    await persistRefreshToken(storedToken.userId, tokens);

    const response = ok({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    return setAuthCookies(response, tokens);
  } catch {
    return fail("UNAUTHORIZED", "Refresh Token 无效或已过期", 401);
  }
}
