import { ok } from "../_lib/response";

export const runtime = "nodejs";

export async function GET() {
  return ok({
    status: "ok",
    service: "VitalPulse",
    deployment: "local",
    checks: {
      app: "ready",
      database: "not_connected",
      deepseek: "not_checked",
    },
  });
}
