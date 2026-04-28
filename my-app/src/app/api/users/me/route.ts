import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  getUserWithProfile,
  serializeUser,
  upsertUserPlan,
} from "@/lib/server/users";
import { isObject, parsePlanInput } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const user = await getUserWithProfile(authResult.auth.userId);

  if (!user) {
    return fail("NOT_FOUND", "用户不存在", 404);
  }

  return ok(serializeUser(user));
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const currentUser = await getUserWithProfile(authResult.auth.userId);
  const body = await request.json().catch(() => null);

  if (!currentUser) {
    return fail("NOT_FOUND", "用户不存在", 404);
  }

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const merged = {
    heightCm: body.heightCm ?? currentUser.profile?.heightCm,
    weightKg: body.weightKg ?? currentUser.profile?.weightKg,
    age: body.age ?? currentUser.profile?.age,
    gender: body.gender ?? currentUser.profile?.gender,
    activityLevel: body.activityLevel ?? currentUser.profile?.activityLevel,
    goal: body.goal ?? body.fitnessGoal ?? currentUser.profile?.fitnessGoal,
  };
  const planInput = parsePlanInput(merged);

  if (!planInput) {
    return fail("UNPROCESSABLE_ENTITY", "参数校验失败", 422);
  }

  await upsertUserPlan(authResult.auth.userId, planInput);

  const updatedUser = await getUserWithProfile(authResult.auth.userId);

  if (!updatedUser) {
    return fail("NOT_FOUND", "用户不存在", 404);
  }

  return ok(serializeUser(updatedUser));
}
