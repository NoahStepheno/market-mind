import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { verifyAccessToken } from "./token.ts";

export type AuthContextUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type AuthVariables = {
  Variables: {
    requestId: string;
    traceId: string;
    authUser: AuthContextUser;
  };
};

export const requireAuth = createMiddleware<AuthVariables>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  try {
    const payload = await verifyAccessToken(token);
    c.set("authUser", {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
    });
    await next();
  } catch {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
});
