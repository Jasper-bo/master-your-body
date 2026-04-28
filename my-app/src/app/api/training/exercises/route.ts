import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import { getExerciseLibrary, TrainingValidationError } from "@/lib/server/training";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 50);

  try {
    return ok(
      await getExerciseLibrary({
        category: searchParams.get("category"),
        search: searchParams.get("search"),
        page: Number.isFinite(page) ? page : 1,
        limit: Number.isFinite(limit) ? limit : 50,
      }),
    );
  } catch (error) {
    if (error instanceof TrainingValidationError) {
      return fail("UNPROCESSABLE_ENTITY", error.message, 422);
    }

    throw error;
  }
}
