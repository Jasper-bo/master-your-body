function readRequired(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseDurationSeconds(value: string, fallbackSeconds: number) {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());

  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2] ?? "s";

  if (unit === "m") {
    return amount * 60;
  }

  if (unit === "h") {
    return amount * 60 * 60;
  }

  if (unit === "d") {
    return amount * 24 * 60 * 60;
  }

  return amount;
}

export const serverEnv = {
  databaseUrl: readRequired("DATABASE_URL"),
  jwtSecret: readRequired("JWT_SECRET"),
  jwtRefreshSecret: readRequired("JWT_REFRESH_SECRET"),
  jwtAccessExpirySeconds: parseDurationSeconds(
    process.env.JWT_ACCESS_EXPIRY ?? "24h",
    24 * 60 * 60,
  ),
  jwtRefreshExpirySeconds: parseDurationSeconds(
    process.env.JWT_REFRESH_EXPIRY ?? "7d",
    7 * 24 * 60 * 60,
  ),
  jwtIssuer: process.env.JWT_ISSUER ?? "vitalpulse",
  jwtAudience: process.env.JWT_AUDIENCE ?? "vitalpulse-client",
  bcryptRounds: readInt("BCRYPT_ROUNDS", 12),
  loginMaxFailures: readInt("LOGIN_MAX_FAILURES", 5),
  loginLockoutMinutes: readInt("LOGIN_LOCKOUT_MINUTES", 15),
  passwordMinLength: readInt("PASSWORD_MIN_LENGTH", 6),
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === "true",
};
