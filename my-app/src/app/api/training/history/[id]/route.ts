import type { NextRequest } from "next/server";
import { fail, ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import {
  deleteTrainingRecord,
  TrainingRecordNotFoundError,
} from "@/lib/server/training";

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
    return ok(await deleteTrainingRecord(authResult.auth.userId, id));
  } catch (error) {
    if (error instanceof TrainingRecordNotFoundError) {
      return fail("NOT_FOUND", error.message, 404);
    }

    throw error;
  }
}
