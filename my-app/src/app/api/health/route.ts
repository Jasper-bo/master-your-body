import { ok } from "../_lib/response";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET() {
  let database: "ready" | "unreachable" = "ready";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }

  return ok({
    status: "ok",
    service: "VitalPulse",
    deployment: "local",
    checks: {
      app: "ready",
      database,
      deepseek: "not_checked",
    },
  });
}
