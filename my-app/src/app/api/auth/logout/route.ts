import type { NextRequest } from "next/server";
import { ok } from "@/app/api/_lib/response";
import { clearAuthCookies, REFRESH_COOKIE } from "@/lib/server/cookies";
import { getLogoutRevocationTarget } from "@/lib/server/logout-policy";
import { revokeRefreshToken } from "@/lib/server/token-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const revocationTarget = getLogoutRevocationTarget(refreshToken);

  if (revocationTarget.kind === "current-token") {
    await revokeRefreshToken(revocationTarget.refreshToken);
  }

  const response = ok({
    message: "登出成功",
  });

  return clearAuthCookies(response);
}
