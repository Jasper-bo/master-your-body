import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  deleteMealRecord,
  NutritionFoodNotFoundError,
  NutritionProfileMissingError,
} from "@/lib/server/nutrition";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;

  try {
    return ok(await deleteMealRecord(authResult.auth.userId, id));
  } catch (error) {
    if (error instanceof NutritionProfileMissingError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    if (error instanceof NutritionFoodNotFoundError) {
      return fail("NOT_FOUND", "餐食记录不存在", 404);
    }

    throw error;
  }
}
