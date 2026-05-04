# Deferred Work

## Deferred from: code review of 1-0-project-scaffold-shared-infrastructure (2026-05-04)

- Non-integer port coerced to NaN — `Number(process.env.PORT)` produces NaN for non-numeric strings. Pre-existing in `apps/backend/src/index.ts:67`. Same issue in `apps/datasource/src/index.ts:5`.
- Logger side effects at import time — `getLogger()` triggers `mkdirSync` at module load. Pre-existing in `apps/backend/src/common/logging/logger.ts:28`. Can cause test environment crashes.
- c.req.json() invalid JSON returns 500 — Malformed JSON body causes SyntaxError that falls through to generic 500 handler instead of 400. Pre-existing across route handlers.
- Stream endpoint messageId exposure — `messageId` in query params may appear in logs/proxies. Pre-existing in `apps/backend/src/modules/chat/routes.ts:97-106`.
- AppError code field is bare string — No compile-time enforcement that error codes match the defined constants. Design tradeoff, not a bug.
