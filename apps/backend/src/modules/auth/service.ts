import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../common/db/client.ts";
import { accounts, refreshTokens, users } from "../../entities/schema.ts";
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

type WechatProfile = {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  wechatAccessToken?: string;
  wechatRefreshToken?: string;
};

function buildWechatPlaceholderEmail(providerAccountId: string): string {
  const normalizedAccountId = providerAccountId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const fallback = Buffer.from(providerAccountId).toString("base64url").slice(0, 96);
  const localPart = (normalizedAccountId || fallback).slice(0, 96);
  return `wx+${localPart}@internal.invalid`;
}

export async function upsertUserFromGoogle(profile: GoogleProfile) {
  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    const [user] = existingUser
      ? await tx
          .update(users)
          .set({
            name: profile.name,
            avatarUrl: profile.picture ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning()
      : await tx
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.picture ?? null,
          })
          .returning();

    const [existingAccount] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, profile.sub)))
      .limit(1);

    if (existingAccount) {
      await tx
        .update(accounts)
        .set({
          userId: user.id,
          accessToken: profile.googleAccessToken ?? null,
          refreshToken: profile.googleRefreshToken ?? null,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existingAccount.id));
    } else {
      await tx.insert(accounts).values({
        userId: user.id,
        provider: "google",
        providerAccountId: profile.sub,
        accessToken: profile.googleAccessToken ?? null,
        refreshToken: profile.googleRefreshToken ?? null,
      });
    }

    return user;
  });
}

export async function upsertUserFromWechat(profile: WechatProfile) {
  const providerAccountId = profile.unionid ?? profile.openid;
  const placeholderEmail = buildWechatPlaceholderEmail(providerAccountId);
  const displayName = profile.nickname?.trim() || "WeChat User";

  return db.transaction(async (tx) => {
    const [existingAccount] = await tx
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.provider, "wechat_mp"), eq(accounts.providerAccountId, providerAccountId)),
      )
      .limit(1);

    if (existingAccount) {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, existingAccount.userId))
        .limit(1);

      if (existingUser) {
        const [updatedUser] = await tx
          .update(users)
          .set({
            name: displayName,
            avatarUrl: profile.headimgurl ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();

        await tx
          .update(accounts)
          .set({
            accessToken: profile.wechatAccessToken ?? null,
            refreshToken: profile.wechatRefreshToken ?? null,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existingAccount.id));

        return updatedUser;
      }
    }

    const [existingUserByPlaceholderEmail] = await tx
      .select()
      .from(users)
      .where(eq(users.email, placeholderEmail))
      .limit(1);

    const [user] = existingUserByPlaceholderEmail
      ? await tx
          .update(users)
          .set({
            name: displayName,
            avatarUrl: profile.headimgurl ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUserByPlaceholderEmail.id))
          .returning()
      : await tx
          .insert(users)
          .values({
            email: placeholderEmail,
            name: displayName,
            avatarUrl: profile.headimgurl ?? null,
          })
          .returning();

    await tx.insert(accounts).values({
      userId: user.id,
      provider: "wechat_mp",
      providerAccountId,
      accessToken: profile.wechatAccessToken ?? null,
      refreshToken: profile.wechatRefreshToken ?? null,
    });

    return user;
  });
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
  return db.transaction(async (tx) => {
    const now = new Date();
    const [storedToken] = await tx
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

    const [user] = await tx.select().from(users).where(eq(users.id, storedToken.userId)).limit(1);
    if (!user) {
      return null;
    }

    const revokedRows = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.id, storedToken.id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    if (revokedRows.length === 0) {
      return null;
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + getRefreshTokenTtlSeconds() * 1000);

    await tx.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    };
  });
}

export async function revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawRefreshToken);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [token] = await tx
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!token) {
      return false;
    }

    const revokedRows = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.id, token.id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    return revokedRows.length > 0;
  });
}
