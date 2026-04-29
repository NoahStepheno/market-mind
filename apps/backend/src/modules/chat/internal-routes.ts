import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { chatMetrics } from "./metrics.ts";

export function createInternalChatRoutes() {
  const r = new Hono();

  r.get("/chat-metrics", (c) => {
    const expected = process.env.INTERNAL_CHAT_METRICS_TOKEN;
    const token =
      c.req.header("X-Internal-Token") ?? c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || token !== expected) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    return c.json({ counters: chatMetrics.snapshot() });
  });

  return r;
}
