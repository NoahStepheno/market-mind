import { randomBytes } from "node:crypto";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { AuthVariables } from "./middleware.ts";
import {
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  upsertUserFromGoogle,
} from "./service.ts";
import { getGoogleCallbackUrl } from "./config.ts";
import { signOAuthState, verifyOAuthState } from "./token.ts";

const GoogleIdTokenSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().optional(),
});

const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const ExchangeCodeBodySchema = z.object({
  code: z.string().min(1),
});

const GoogleTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  id_token: z.string(),
});

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const oauthLoginCodeStore = new Map<string, { payload: AuthExchangePayload; expiresAt: number }>();
const OAUTH_LOGIN_CODE_TTL_MS = 60_000;

type AuthExchangePayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getFrontendAuthCallbackUrl(): string {
  return process.env.FRONTEND_AUTH_CALLBACK_URL ?? "http://localhost:5173/auth/callback";
}

function cleanupExpiredOauthCodes(now = Date.now()) {
  for (const [code, entry] of oauthLoginCodeStore.entries()) {
    if (entry.expiresAt <= now) {
      oauthLoginCodeStore.delete(code);
    }
  }
}

function createOauthExchangeCode(payload: AuthExchangePayload): string {
  const now = Date.now();
  cleanupExpiredOauthCodes(now);
  const code = randomBytes(24).toString("base64url");
  oauthLoginCodeStore.set(code, { payload, expiresAt: now + OAUTH_LOGIN_CODE_TTL_MS });
  return code;
}

function consumeOauthExchangeCode(code: string): AuthExchangePayload | null {
  const entry = oauthLoginCodeStore.get(code);
  if (!entry) {
    return null;
  }
  oauthLoginCodeStore.delete(code);
  if (entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.payload;
}

function getGoogleAuthUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", getGoogleCallbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeGoogleCode(code: string) {
  const tokenEndpoint = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: getGoogleCallbackUrl(),
    grant_type: "authorization_code",
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new HTTPException(401, { message: "Google OAuth exchange failed" });
  }

  return GoogleTokenResponseSchema.parse(await response.json());
}

async function verifyGoogleIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: requireEnv("GOOGLE_CLIENT_ID"),
  });
  return GoogleIdTokenSchema.parse(payload);
}

export const authRoutes = new Hono<AuthVariables>();

authRoutes.get("/google/start", async (c) => {
  const state = await signOAuthState();
  return c.redirect(getGoogleAuthUrl(state));
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    throw new HTTPException(400, { message: "Missing oauth callback params" });
  }

  await verifyOAuthState(state);
  const tokenResponse = await exchangeGoogleCode(code);
  const idProfile = await verifyGoogleIdToken(tokenResponse.id_token);
  const user = await upsertUserFromGoogle({
    sub: idProfile.sub,
    email: idProfile.email,
    name: idProfile.name,
    picture: idProfile.picture,
    googleAccessToken: tokenResponse.access_token,
    googleRefreshToken: tokenResponse.refresh_token,
  });

  const tokenPair = await issueTokenPair(user);
  const payload: AuthExchangePayload = {
    ...tokenPair,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };

  const exchangeCode = createOauthExchangeCode(payload);
  const redirectUrl = new URL(getFrontendAuthCallbackUrl());
  redirectUrl.searchParams.set("code", exchangeCode);
  return c.redirect(redirectUrl.toString());
});

authRoutes.post("/google/exchange-code", async (c) => {
  const body = ExchangeCodeBodySchema.parse(await c.req.json());
  const payload = consumeOauthExchangeCode(body.code);
  if (!payload) {
    throw new HTTPException(401, { message: "Invalid or expired exchange code" });
  }
  return c.json(payload);
});

authRoutes.post("/refresh", async (c) => {
  const body = RefreshBodySchema.parse(await c.req.json());
  const tokenPair = await rotateRefreshToken(body.refreshToken);

  if (!tokenPair) {
    throw new HTTPException(401, { message: "Invalid refresh token" });
  }

  return c.json(tokenPair);
});

authRoutes.post("/logout", async (c) => {
  const body = RefreshBodySchema.parse(await c.req.json());
  const revoked = await revokeRefreshToken(body.refreshToken);
  return c.json({ success: revoked });
});
