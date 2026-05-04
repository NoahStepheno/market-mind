import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appErrorHandler } from "./common/errors/error-handler.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { AuthVariables, requireAuth } from "./modules/auth/middleware.ts";
import { getLogger } from "./common/logging/logger.ts";
import { requestLogger } from "./common/logging/requestLogger.ts";
import { createInternalAlarmRoutes } from "./modules/alarms/internal-routes.ts";
import { startAlarmRealtimePipeline } from "./modules/alarms/pipeline.ts";
import { alarmRoutes } from "./modules/alarms/routes.ts";
import { chatRoutes } from "./modules/chat/routes.ts";
import { createInternalChatRoutes } from "./modules/chat/internal-routes.ts";

const app = new Hono<AuthVariables>();
const logger = getLogger({ module: "index" });

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.length === 0) {
        return origin;
      }
      return allowedOrigins.includes(origin) ? origin : "";
    },
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["x-request-id", "x-trace-id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use("/api/*", requestLogger);

app.onError(appErrorHandler);

app.get("/api/v1/health", (c) => {
  return c.json({
    service: "market-backend",
    status: "ok",
    now: new Date().toISOString(),
  });
});

app.route("/api/v1/auth", authRoutes);
app.get("/api/v1/me", requireAuth, (c) => c.json({ user: c.get("authUser") }));

const alarmPipeline =
  process.env.ALARM_PIPELINE_ENABLED === "false" ? null : startAlarmRealtimePipeline();
if (alarmPipeline) {
  app.route("/api/internal/v1", createInternalAlarmRoutes(alarmPipeline));
}
app.route("/api/internal/v1", createInternalChatRoutes());

app.route("/api/v1/alarms", alarmRoutes);
app.route("/api/v1/chat", chatRoutes);

app.get("/", (c) => c.text("Market backend is running"));

const port = Number(process.env.PORT ?? 3001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info({ port: info.port }, "backend_listening");
  },
);
