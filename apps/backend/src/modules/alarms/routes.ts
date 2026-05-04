import { Hono } from "hono";
import { z } from "zod";

import { AppError } from "../../common/errors/app-error.ts";
import { AuthVariables, requireAuth } from "../auth/middleware.ts";
import { conditionGroupSchema } from "./condition-group.ts";
import { alarmErrorCodes } from "./errors.ts";
import {
  addAlarmFeedback,
  createAlarm,
  getAlarmForUser,
  listAlarmsForUser,
  softDeleteAlarm,
  updateAlarmForUser,
} from "./service.ts";

const CreateBodySchema = z.object({
  symbol: z.string().min(1).max(64),
  conditionGroup: conditionGroupSchema,
  cooldown: z
    .number()
    .int()
    .min(0)
    .max(86400 * 365)
    .optional(),
  enabled: z.boolean().optional(),
  notifyLabel: z.string().max(64).nullable().optional(),
  notifyTier: z.enum(["standard", "emphasis"]).optional(),
});

const PatchBodySchema = z
  .object({
    symbol: z.string().min(1).max(64).optional(),
    conditionGroup: conditionGroupSchema.optional(),
    cooldown: z
      .number()
      .int()
      .min(0)
      .max(86400 * 365)
      .optional(),
    enabled: z.boolean().optional(),
    notifyLabel: z.string().max(64).nullable().optional(),
    notifyTier: z.enum(["standard", "emphasis"]).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "empty patch" });

const FeedbackBodySchema = z.object({
  rating: z.enum(["helpful", "not_helpful"]),
});

export const alarmRoutes = new Hono<AuthVariables>();

alarmRoutes.use("*", requireAuth);

alarmRoutes.get("/", async (c) => {
  const userId = c.get("authUser").id;
  const rows = await listAlarmsForUser(userId);
  return c.json({ alarms: rows });
});

alarmRoutes.post("/", async (c) => {
  const userId = c.get("authUser").id;
  const body = CreateBodySchema.parse(await c.req.json());
  const row = await createAlarm({
    userId,
    symbol: body.symbol,
    conditionGroup: body.conditionGroup,
    cooldownSeconds: body.cooldown ?? 900,
    enabled: body.enabled,
    notifyLabel: body.notifyLabel,
    notifyTier: body.notifyTier,
  });
  return c.json({ alarm: row }, 201);
});

alarmRoutes.get("/:id", async (c) => {
  const userId = c.get("authUser").id;
  const id = c.req.param("id");
  const row = await getAlarmForUser(userId, id);
  if (!row) {
    throw new AppError("Alarm not found", { code: alarmErrorCodes.NOT_FOUND, statusCode: 404 });
  }
  return c.json({ alarm: row });
});

alarmRoutes.patch("/:id", async (c) => {
  const userId = c.get("authUser").id;
  const id = c.req.param("id");
  const body = PatchBodySchema.parse(await c.req.json());
  const row = await updateAlarmForUser(userId, id, {
    symbol: body.symbol,
    conditionGroup: body.conditionGroup,
    cooldownSeconds: body.cooldown,
    enabled: body.enabled,
    notifyLabel: body.notifyLabel,
    notifyTier: body.notifyTier,
  });
  if (!row) {
    throw new AppError("Alarm not found", { code: alarmErrorCodes.NOT_FOUND, statusCode: 404 });
  }
  return c.json({ alarm: row });
});

alarmRoutes.delete("/:id", async (c) => {
  const userId = c.get("authUser").id;
  const id = c.req.param("id");
  const row = await softDeleteAlarm(userId, id);
  if (!row) {
    return c.body(null, 204);
  }
  return c.body(null, 204);
});

alarmRoutes.post("/:id/feedback", async (c) => {
  const userId = c.get("authUser").id;
  const id = c.req.param("id");
  const body = FeedbackBodySchema.parse(await c.req.json());
  const row = await addAlarmFeedback({ userId, alarmId: id, rating: body.rating });
  if (!row) {
    throw new AppError("Alarm not found", {
      code: alarmErrorCodes.FEEDBACK_NOT_FOUND,
      statusCode: 404,
    });
  }
  return c.json({ feedback: row }, 201);
});
