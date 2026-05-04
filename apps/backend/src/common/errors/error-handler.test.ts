import { expect, test } from "vite-plus/test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { AppError } from "./app-error.ts";
import { appErrorHandler } from "./error-handler.ts";

test("AppError carries domain code and status", () => {
  const err = new AppError("Alarm not found", {
    code: "ALARM_NOT_FOUND",
    statusCode: 404,
  });
  expect(err.message).toBe("Alarm not found");
  expect(err.code).toBe("ALARM_NOT_FOUND");
  expect(err.status).toBe(404);
});

test("appErrorHandler returns { message, code } for AppError", async () => {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.get("/test", () => {
    throw new AppError("Alarm not found", {
      code: "ALARM_NOT_FOUND",
      statusCode: 404,
    });
  });
  const res = await app.request("/test");
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body).toEqual({ message: "Alarm not found", code: "ALARM_NOT_FOUND" });
});

test("appErrorHandler returns INTERNAL_ERROR for unknown errors", async () => {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.get("/test", () => {
    throw new Error("something broke");
  });
  const res = await app.request("/test");
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body).toEqual({ message: "Internal server error", code: "INTERNAL_ERROR" });
});

test("appErrorHandler returns VALIDATION_ERROR for ZodError", async () => {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.get("/test", () => {
    const schema = z.object({ name: z.string() });
    schema.parse({ name: 123 });
    return new Response("ok");
  });
  const res = await app.request("/test");
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.code).toBe("VALIDATION_ERROR");
  expect(body.message).toBe("Validation error");
  expect(body.details).toBeDefined();
});

test("appErrorHandler handles plain HTTPException with fallback code", async () => {
  const app = new Hono();
  app.onError(appErrorHandler);
  app.get("/test", () => {
    throw new HTTPException(403, { message: "Forbidden" });
  });
  const res = await app.request("/test");
  expect(res.status).toBe(403);
  const body = await res.json();
  expect(body.message).toBe("Forbidden");
  expect(body.code).toBe("HTTP_403");
});
