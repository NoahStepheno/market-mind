import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { Hono } from "hono";
import { z } from "zod";

import { alarmMetrics } from "./metrics.ts";
import type { AlarmPipelineHandle } from "./pipeline.ts";

const IngestBodySchema = z.object({
  symbol: z.string().min(1).max(64),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  payload: z.record(z.string(), z.unknown()),
  trace_id: z.string().max(128).optional(),
});

const requireInternalToken = createMiddleware(async (c, next) => {
  const expected = process.env.INTERNAL_ALARM_INGEST_TOKEN;
  if (!expected) {
    throw new HTTPException(503, { message: "Internal alarm ingest is not configured" });
  }
  const header =
    c.req.header("X-Internal-Token") ?? c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!header || header !== expected) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});

export function createInternalAlarmRoutes(pipeline: AlarmPipelineHandle) {
  const r = new Hono();

  r.use("*", requireInternalToken);

  r.get("/alarm-metrics", (c) => {
    return c.json({
      counters: alarmMetrics.snapshot(),
      queues: pipeline.metricsSnapshot(),
    });
  });

  r.post("/alarm-ingest", async (c) => {
    const body = IngestBodySchema.parse(await c.req.json());
    const symbol = body.symbol.trim();
    const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();
    const ok = pipeline.evalQueue.tryEnqueue({
      symbol,
      occurredAt,
      snapshot: body.payload,
      traceId: body.trace_id ?? c.req.header("x-trace-id") ?? undefined,
    });
    if (!ok) {
      alarmMetrics.recordIngestBackpressure();
      throw new HTTPException(503, { message: "Alarm ingest queue is full" });
    }
    return c.json({ ok: true }, 202);
  });

  return r;
}
