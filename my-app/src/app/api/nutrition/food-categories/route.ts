import type { NextRequest } from "next/server";
import { ok } from "@/app/api/_lib/response";
import { requireAuth } from "@/lib/server/auth";
import { getFoodCategories } from "@/lib/server/nutrition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  return ok(await getFoodCategories());
}
