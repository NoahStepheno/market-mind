import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

const textEncoder = new TextEncoder();

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getJwtSecret(): Uint8Array {
  return textEncoder.encode(requireEnv("JWT_SECRET"));
}

export function getAccessTokenTtlSeconds(): number {
  return Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
}

export function getRefreshTokenTtlSeconds(): number {
  return Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 1_209_600);
}

export async function signAccessToken(payload: AuthTokenPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const issuer = requireEnv("JWT_ISSUER");
  const audience = requireEnv("JWT_AUDIENCE");

  return new SignJWT({
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + getAccessTokenTtlSeconds())
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  const issuer = requireEnv("JWT_ISSUER");
  const audience = requireEnv("JWT_AUDIENCE");

  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer,
    audience,
  });

  const sub = payload.sub;
  if (typeof sub !== "string") {
    throw new Error("Invalid sub claim");
  }
  const email = payload.email;
  const name = payload.name;
  const avatarUrl = payload.avatarUrl;
  if (typeof email !== "string" || typeof name !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    sub,
    email,
    name,
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
  };
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function signOAuthState(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ nonce: randomBytes(12).toString("hex") })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("chima-google-oauth-state")
    .setAudience("chima-backend")
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(getJwtSecret());
}

export async function verifyOAuthState(state: string): Promise<void> {
  await jwtVerify(state, getJwtSecret(), {
    issuer: "chima-google-oauth-state",
    audience: "chima-backend",
  });
}
