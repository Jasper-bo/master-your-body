import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import { getTrainingToday, parseTrainingDate } from "@/lib/server/training";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const date = parseTrainingDate(request.nextUrl.searchParams.get("date"));

  if (!date) {
    return fail("BAD_REQUEST", "date 必须是 YYYY-MM-DD 格式", 400);
  }

  return ok(await getTrainingToday(authResult.auth.userId, date));
}
