import type { NextRequest } from "next/server";
import { fail } from "@/app/api/_lib/response";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";

export type AuthContext = {
  userId: string;
  phone: string;
  accessToken: string;
};

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const headerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const accessToken = headerToken || cookieToken;

  if (!accessToken) {
    throw new Error("Missing access token");
  }

  const payload = await verifyJwt(accessToken, "access", serverEnv.jwtSecret);

  return {
    userId: payload.sub,
    phone: payload.phone,
    accessToken,
  };
}

export async function requireAuth(request: NextRequest) {
  try {
    return {
      ok: true as const,
      auth: await getAuthContext(request),
    };
  } catch {
    return {
      ok: false as const,
      response: fail("UNAUTHORIZED", "认证令牌无效或已过期", 401),
    };
  }
}
