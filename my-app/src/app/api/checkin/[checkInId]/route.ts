import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  CheckInProfileMissingError,
  CheckInValidationError,
  parseManualCheckInRequest,
  recordManualCheckIn,
} from "@/lib/server/checkin";
import { isObject } from "@/lib/server/validators";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ checkInId: string }> },
) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const body = await request.json().catch(() => null);

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const { checkInId } = await context.params;
  const input = parseManualCheckInRequest(checkInId, body);

  if (!input) {
    return fail("UNPROCESSABLE_ENTITY", "健康打卡参数校验失败", 422);
  }

  try {
    return ok(await recordManualCheckIn(authResult.auth.userId, input));
  } catch (error) {
    if (error instanceof CheckInProfileMissingError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    if (error instanceof CheckInValidationError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
