import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  getTrainingHistory,
  parseTrainingHistoryQuery,
} from "@/lib/server/training";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const query = parseTrainingHistoryQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!query) {
    return fail("BAD_REQUEST", "历史查询参数不合法", 400);
  }

  return ok(await getTrainingHistory(authResult.auth.userId, query));
}
