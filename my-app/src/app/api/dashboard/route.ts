import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  DashboardProfileMissingError,
  getDashboardData,
  parseDashboardDate,
} from "@/lib/server/dashboard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const date = parseDashboardDate(request.nextUrl.searchParams.get("date"));

  if (!date) {
    return fail("BAD_REQUEST", "date 必须是 YYYY-MM-DD 格式", 400);
  }

  try {
    return ok(await getDashboardData(authResult.auth.userId, date));
  } catch (error) {
    if (error instanceof DashboardProfileMissingError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
