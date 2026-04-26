import { randomUUID } from "node:crypto";

import type { MiddlewareHandler } from "hono";

import { getLogger } from "./logger.ts";

const requestLog = getLogger({ module: "http" });

function getRequestId(requestIdHeader: string | undefined): string {
  const trimmed = requestIdHeader?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : randomUUID();
}

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = getRequestId(c.req.header("x-request-id"));
  const traceId = randomUUID();
  const startedAt = performance.now();
  c.header("x-request-id", requestId);
  c.header("x-trace-id", traceId);
  c.set("requestId", requestId);
  c.set("traceId", traceId);

  try {
    await next();
  } finally {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    requestLog.info(
      {
        requestId,
        traceId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs,
      },
      "http_request",
    );
  }
};
