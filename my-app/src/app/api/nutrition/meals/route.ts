import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  NutritionFoodNotFoundError,
  NutritionProfileMissingError,
  NutritionValidationError,
  parseCreateMealRequest,
  recordMeal,
} from "@/lib/server/nutrition";
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

  const mealInput = parseCreateMealRequest(body);

  if (!mealInput) {
    return fail("UNPROCESSABLE_ENTITY", "餐食记录参数校验失败", 422);
  }

  try {
    return ok(await recordMeal(authResult.auth.userId, mealInput), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof NutritionProfileMissingError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    if (error instanceof NutritionFoodNotFoundError) {
      return fail("NOT_FOUND", error.message, 404);
    }

    if (error instanceof NutritionValidationError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
