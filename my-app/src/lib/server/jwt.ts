import { serverEnv } from "@/lib/server/env";

export type JwtKind = "access" | "refresh";

export type VitalPulseJwtPayload = {
  sub: string;
  phone: string;
  type: JwtKind;
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: Date;
};

function base64UrlEncode(input: string | Uint8Array) {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeJson<T>(input: string) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(input))) as T;
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(content: string, secret: string) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(content),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

export async function signJwt(input: {
  userId: string;
  phone: string;
  type: JwtKind;
  expiresInSeconds: number;
  secret: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: VitalPulseJwtPayload = {
    sub: input.userId,
    phone: input.phone,
    type: input.type,
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + input.expiresInSeconds,
    iss: serverEnv.jwtIssuer,
    aud: serverEnv.jwtAudience,
  };
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const content = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;

  return `${content}.${await sign(content, input.secret)}`;
}

export async function verifyJwt(
  token: string,
  expectedType: JwtKind,
  secret: string,
) {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new Error("Malformed token");
  }

  const content = `${header}.${payload}`;
  const expectedSignature = await sign(content, secret);

  if (signature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }

  const decoded = decodeJson<VitalPulseJwtPayload>(payload);
  const now = Math.floor(Date.now() / 1000);

  if (
    decoded.type !== expectedType ||
    decoded.iss !== serverEnv.jwtIssuer ||
    decoded.aud !== serverEnv.jwtAudience ||
    decoded.exp <= now
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded;
}

export async function createTokenPair(user: { id: string; phone: string }) {
  const refreshExpiresAt = new Date(
    Date.now() + serverEnv.jwtRefreshExpirySeconds * 1000,
  );

  return {
    accessToken: await signJwt({
      userId: user.id,
      phone: user.phone,
      type: "access",
      expiresInSeconds: serverEnv.jwtAccessExpirySeconds,
      secret: serverEnv.jwtSecret,
    }),
    refreshToken: await signJwt({
      userId: user.id,
      phone: user.phone,
      type: "refresh",
      expiresInSeconds: serverEnv.jwtRefreshExpirySeconds,
      secret: serverEnv.jwtRefreshSecret,
    }),
    expiresIn: serverEnv.jwtAccessExpirySeconds,
    refreshExpiresAt,
  };
}
