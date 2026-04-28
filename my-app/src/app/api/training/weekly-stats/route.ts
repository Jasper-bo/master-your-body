import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  getTrainingWeeklyStats,
  parseTrainingDate,
} from "@/lib/server/training";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const weekStartParam = request.nextUrl.searchParams.get("weekStart");
  const weekStart = weekStartParam ? parseTrainingDate(weekStartParam) : undefined;

  if (weekStartParam && !weekStart) {
    return fail("BAD_REQUEST", "weekStart 必须是 YYYY-MM-DD 格式", 400);
  }

  return ok(await getTrainingWeeklyStats(authResult.auth.userId, weekStart ?? undefined));
}
