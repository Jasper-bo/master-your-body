import bcrypt from "bcryptjs";
import { fail, ok } from "@/app/api/_lib/response";
import { setAuthCookies } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { createTokenPair } from "@/lib/server/jwt";
import { prisma } from "@/lib/server/prisma";
import { persistRefreshToken } from "@/lib/server/token-store";
import { serializeUser, upsertUserPlan } from "@/lib/server/users";
import {
  hasAnyPlanField,
  isObject,
  parsePassword,
  parsePhone,
  parsePlanInput,
} from "@/lib/server/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const phone = parsePhone(body.phone);
  const password = parsePassword(body.password);
  const planInput = hasAnyPlanField(body) ? parsePlanInput(body) : null;

  if (!phone || !password) {
    return fail("UNPROCESSABLE_ENTITY", "注册参数校验失败", 422);
  }

  if (hasAnyPlanField(body) && !planInput) {
    return fail("UNPROCESSABLE_ENTITY", "个性化计划参数校验失败", 422);
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });

  if (existingUser) {
    return fail("CONFLICT", "手机号已被注册", 409);
  }

  const passwordHash = await bcrypt.hash(password, serverEnv.bcryptRounds);
  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        phone,
        passwordHash,
      },
      include: { profile: true },
    });

    if (planInput) {
      await upsertUserPlan(user.id, planInput, tx);
    }

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true },
    });
  });
  const tokens = await createTokenPair(createdUser);

  await persistRefreshToken(createdUser.id, tokens);

  const response = ok(
    {
      user: serializeUser(createdUser),
    },
    { status: 201 },
  );

  return setAuthCookies(response, tokens);
}
