import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import { serializePlan, upsertUserPlan } from "@/lib/server/users";
import { isObject, parsePlanInput } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json().catch(() => null);

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const planInput = parsePlanInput(body);

  if (!planInput) {
    return fail("UNPROCESSABLE_ENTITY", "个性化计划参数校验失败", 422);
  }

  const result = await upsertUserPlan(authResult.auth.userId, planInput);

  return ok(serializePlan(result.profile, result.stats));
}
