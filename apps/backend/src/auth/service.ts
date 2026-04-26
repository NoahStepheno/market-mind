import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../db/client.ts";
import { accounts, refreshTokens, users } from "../db/schema.ts";
import {
  generateRefreshToken,
  getRefreshTokenTtlSeconds,
  hashToken,
  signAccessToken,
} from "./token.ts";

type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
};

export async function upsertUserFromGoogle(profile: GoogleProfile) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1);

  const [user] = existingUser
    ? await db
        .update(users)
        .set({
          name: profile.name,
          avatarUrl: profile.picture ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning()
    : await db
        .insert(users)
        .values({
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture ?? null,
        })
        .returning();

  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, profile.sub)))
    .limit(1);

  if (existingAccount) {
    await db
      .update(accounts)
      .set({
        userId: user.id,
        accessToken: profile.googleAccessToken ?? null,
        refreshToken: profile.googleRefreshToken ?? null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, existingAccount.id));
  } else {
    await db.insert(accounts).values({
      userId: user.id,
      provider: "google",
      providerAccountId: profile.sub,
      accessToken: profile.googleAccessToken ?? null,
      refreshToken: profile.googleRefreshToken ?? null,
    });
  }

  return user;
}

export async function issueTokenPair(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  };
}

export async function rotateRefreshToken(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  const now = new Date();
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!storedToken) {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, storedToken.userId)).limit(1);

  if (!user) {
    return null;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(eq(refreshTokens.id, storedToken.id));
  return issueTokenPair(user);
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawRefreshToken);
  const now = new Date();
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .limit(1);

  if (!token) {
    return false;
  }

  await db.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, token.id));
  return true;
}
