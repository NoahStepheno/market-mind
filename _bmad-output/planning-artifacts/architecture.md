---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: "complete"
completedAt: "2026-05-04"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/prds/market-prd.md
  - docs/designs/market-domain-model.md
  - docs/designs/market-alarm-domain.md
  - docs/designs/market-identity-access-domain.md
  - docs/designs/market-message-domain.md
  - docs/designs/market-frontend-design.md
workflowType: "architecture"
project_name: "market"
user_name: "Stepheno"
date: "2026-05-04"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (32 FRs):**

| Category                  | FRs     | Architectural Impact                                                                                                  |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Authentication & Identity | FR1–3   | Better-Auth + Google OAuth; server-side `user_id` injection on all write paths                                        |
| Chat & AI Interaction     | FR4–11  | SSE streaming; Block-based message model (TextBlock, UIBlock); NL→structured parsing; streaming within 2s first-token |
| Alarm CRUD                | FR12–18 | REST resource lifecycle; soft delete via `deleted_at`; user-scoped data isolation                                     |
| Condition Logic           | FR19    | Flat AND/OR groups with 8 fixed metrics; no nesting — constrains rule engine complexity                               |
| Templates                 | FR20–21 | Server-side preset insertion; one-tap activation flow                                                                 |
| Rule Engine               | FR22–26 | Edge-triggered state detection (`last_match_state` false→true); per-alarm cooldown; tick-level evaluation             |
| Notification              | FR27–30 | Web Push (Service Worker + FCM/APNs); structured notification templates; tiered delivery (standard/emphasis)          |
| Feedback                  | FR31–32 | Post-notification rating; stored per alarm+user for future quality analysis                                           |

**Non-Functional Requirements (18 NFRs):**

| Category               | Key Constraints                                                                                       | Architectural Driver                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Performance (NFR1–7)   | Event-to-notification <2s p99; AI first-token <2s; tick eval <500ms; bundle <300KB gzip               | Pipeline architecture with decoupled stages; streaming-first; lean frontend                 |
| Reliability (NFR8–11)  | 99.9% uptime during trading hours; zero duplicate triggers; 99% delivery rate; SSE auto-reconnect <5s | Idempotent trigger detection; queue-based notification delivery; client resilience          |
| Security (NFR12–15)    | Server-side identity enforcement; user data isolation; no market data exposure; AI output containment | Auth middleware on all routes; row-level security; no external data APIs; confirmation gate |
| Integration (NFR16–18) | Broker data feed; stateless AI model interface; browser push service                                  | Pluggable data source; model-agnostic parsing; push subscription management                 |

**Scale & Complexity:**

- Primary domain: Full-stack web application (SPA + API + real-time data pipeline)
- Complexity level: Medium-High
- V1 user scale: Solo founder + <10 invited beta users
- Deployment model: Single-server viable for V1; no distributed infrastructure required

### Technical Constraints & Dependencies

1. **Market data containment** — Broker-provided feeds; no redistribution or external API exposure. Data pipeline is internal-only.
2. **Better-Auth as identity foundation** — User management, sessions, and OAuth handled by Better-Auth; no parallel auth system.
3. **assistant-ui for chat** — Chat container, composer, and message rendering built on `assistant-ui`; custom UIBlock registry for Market-specific blocks.
4. **Fixed metric set (V1)** — 8 metrics only: price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m. Extensible in Phase 2 but V1 architecture must not hardcode assumptions.
5. **Flat condition groups only** — No nested AND/OR trees. Rule engine evaluation can remain simple recursive traversal.
6. **Solo developer** — Architecture must favor simplicity and maintainability over scalability patterns. Monolith-first; no premature microservice decomposition.
7. **Brownfield context** — Existing domain model designs, data contracts, and frontend architecture already established. Architecture must align with, not replace, these foundations.

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — All domains consume `user_id` from server-side auth context. No client-supplied identity. Cross-domain data access filtered by ownership.
2. **User Data Isolation** — Every query and write operation scoped to authenticated user. Row-level filtering is a universal pattern across chat_sessions, messages, alarms, notifications, and feedback.
3. **Real-Time Data Flow** — Two independent channels (SSE for chat, Web Push for alarms) with different reliability guarantees and lifecycle management.
4. **Error Recovery & Resilience** — SSE auto-reconnect, notification delivery retry, graceful degradation for unsupported metrics, inline error recovery for API failures.
5. **Observability** — Health dashboard for trading-hour monitoring, data pipeline latency, rule engine metrics, notification queue depth. Critical for founder's operational confidence.
6. **AI Output Governance** — Parsed drafts never persist to alarm domain without user confirmation. Confirmation gate is a cross-domain invariant spanning chat UI and alarm API.

## Starter Template & Technology Stack

### Technology Domain

Full-stack web application (SPA + API backend + real-time data pipeline) — monorepo architecture.

### Existing Technology Decisions (Brownfield)

The project codebase already establishes a complete, opinionated technology stack. No starter template evaluation is required; this section documents the locked-in decisions and their architectural implications.

**Monorepo & Tooling:**

- **Vite+** (`vp`) — Unified toolchain wrapping Vite, Rolldown, Vitest, Oxlint, Oxfmt. Manages dev server, build, test, lint, format, and package operations through a single CLI.
- **Bun** — Package manager and runtime (`bun@1.3.13`). Workspace-based monorepo with `apps/*`, `packages/*`, `tools/*`.
- **TypeScript** — Strict typing across all workspaces.

**Frontend (`apps/frontend`):**

| Decision      | Choice                             | Architectural Role                                                      |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Framework     | React (latest)                     | SPA with component-based architecture                                   |
| Routing       | react-router-dom v7                | Client-side routing: `/chat`, `/alarms`, `/alarms/:id`, `/settings`     |
| UI Components | shadcn/ui + Radix UI               | Owned primitives with full source control; accessible by default        |
| Styling       | TailwindCSS 3.4 + DESIGN.md tokens | Utility-first with semantic token layer (`bg-canvas`, `text-ink`, etc.) |
| State         | zustand                            | App-level stores: session-store, chat-store, alarms-store               |
| Chat          | assistant-ui (planned)             | Chat container, composer, message timeline, streaming rendering         |
| Build         | Vite (via Vite+)                   | SWC plugin for React; Hot Module Replacement                            |

**Backend (`apps/backend`):**

| Decision   | Choice                      | Architectural Role                                              |
| ---------- | --------------------------- | --------------------------------------------------------------- |
| Framework  | Hono                        | Lightweight HTTP framework; middleware-based auth injection     |
| Runtime    | Node.js (tsx watch for dev) | Development hot-reload; production build via `tsc`              |
| ORM        | Drizzle ORM                 | Type-safe SQL query builder; schema-driven migrations           |
| Database   | PostgreSQL                  | JSONB for condition_group/blocks; enum types for status/tiers   |
| Auth       | Better-Auth                 | User management, sessions, Google OAuth; auth context injection |
| Validation | Zod v4                      | Request body validation; type inference for API contracts       |
| Logging    | Pino                        | Structured JSON logging with rotating file stream               |
| Server     | @hono/node-server           | HTTP server adapter for Hono                                    |

**Shared & Infrastructure:**

| Decision         | Choice                          | Architectural Role                                  |
| ---------------- | ------------------------------- | --------------------------------------------------- |
| Monorepo utils   | `packages/utils`                | Shared type definitions and utilities               |
| Datasource       | `apps/datasource` (in progress) | Market data feed abstraction; broker data ingestion |
| Database tooling | drizzle-kit                     | Schema migrations (`generate`, `migrate`)           |

### Architectural Implications of Locked Stack

1. **Hono + Better-Auth middleware** — All `/alarms*`, `/chat*` routes pass through a shared auth middleware that resolves `user_id` from session. No per-route manual auth checks.
2. **Drizzle + PostgreSQL JSONB** — `condition_group` and `blocks` stored as JSONB with Zod validation at API boundary. Schema flexibility without migration overhead for nested structures.
3. **zustand stores** — Three primary stores (session, chat, alarms) with clear ownership boundaries matching backend domains. SSE events flow through `chat-store.applyStreamEvent()`.
4. **Vite+ constraint** — All tooling operations go through `vp`. No direct pnpm/npm/vitest usage. Imports from `vite-plus` instead of `vite` or `vitest` directly.
5. **No SSR/SSG** — Behind-login SPA. No SEO requirements. Client-side rendering only.
6. **Monorepo boundaries** — Frontend and backend are separate apps in the workspace. No shared runtime code except `packages/utils`. API contracts defined by Zod schemas.

### Not Yet Integrated (V1 Required)

- **assistant-ui** — Referenced in UX spec and frontend design but not yet in dependencies. Required for chat container and streaming message rendering.
- **Web Push / Service Worker** — Required for alarm notifications (FR27–30). Not yet in frontend build.
- **SSE streaming** — Backend chat endpoint needs SSE event protocol. Hono supports streaming natively.
- **AI model integration** — Stateless API call for NL→structured parsing (NFR17). Model-agnostic interface not yet implemented.

## Core Architectural Decisions

### Decision Priority Analysis

**Already Decided (Brownfield Lock-in):**

- Database: PostgreSQL + Drizzle ORM + drizzle-kit migrations
- Auth: Better-Auth + Google OAuth
- API: Hono + REST
- Frontend: React + shadcn/ui + TailwindCSS + zustand + react-router-dom v7
- Toolchain: Vite+ (`vp`) + Bun workspaces
- Validation: Zod v4
- Logging: Pino

**Critical Decisions Made (Block Implementation):**

1. Rule engine process model — In-process with modular boundaries
2. Message queue — BullMQ + Redis
3. AI model integration — Abstract parser interface + GLM-5 as V1 provider
4. SSE streaming — assistant-ui ChatModelAdapter
5. Web Push — Standard protocol + DB-backed subscriptions

**Deferred Decisions (Post-V1):**

- Distributed tracing (no multi-service tracing needed for single-server)
- API rate limiting (<10 users, not required)
- CDN / static asset optimization (SPA bundle <300KB, acceptable)
- Automated CI/CD pipeline (manual deploy acceptable for V1)

### Data Architecture

| Decision   | Choice                         | Rationale                                                                              |
| ---------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Database   | PostgreSQL                     | JSONB for condition_group/blocks; enum types; mature ecosystem                         |
| ORM        | Drizzle ORM                    | Type-safe SQL builder; schema-driven migrations; lightweight                           |
| Validation | Zod v4                         | API boundary validation; type inference; shared with frontend via packages/utils       |
| Caching    | Redis (shared with BullMQ)     | Tick data cache; session cache; rule engine hot path; single Redis instance serves all |
| Migrations | drizzle-kit generate + migrate | Schema-as-code; reproducible environments                                              |

### Authentication & Security

| Decision       | Choice                                   | Rationale                                                                   |
| -------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Auth framework | Better-Auth                              | User management, sessions, Google OAuth; single source of truth for user_id |
| Authorization  | Thin: authenticated user owns their data | No RBAC needed; server-side user_id injection on all writes (NFR12)         |
| Data isolation | Row-level filtering by user_id           | Universal pattern across all tables; enforced in service layer              |
| API security   | Hono auth middleware                     | All /alarms*, /chat*, /push\* routes protected; 401/404 for unauthorized    |
| Web Push auth  | VAPID keys (web-push library)            | Standard Web Push authentication; no third-party push service dependency    |

### API & Communication Patterns

| Decision           | Choice                                                               | Rationale                                                                                                                     |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| API style          | REST (Hono)                                                          | Resource-oriented; matches alarm CRUD and chat session lifecycle                                                              |
| Streaming          | SSE (text/event-stream)                                              | Chat streaming via Hono native streaming; event protocol: message_start, block_start, block_delta, block_end, message_end     |
| Message queue      | BullMQ (Redis-backed)                                                | Persistent, retry-capable, deduplication; trigger→notification decoupling; future worker extraction requires no queue changes |
| Error responses    | Structured JSON `{ error: string, code: string, details?: unknown }` | Consistent error shape; Zod validation errors map to 422 with field details                                                   |
| AI model interface | `AlarmParser` abstract interface + GLM-5 implementation              | `(userInput, context) → ParsedDraft`; model swappable without architectural changes (NFR17)                                   |

### Frontend Architecture

| Decision          | Choice                                                                           | Rationale                                                                                                |
| ----------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| State management  | zustand (3 stores: session, chat, alarms)                                        | Minimal boilerplate; clear domain boundaries matching backend                                            |
| Chat rendering    | assistant-ui ChatModelAdapter                                                    | Maps backend SSE events to assistant-ui StreamPart format; UIBlock via custom message component registry |
| Custom components | alarm_preview, alarm_editor, template_card, alarm_list_row, unsupported_response | Built on shadcn primitives; registered in assistant-ui component registry                                |
| SSE client        | assistant-ui built-in streaming + custom adapter                                 | SSE events from backend → adapter transforms → assistant-ui renders                                      |
| Web Push          | Service Worker + web-push (standard protocol)                                    | Auto-register on login; subscription stored in DB; refresh on focus                                      |

### Infrastructure & Deployment

| Decision              | Choice                                                                 | Rationale                                                                                               |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Deployment            | Docker Compose (3 services: api, redis, postgres)                      | Single `docker-compose up`; consistent local/prod; future worker = add service                          |
| Target server         | 2C4G cloud VPS                                                         | API ~512MB, PG ~512MB, Redis ~128MB, system ~1.5GB — fits with margin                                   |
| Runtime               | Node.js (Hono via @hono/node-server)                                   | tsx watch for dev; tsc build for production                                                             |
| Package manager       | Bun (workspace monorepo)                                               | Fast install; workspace protocol for internal packages                                                  |
| Process model         | Single process (API + rule engine)                                     | Modular design with interface boundaries; future worker extraction requires only transport layer change |
| Datasource connection | WebSocket (backend as client, datasource as server)                    | Interface-only in V1; datasource tech stack TBD; mock server for development                            |
| Error handling        | Unified error framework (global Hono handler + per-module error codes) | Consistent `{ message, code }` response shape across all modules; global HTTPException handler          |

### Observability

| Decision      | Choice                                          | Rationale                                                                        |
| ------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Health check  | `GET /health` (DB + Redis + rule engine status) | Simple JSON response; Docker healthcheck compatible                              |
| Metrics       | Pino structured logging with metric fields      | `tickLatencyMs`, `triggerCount`, `notificationStatus`, `queueDepth` in JSON logs |
| Alerting      | Log-level based (error = system issue)          | No external alerting stack; `docker logs` + Pino for V1                          |
| Visualization | Deferred to Phase 2                             | V1: `/health` + `docker logs`; Phase 2: admin dashboard per Journey 4            |

### Decision Impact Analysis

**Implementation Sequence:**

1. Docker Compose scaffold (api + redis + postgres + mock-datasource services)
2. Datasource Tick interface + mock WebSocket server (apps/datasource/)
3. Drizzle schema definitions (alarms, chat_sessions, chat_messages, notifications, push_subscriptions, alarm_feedback)
4. Unified error framework (common/errors.ts + global Hono error handler + per-module error codes)
5. Better-Auth integration (auth middleware, Google OAuth)
6. Alarm CRUD API (POST/GET/PATCH/DELETE /alarms)
7. BullMQ setup (trigger queue, notification worker module)
8. Rule engine module (in-process, modular interface, consumes Tick via datasource WebSocket client)
9. AI parser interface + GLM-5 implementation
10. SSE streaming endpoint (Hono → assistant-ui adapter)
11. Web Push (Service Worker, subscription management, push delivery)
12. Frontend pages (chat, alarms, settings)

**Cross-Component Dependencies:**

- BullMQ ← Rule engine (trigger events) → Notification module (consume queue)
- Redis ← BullMQ + Tick cache + Session cache (shared instance)
- AlarmParser interface ← Chat API (orchestrates parsing) → GLM-5 (implementation)
- Auth middleware ← All API routes (user_id injection)
- assistant-ui adapter ← SSE endpoint (event protocol mapping)

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where AI agents could make inconsistent choices, derived from existing codebase analysis.

### Naming Patterns

**Database Naming:**

| Element           | Convention                              | Example                                          |
| ----------------- | --------------------------------------- | ------------------------------------------------ |
| Table names       | snake_case, plural                      | `alarms`, `chat_sessions`, `notifications`       |
| Column names      | snake_case                              | `user_id`, `condition_group`, `cooldown_seconds` |
| Drizzle TS fields | camelCase mapping to snake_case columns | `userId: uuid("user_id")`                        |
| Index names       | `{table}_{purpose}_idx`                 | `alarms_user_id_idx`, `alarms_symbol_eval_idx`   |
| Enum types        | snake_case                              | `notify_tier`                                    |
| Foreign keys      | `{referenced_table_singular}_id`        | `user_id`, `alarm_id`, `session_id`              |

**API Naming:**

| Element             | Convention       | Example                                         |
| ------------------- | ---------------- | ----------------------------------------------- |
| Resource routes     | plural nouns     | `/alarms`, `/chat/sessions`                     |
| Route params        | `:id` (UUID)     | `/alarms/:id`                                   |
| Query params        | camelCase        | `?sessionId=xxx&limit=20`                       |
| Request body fields | camelCase (JSON) | `{ "conditionGroup": ..., "notifyLabel": ... }` |

**Code Naming:**

| Element           | Convention                                   | Example                                        |
| ----------------- | -------------------------------------------- | ---------------------------------------------- |
| Backend files     | kebab-case                                   | `alarm_trigger_outbox.ts`, `request-logger.ts` |
| Frontend files    | kebab-case                                   | `protected-route.tsx`, `auth-button.tsx`       |
| React components  | PascalCase (in code)                         | `AlarmEditor`, `ChatThread`                    |
| Functions/methods | camelCase                                    | `listAlarmsForUser`, `softDeleteAlarm`         |
| Zod schemas       | PascalCase + `Schema` suffix                 | `CreateBodySchema`, `FeedbackBodySchema`       |
| Type exports      | PascalCase                                   | `AlarmRow`, `AuthStore`, `AlarmInsert`         |
| Constants         | camelCase or SCREAMING_SNAKE for error codes | `chatErrorCodes`, `CHAT_SESSION_NOT_FOUND`     |

### Structure Patterns

**Backend Module Structure (per domain):**

```text
src/modules/{module}/
  routes.ts          # Hono route definitions + Zod validation
  service.ts         # Business logic (DB queries, domain rules)
  errors.ts          # Typed error codes constant
  mapper.ts          # DB row → API response mapping
  mapper.test.ts     # Co-located tests for mapper
  condition-group.ts # Module-specific utilities (if needed)
```

**Backend Shared Structure:**

```text
src/
  entities/          # Drizzle schema definitions (one file per table)
  common/
    db/client.ts     # Database connection
    logging/         # Pino logger setup
  config/            # Environment configuration
  modules/           # Domain modules (alarms, auth, chat)
  index.ts           # App entry point
```

**Frontend Structure:**

```text
src/
  pages/             # Route-level page components
  components/
    ui/              # shadcn primitives
    chat/            # Chat-specific components + UIBlock registry
    alarms/          # Alarm management components
  hooks/             # Custom React hooks
  services/          # API client modules (api.ts, alarms-api.ts, chat-api.ts)
  store/             # zustand stores (auth.ts, chat.ts, alarms.ts)
  types/             # Shared TypeScript interfaces
  lib/               # Utility functions (utils.ts, validators.ts)
```

**Test Location:** Co-located with source file (`mapper.test.ts` next to `mapper.ts`). Integration tests in a top-level `tests/` directory if needed.

### Format Patterns

**API Response Format:**

```ts
// Single resource
{ "alarm": { "id": "...", "symbol": "..." } }

// Resource list
{ "alarms": [...] }

// Creation (201)
{ "alarm": { ... } }   // 201 Created

// Deletion (204)
null                     // 204 No Content

// Error
{ "message": "Alarm not found", "code": "ALARM_NOT_FOUND" }
```

**Error Code Convention:**

```ts
// Per-module typed error codes — ALL modules must use this pattern
export const alarmErrorCodes = {
  NOT_FOUND: "ALARM_NOT_FOUND",
  INVALID_CONDITION: "ALARM_INVALID_CONDITION",
} as const;

// Throw via HTTPException
throw new HTTPException(404, { message: "Alarm not found" });
```

Modules without typed error codes (currently alarms) must be updated to match the chat module pattern.

**Date/Time Format:**

- Storage: PostgreSQL `timestamptz` (UTC)
- API JSON: ISO 8601 strings (`"2026-05-04T10:23:00.000Z"`)
- Frontend: `Date` objects, displayed in user's local timezone (CST for A-share traders)

**JSON Field Naming:** camelCase in API request/response bodies. snake_case in database columns. Drizzle handles the mapping via explicit column names (`userId: uuid("user_id")`).

### Communication Patterns

**SSE Event Protocol:**

```ts
type StreamEvent =
  | { event: "message_start"; data: { messageId: string } }
  | { event: "block_start"; data: { messageId: string; blockId: string; block: Block } }
  | { event: "block_delta"; data: { messageId: string; blockId: string; delta: string } }
  | { event: "block_end"; data: { messageId: string; blockId: string } }
  | { event: "block_patch"; data: { messageId: string; blockId: string; patch: Partial<Block> } }
  | { event: "message_end"; data: { messageId: string } }
  | { event: "error"; data: { message: string; code: string } };
```

**BullMQ Job Naming:**

- Queue: `alarm-triggers`
- Job name: `trigger-notification`
- Job data: `{ alarmId, userId, symbol, notifyLabel, notifyTier, triggeredAt }`
- Retry: 3 attempts with exponential backoff

**Zustand Store Pattern:**

```ts
type XyzState = {
  /* fields */
};
type XyzActions = {
  /* methods */
};
export type XyzStore = XyzState & XyzActions;

export const useXyz = create<XyzStore>()(
  persist(
    (set, get) => ({
      // state + actions
    }),
    {
      name: "xyz-storage",
      partialize: (state) => ({
        /* persisted fields */
      }),
    },
  ),
);
```

### Process Patterns

**Error Handling:**

- Backend unified error framework:
  - `common/errors/app-error.ts` — Base `AppError` class extending `HTTPException` with `code` (domain error code) and `statusCode`.
  - `common/errors/error-codes.ts` — Convention: `DOMAIN_ENTITY_ACTION` (e.g. `ALARM_NOT_FOUND`, `CHAT_SESSION_NOT_FOUND`).
  - `common/errors/error-handler.ts` — Global Hono `onError` handler catches all `AppError` (and fallback for unknown errors), returns unified `{ message, code }` JSON.
  - Per-module `errors.ts` — Each module defines its typed error code constants. All modules use `AppError` to throw (not bare `HTTPException`).
  - Zod `.parse()` failures caught by global handler, returned as `{ message: "Validation error", code: "VALIDATION_ERROR", details: [...] }`.
- Frontend: `ApiError` class from `services/api.ts` maps to backend error codes. All API calls wrapped in try/catch. User-facing errors shown as toast with recovery action.
- Never expose internal error details (stack traces, SQL errors) to frontend.

**Auth Flow Pattern:**

- Backend: `requireAuth` middleware on all protected routes. `userId = c.get("authUser").id` — never trust client-supplied user_id.
- Frontend: `apiFetch()` auto-attaches Bearer token. 401 triggers token refresh. Refresh failure → redirect to `/login`.
- Resource ownership: all queries filter by `userId`. Non-owned resources return 404 (not 403) to avoid information leakage.

**Loading States:**

- Frontend: `status` field in store (`"idle" | "loading" | "success" | "error"`).
- Skeleton components for initial loads. No spinner for streaming (use progressive render).
- Optimistic updates for toggle/delete actions (update UI immediately, revert on error).

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow existing Drizzle column naming convention (TS camelCase → DB snake_case with explicit column name).
2. Define typed error codes in `errors.ts` for any new module. Throw via `AppError` (not bare `HTTPException`). All errors caught by global handler.
3. Wrap API responses in `{ resourceName: value }` for single items, `{ resourceNames: [...] }` for lists.
4. Use `@/` path alias for all frontend imports. Never use relative paths crossing more than one directory.
5. Place Zod schemas in route files alongside the routes that use them. Export schemas if shared across routes.
6. Use `requireAuth` middleware on all new route groups. Extract `userId` from `c.get("authUser").id` only.
7. Run `vp check` and `vp test` before considering any implementation complete.
8. Import from `vite-plus` (not `vite` or `vitest` directly) for any tool-level imports.

**Pattern Enforcement:**

- Lint rules (Oxlint via `vp lint`) catch naming and formatting violations.
- `vp fmt` enforces consistent code style.
- Co-located tests verify mapper and service logic.
- PR review checks for pattern adherence (response format, error codes, auth middleware).

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
market/
├── package.json                    # Monorepo root (bun workspaces)
├── bun.lock
├── tsconfig.json                   # Base TS config
├── vite.config.ts                  # Vite+ config
├── CLAUDE.md                       # Workspace rules
├── DESIGN.md                       # Design system tokens
├── docker-compose.yml              # api + redis + postgres (V1)
├── .env.example                    # Environment template
├── apps/
│   ├── frontend/                   # React SPA
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── CLAUDE.md
│   │   ├── public/
│   │   │   ├── sw.js               # Service Worker (Web Push)
│   │   │   └── manifest.json       # PWA manifest (for SW registration)
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── globals.css
│   │       ├── vite-env.d.ts
│   │       ├── pages/
│   │       │   ├── login.tsx        # /login
│   │       │   ├── callback.tsx     # /callback (OAuth)
│   │       │   ├── home.tsx         # / (redirect to /chat)
│   │       │   ├── chat.tsx         # /chat (assistant-ui)
│   │       │   ├── alarms.tsx       # /alarms (list)
│   │       │   ├── alarm-detail.tsx # /alarms/:id
│   │       │   └── settings.tsx     # /settings (push prefs placeholder)
│   │       ├── components/
│   │       │   ├── ui/              # shadcn primitives
│   │       │   ├── auth-button.tsx
│   │       │   ├── protected-route.tsx
│   │       │   ├── chat/
│   │       │   │   ├── assistant-thread.tsx
│   │       │   │   ├── assistant-composer.tsx
│   │       │   │   ├── chat-model-adapter.ts  # SSE → assistant-ui adapter
│   │       │   │   └── blocks/
│   │       │   │       ├── alarm-preview-block.tsx
│   │       │   │       ├── alarm-editor-block.tsx
│   │       │   │       └── unsupported-response-block.tsx
│   │       │   └── alarms/
│   │       │       ├── alarm-list-row.tsx
│   │       │       ├── template-card.tsx
│   │       │       └── alarm-form.tsx
│   │       ├── hooks/
│   │       │   ├── use-alarms.ts
│   │       │   ├── use-chat-stream.ts
│   │       │   ├── use-push-subscription.ts
│   │       │   └── use-session.ts
│   │       ├── services/
│   │       │   ├── api.ts           # Base apiFetch + ApiError
│   │       │   ├── auth-api.ts
│   │       │   ├── chat-api.ts      # SSE stream connection
│   │       │   └── alarms-api.ts
│   │       ├── store/
│   │       │   ├── auth.ts          # session-store
│   │       │   ├── chat.ts          # chat-store
│   │       │   └── alarms.ts        # alarms-store
│   │       ├── types/
│   │       │   ├── auth.ts
│   │       │   ├── chat.ts          # Block, Message, StreamEvent types
│   │       │   └── alarms.ts        # AlarmSpec, Condition, ConditionGroup
│   │       ├── lib/
│   │       │   ├── utils.ts         # cn(), formatters
│   │       │   └── validators.ts    # Client-side validation helpers
│   │       └── sw-register.ts       # Service Worker registration logic
│   ├── backend/                    # Hono API + Rule Engine
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts            # App entry, Hono app setup, route mounting
│   │       ├── config/
│   │       │   └── env.ts          # Environment variables (Zod validated)
│   │       ├── db/
│   │       │   ├── client.ts       # Drizzle + postgres connection
│   │       │   └── migrate.ts      # Migration runner
│   │       ├── entities/           # Drizzle schema definitions
│   │       │   ├── schema.ts       # Re-exports all tables
│   │       │   ├── enums.ts        # notify_tier, message_role, etc.
│   │       │   ├── users.ts
│   │       │   ├── accounts.ts
│   │       │   ├── refreshTokens.ts
│   │       │   ├── sessions.ts     # Better-Auth sessions (if custom)
│   │       │   ├── alarms.ts
│   │       │   ├── alarm_feedback.ts
│   │       │   ├── notifications.ts
│   │       │   ├── alarm_trigger_outbox.ts
│   │       │   ├── chat_sessions.ts
│   │       │   ├── chat_messages.ts
│   │       │   └── push_subscriptions.ts  # Web Push subscriptions
│   │       ├── common/
│   │       │   ├── db/
│   │       │   │   └── client.ts
│   │       │   ├── errors/
│   │       │   │   ├── app-error.ts       # Base AppError class (code, statusCode, message)
│   │       │   │   ├── error-codes.ts     # Shared error code format: DOMAIN_ENTITY_ACTION
│   │       │   │   └── error-handler.ts   # Global Hono onError handler → unified JSON response
│   │       │   └── logging/
│   │       │       ├── logger.ts         # Pino setup
│   │       │       └── request-logger.ts # HTTP request logging
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── middleware.ts      # requireAuth, AuthVariables
│   │       │   │   ├── better-auth.ts    # BA instance config
│   │       │   │   └── routes.ts         # Auth routes (OAuth, session)
│   │       │   ├── alarms/
│   │       │   │   ├── routes.ts         # CRUD + feedback endpoints
│   │       │   │   ├── service.ts        # Business logic
│   │       │   │   ├── errors.ts         # Typed error codes
│   │       │   │   ├── mapper.ts         # Row → API response
│   │       │   │   ├── mapper.test.ts
│   │       │   │   └── condition-group.ts # ConditionGroup validation
│   │       │   ├── chat/
│   │       │   │   ├── routes.ts         # Session + message endpoints
│   │       │   │   ├── internal-routes.ts
│   │       │   │   ├── service.ts        # Session/message logic
│   │       │   │   ├── errors.ts         # Typed error codes
│   │       │   │   ├── mapper.ts
│   │       │   │   ├── mapper.test.ts
│   │       │   │   └── stream.ts         # SSE event producer
│   │       │   ├── push/
│   │       │   │   ├── routes.ts         # POST /push/subscribe, /push/unsubscribe
│   │       │   │   ├── service.ts        # Subscription CRUD
│   │       │   │   ├── errors.ts
│   │       │   │   └── sender.ts         # web-push library, VAPID signing
│   │       │   ├── rule-engine/
│   │       │   │   ├── engine.ts         # Tick → evaluate → trigger pipeline
│   │       │   │   ├── evaluator.ts      # evaluateCondition, evaluateGroup
│   │       │   │   ├── evaluator.test.ts
│   │       │   │   ├── cooldown.ts       # Cooldown enforcement
│   │       │   │   ├── edge-detector.ts  # lastMatchState false→true detection
│   │       │   │   └── types.ts          # Tick, DerivedMetrics interfaces
│   │       │   └── notifications/
│   │       │       ├── worker.ts         # BullMQ consumer, trigger → push delivery
│   │       │       ├── renderer.ts       # Notification content template (PRD §6.1)
│   │       │       └── queue.ts          # BullMQ queue definition + helpers
│   │       ├── datasource/
│   │       │   ├── client.ts            # WebSocket client (connects to datasource WS server)
│   │       │   ├── client.test.ts
│   │       │   └── types.ts             # Tick, DerivedMetrics interfaces (re-exported from packages/utils)
│   │       └── ai/
│   │           ├── parser-interface.ts   # AlarmParser abstract interface
│   │           ├── glm-provider.ts       # GLM-5 implementation
│   │           ├── prompt-builder.ts     # System prompt + context assembly
│   │           ├── prompt-builder.test.ts
│   │           └── schemas.ts            # Zod schemas for AI output validation
│   ├── datasource/                 # Market data feed (V1: mock WebSocket server)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts            # Mock WebSocket server (sends fake Ticks)
│   │       └── mock-data.ts        # Static market data for development
│   └── market-native/              # Phase 2 placeholder
│       └── package.json
├── packages/
│   └── utils/
│       ├── package.json
│       └── src/
│           ├── types.ts            # Shared AlarmSpec, Condition, ConditionGroup
│           └── constants.ts        # Metric list, operators, templates
├── docs/
│   ├── designs/                    # Domain model designs (existing)
│   ├── prds/                       # PRD documents (existing)
│   ├── plans/                      # Implementation plans
│   └── rules/                      # Engineering standards
└── _bmad-output/
    └── planning-artifacts/         # Architecture + PRD + UX spec (this doc)
```

### Architectural Boundaries

**API Boundaries:**

| Boundary                          | Protocol                      | Direction                           |
| --------------------------------- | ----------------------------- | ----------------------------------- |
| Frontend → Backend API            | HTTP REST + Bearer JWT        | Client → Server                     |
| Backend → AI Provider             | HTTP REST (GLM-5 API)         | Server → External                   |
| Backend → Browser Push            | Web Push (VAPID)              | Server → Browser (via push service) |
| Rule Engine → Notification Worker | BullMQ (Redis)                | Internal async                      |
| Datasource → Backend              | WebSocket (backend as client) | External → Server (tick stream)     |

**Module Boundaries (Backend):**

| Module        | Owns                             | Consumes From                            |
| ------------- | -------------------------------- | ---------------------------------------- |
| auth          | users, sessions, OAuth flow      | Better-Auth library                      |
| alarms        | alarms, alarm_feedback           | auth (userId), notifications (queue)     |
| chat          | chat_sessions, chat_messages     | auth (userId), ai (parser)               |
| push          | push_subscriptions               | auth (userId)                            |
| rule-engine   | evaluation logic, edge detection | entities (alarms), notifications (queue) |
| notifications | BullMQ consumer, push delivery   | push (sender), alarms (queue producer)   |
| ai            | NL→structured parsing            | chat (orchestration)                     |

**Data Flow (Tick to Notification):**

```text
apps/datasource/ (mock WS server in dev, real broker feed in prod)
                ↓ WebSocket
         datasource/client.ts (backend WS client)
                ↓ Tick + DerivedMetrics
         rule-engine/engine.ts
                ↓ evaluateGroup per alarm
         edge-detector.ts (false→true?)
                ↓
         cooldown.ts (check)
                ↓
         BullMQ alarm-triggers queue
                ↓
         notifications/worker.ts
                ↓
         notifications/renderer.ts (PRD §6.1 template)
                ↓
         push/sender.ts (web-push → FCM/APNs)
                ↓
         Browser Service Worker → User notification
```

**Data Flow (Chat to Alarm Creation):**

```text
User types sentence → chat/routes.ts
                ↓
         ai/parser-interface.ts → glm-provider.ts
                ↓ ParsedDraft (structured JSON)
         chat/stream.ts → SSE events to frontend
                ↓
         Frontend alarm_editor UIBlock
                ↓ User confirms
         alarms/routes.ts → POST /alarms
                ↓
         alarms/service.ts → DB insert
                ↓
         Rule engine picks up new alarm on next tick
```

### Requirements to Structure Mapping

| FR Category          | Backend Module                                                      | Frontend Location                                                             | Entity                            |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| FR1–3 Auth           | modules/auth/                                                       | store/auth.ts, services/auth-api.ts                                           | users, accounts, refreshTokens    |
| FR4–11 Chat & AI     | modules/chat/, ai/                                                  | pages/chat.tsx, components/chat/, store/chat.ts                               | chat_sessions, chat_messages      |
| FR12–18 Alarm CRUD   | modules/alarms/                                                     | pages/alarms.tsx, pages/alarm-detail.tsx, components/alarms/, store/alarms.ts | alarms                            |
| FR19 Condition Logic | modules/alarms/condition-group.ts, modules/rule-engine/evaluator.ts | types/alarms.ts                                                               | (within alarms JSONB)             |
| FR20–21 Templates    | modules/alarms/service.ts                                           | components/alarms/template-card.tsx                                           | (server-side preset insert)       |
| FR22–26 Rule Engine  | modules/rule-engine/                                                | —                                                                             | alarms (read-only)                |
| FR27–30 Notification | modules/notifications/, modules/push/                               | hooks/use-push-subscription.ts, public/sw.js                                  | notifications, push_subscriptions |
| FR31–32 Feedback     | modules/alarms/routes.ts                                            | components/alarms/                                                            | alarm_feedback                    |

### Integration Points

**External Integrations:**

| Integration         | Module                            | Config                                     |
| ------------------- | --------------------------------- | ------------------------------------------ |
| GLM-5 API           | ai/glm-provider.ts                | `GLM_API_KEY`, `GLM_API_URL`               |
| Google OAuth        | modules/auth/better-auth.ts       | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Web Push (FCM/APNs) | modules/push/sender.ts            | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`    |
| Broker Data Feed    | apps/datasource/ (mock WS in dev) | Datasource URL config                      |

**Shared Package (`packages/utils`):**

- `types.ts` — AlarmSpec, Condition, ConditionGroup, Operator, Metric, NotifyTier
- `constants.ts` — SUPPORTED_METRICS, OPERATORS, PRESET_TEMPLATES
- `tick.ts` — Tick, DerivedMetrics interfaces (shared between datasource and backend)
- Both frontend and backend import from this package to ensure type consistency

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible. Hono (lightweight HTTP) + Drizzle (type-safe SQL) + BullMQ (Redis-backed queue) + Pino (structured logging) + GLM-5 (stateless AI calls) form a coherent stack with no version conflicts. The in-process rule engine avoids IPC overhead while BullMQ provides the async boundary for trigger→notification decoupling. WebSocket connection to datasource decouples market data ingestion from API concerns.

**Pattern Consistency:** Implementation patterns align with technology choices. Drizzle column naming (TS camelCase → DB snake_case) is consistently applied. Unified error framework (AppError + global handler + per-module codes) replaces ad-hoc HTTPException usage. API response wrapping is standardized. SSE event protocol maps cleanly to assistant-ui's adapter interface.

**Structure Alignment:** Project structure directly supports architectural decisions. Backend modules map 1:1 to domain boundaries. Frontend stores map 1:1 to backend domains. The `packages/utils` shared package prevents type drift between frontend and backend. Datasource communicates via WebSocket with mock server for development.

### Requirements Coverage Validation

**Functional Requirements Coverage:**

| FR Category              | Covered | Architectural Support                                              |
| ------------------------ | ------- | ------------------------------------------------------------------ |
| FR1–3 Auth               | ✅      | modules/auth/ + Better-Auth + requireAuth middleware               |
| FR4–6 Chat Sessions      | ✅      | modules/chat/ + chat_sessions entity                               |
| FR7–8 AI Streaming       | ✅      | modules/ai/ + chat/stream.ts + SSE protocol                        |
| FR9 Editable Draft       | ✅      | alarm_editor UIBlock + frontend chat-store                         |
| FR10–11 History & Limits | ✅      | GET /chat/sessions/:id/messages + AI prompt guard                  |
| FR12–18 Alarm CRUD       | ✅      | modules/alarms/ + full REST lifecycle                              |
| FR19 Flat Conditions     | ✅      | condition-group.ts + evaluator.ts (AND/OR only)                    |
| FR20–21 Templates        | ✅      | Server-side preset insert in alarms/service.ts                     |
| FR22–26 Rule Engine      | ✅      | modules/rule-engine/ (engine, evaluator, edge-detector, cooldown)  |
| FR27–30 Notification     | ✅      | modules/notifications/ + modules/push/ + Web Push + Service Worker |
| FR31–32 Feedback         | ✅      | POST /alarms/:id/feedback + alarm_feedback entity                  |

**Non-Functional Requirements Coverage:**

| NFR Category         | Covered | Architectural Support                                                                 |
| -------------------- | ------- | ------------------------------------------------------------------------------------- |
| NFR1–2 Latency       | ✅      | In-process rule engine + BullMQ async delivery + SSE streaming                        |
| NFR3 AI First-token  | ✅      | GLM-5 stateless API + prompt caching strategy                                         |
| NFR4–7 Frontend Perf | ✅      | Vite build + <300KB bundle target + skeleton loading                                  |
| NFR8–11 Reliability  | ✅      | Edge-triggered detection + cooldown + BullMQ retry + SSE auto-reconnect               |
| NFR12–15 Security    | ✅      | requireAuth middleware + server-side userId + no external data APIs                   |
| NFR16–18 Integration | ✅      | Pluggable datasource (WebSocket) + AlarmParser interface + web-push standard protocol |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with rationale. Technology versions verified from package.json. Pattern enforcement rules specified with concrete examples. Datasource interface defined with mock strategy for development.

**Structure Completeness:** Complete directory tree with file-level specificity. All 7 backend modules, 7 frontend pages, and shared package defined. Integration points mapped with config requirements. Error framework fully specified.

**Pattern Completeness:** Naming, structure, format, communication, and process patterns all defined with examples. 8 enforcement guidelines for AI agents documented. Unified error framework replaces inconsistent approaches.

### Gap Analysis Results

**No Critical Gaps.**

**Minor Gaps:**

1. **apps/datasource tech stack TBD** — Deliberate: V1 uses mock WebSocket server. Real broker integration deferred until datasource technology is selected. Interface defined in `packages/utils/tick.ts`.
2. **packages/utils type sync** — Shared types need a clear contract with Drizzle entities to avoid drift. Recommendation: shared package defines business types only (Tick, AlarmSpec); Drizzle row types derived locally in each app.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Brownfield codebase with established patterns — architecture aligns with existing conventions rather than imposing new ones
- Clear domain boundaries (auth, chat, alarms, push, rule-engine, notifications, ai) with explicit module ownership
- Two data flows (tick→notification, chat→alarm) fully mapped end-to-end
- In-process rule engine with BullMQ queue provides simplicity for V1 and clean extraction path for future scaling
- Unified error framework ensures consistent error handling across all modules
- Datasource decoupled via WebSocket with mock support for development velocity

**Areas for Future Enhancement:**

- Real datasource broker integration (tech stack TBD, interface ready)
- Admin/health dashboard (Journey 4) deferred to Phase 2
- CI/CD pipeline not yet defined — manual Docker Compose deployment for V1
- Rate limiting not needed for <10 users but should be considered before public launch

### Implementation Handoff

**AI Agent Guidelines:**

1. Follow all architectural decisions exactly as documented in this file.
2. Use implementation patterns consistently — refer to naming, format, and process patterns before creating new files.
3. Respect project structure and module boundaries — do not create cross-module dependencies without explicit integration points.
4. Use `AppError` for all error throwing. Define typed error codes per module. Never use bare `HTTPException` with string messages.
5. Datasource is interface-only in V1. Use mock WebSocket server for development. Real broker integration is out of scope.
6. Run `vp check` and `vp test` after every implementation step.

**First Implementation Priority:**

1. Unified error framework (common/errors/ + global Hono handler + migrate existing modules)
2. Datasource Tick interface + mock WebSocket server (apps/datasource/)
3. Docker Compose setup (api + redis + postgres + mock-datasource services)
4. Proceed per the Implementation Sequence defined in Core Architectural Decisions
