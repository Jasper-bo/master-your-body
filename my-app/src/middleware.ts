import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";

const protectedPaths = ["/dashboard", "/nutrition", "/training", "/settings"];
const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const hasValidSession = await isValidAccessToken(accessToken);

  if (authPaths.includes(pathname) && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (hasValidSession) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
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
