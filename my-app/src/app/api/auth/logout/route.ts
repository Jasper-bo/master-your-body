import type { NextRequest } from "next/server";
import { ok } from "@/app/api/_lib/response";
import { clearAuthCookies, REFRESH_COOKIE } from "@/lib/server/cookies";
import { requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { revokeRefreshToken } from "@/lib/server/token-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  } else {
    await prisma.refreshToken.updateMany({
      where: {
        userId: authResult.auth.userId,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }

  const response = ok({
    message: "登出成功",
  });

  return clearAuthCookies(response);
}
