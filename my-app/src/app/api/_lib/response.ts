import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiMeta, ApiResponse } from "@/types/api";

function createMeta(): ApiMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

export function ok<TData>(data: TData, init?: ResponseInit) {
  const body: ApiResponse<TData> = {
    success: true,
    data,
    error: null,
    meta: createMeta(),
  };

  return NextResponse.json(body, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details: unknown = null,
) {
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: createMeta(),
  };

  return NextResponse.json(body, { status });
}
