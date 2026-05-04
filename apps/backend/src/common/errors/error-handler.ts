import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { getLogger } from "../logging/logger.ts";
import { AppError } from "./app-error.ts";
import { INTERNAL_ERROR, VALIDATION_ERROR } from "./error-codes.ts";

const logger = getLogger({ module: "error-handler" });

interface ErrorBody {
  message: string;
  code: string;
  details?: unknown[];
}

export function appErrorHandler(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    const body: ErrorBody = { message: err.message, code: err.code };
    return c.json(body, err.status);
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      message: "Validation error",
      code: VALIDATION_ERROR,
      details: err.issues,
    };
    return c.json(body, 400);
  }

  if (err instanceof HTTPException) {
    const body: ErrorBody = {
      message: err.message,
      code: `HTTP_${err.status}`,
    };
    return c.json(body, err.status);
  }

  logger.error({ err, path: c.req.path, method: c.req.method }, "unhandled_error");
  const body: ErrorBody = {
    message: "Internal server error",
    code: INTERNAL_ERROR,
  };
  return c.json(body, 500);
}
