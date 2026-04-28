import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  parseQuickLogRequest,
  quickLogTraining,
  TrainingExerciseNotFoundError,
  TrainingValidationError,
} from "@/lib/server/training";
import { isObject } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json().catch(() => null);

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const input = parseQuickLogRequest(body);

  if (!input) {
    return fail("UNPROCESSABLE_ENTITY", "训练记录参数校验失败", 422);
  }

  try {
    return ok(await quickLogTraining(authResult.auth.userId, input), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof TrainingExerciseNotFoundError) {
      return fail("NOT_FOUND", error.message, 404);
    }

    if (error instanceof TrainingValidationError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
