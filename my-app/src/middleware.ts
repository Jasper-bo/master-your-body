import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";

const protectedPaths = ["/dashboard", "/nutrition", "/training", "/settings"];
const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasValidSession = await isValidAccessToken(accessToken);

  if (authPaths.includes(pathname) && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (authPaths.includes(pathname) && refreshToken) {
    return redirectToRefresh(request, "/dashboard");
  }

  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (hasValidSession) {
      return NextResponse.next();
    }

    const redirectPath = `${pathname}${request.nextUrl.search}`;

    if (refreshToken) {
      return redirectToRefresh(request, redirectPath);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function isValidAccessToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  try {
    await verifyJwt(token, "access", serverEnv.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

function redirectToRefresh(request: NextRequest, redirectPath: string) {
  const refreshUrl = new URL("/api/auth/refresh", request.url);
  refreshUrl.searchParams.set("redirect", redirectPath);

  return NextResponse.redirect(refreshUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/nutrition/:path*",
    "/training/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
