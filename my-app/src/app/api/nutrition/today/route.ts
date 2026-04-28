import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  getNutritionToday,
  NutritionProfileMissingError,
  parseNutritionDate,
} from "@/lib/server/nutrition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const date = parseNutritionDate(request.nextUrl.searchParams.get("date"));

  if (!date) {
    return fail("BAD_REQUEST", "date 必须是 YYYY-MM-DD 格式", 400);
  }

  try {
    return ok(await getNutritionToday(authResult.auth.userId, date));
  } catch (error) {
    if (error instanceof NutritionProfileMissingError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
