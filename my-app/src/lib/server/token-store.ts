import { createHash } from "node:crypto";
import type { TokenPair } from "@/lib/server/jwt";
import { prisma } from "@/lib/server/prisma";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function persistRefreshToken(userId: string, tokens: TokenPair) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
    },
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revoked: false,
    },
    data: {
      revoked: true,
    },
  });
}
