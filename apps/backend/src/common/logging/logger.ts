import { mkdirSync } from "node:fs";
import path from "node:path";

import pino from "pino";
import { createStream } from "rotating-file-stream";

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const raw = trimOrUndefined(value);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("LOG_MAX_FILES must be a positive integer.");
  }
  return parsed;
}

const logLevel = trimOrUndefined(process.env.LOG_LEVEL) ?? "info";
const logDir = trimOrUndefined(process.env.LOG_DIR) ?? path.resolve(process.cwd(), "logs");
const logMaxFiles = parsePositiveInteger(process.env.LOG_MAX_FILES, 7);
const logMaxSize = trimOrUndefined(process.env.LOG_MAX_SIZE) ?? "10M";

mkdirSync(logDir, { recursive: true });

const rotatingFileStream = createStream("backend-%DATE%.log", {
  path: logDir,
  interval: "1d",
  maxFiles: logMaxFiles,
  size: logMaxSize,
  compress: "gzip",
});

const streams: pino.StreamEntry[] = [{ stream: rotatingFileStream }];

if (process.env.NODE_ENV !== "production") {
  streams.push({ stream: process.stdout });
}

export const logger = pino(
  {
    level: logLevel,
    base: { service: "market-backend" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams),
);

export function getLogger(bindings: pino.Bindings): pino.Logger {
  return logger.child(bindings);
}
