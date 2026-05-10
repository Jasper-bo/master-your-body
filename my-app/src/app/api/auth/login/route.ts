import bcrypt from "bcryptjs";
import { fail, ok } from "@/app/api/_lib/response";
import { setAuthCookies } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { createTokenPair } from "@/lib/server/jwt";
import { prisma } from "@/lib/server/prisma";
import { persistRefreshToken } from "@/lib/server/token-store";
import { serializeUser } from "@/lib/server/users";
import {
  isObject,
  parsePassword,
  parsePhone,
} from "@/lib/server/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isObject(body)) {
    return fail("BAD_REQUEST", "请求体必须是 JSON 对象", 400);
  }

  const phone = parsePhone(body.phone);
  const password = parsePassword(body.password);

  if (!phone || !password) {
    return fail("UNPROCESSABLE_ENTITY", "登录参数校验失败", 422);
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profile: true },
  });

  if (!user || !user.isActive) {
    return fail("UNAUTHORIZED", "账号不存在或不可用", 401);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return fail("TOO_MANY_REQUESTS", "账号已临时锁定，请稍后再试", 429);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const nextFailures = user.loginFailures + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailures: nextFailures,
        lockedUntil:
          nextFailures >= serverEnv.loginMaxFailures
            ? new Date(Date.now() + serverEnv.loginLockoutMinutes * 60 * 1000)
            : null,
      },
    });

    return fail("UNAUTHORIZED", "手机号或密码错误", 401);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      loginFailures: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
    include: { profile: true },
  });
  const tokens = await createTokenPair(updatedUser);

  await persistRefreshToken(updatedUser.id, tokens);

  const response = ok({
    user: serializeUser(updatedUser),
  });

  return setAuthCookies(response, tokens);
}
