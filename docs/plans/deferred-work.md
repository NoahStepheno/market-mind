# Deferred Work Tracker

Tracking exploratory and cross-cutting work items that don't map to a single story.

---

## P1 — assistant-ui 探索性集成

**Status:** done (2026-05-05)
**Goal:** Evaluate whether `assistant-ui` (React chat component library) fits the Market chat page.
**Outcome:**

- Installed `@assistant-ui/react@0.12.28` into `apps/frontend`
- Built `ChatModelAdapter` in `src/components/chat/market-adapter.ts` that bridges to our SSE backend
- Built `streamSse()` async generator in `src/services/chat-api.ts` for fetch-based SSE consumption
- Replaced placeholder `ChatPage` with assistant-ui `Thread` + `Composer` primitives
- Frontend builds clean (no TS errors, ~120KB gzip including assistant-ui)
- Uses `useLocalRuntime` with our custom adapter; no direct LLM dependency on frontend

**Open items:**

- Session management: currently creates a new session every mount. Needs session list UI and reuse.
- Auth token refresh during SSE streaming: if token expires mid-stream, the fetch will fail. Needs re-auth logic in `streamSse`.
- assistant-ui v0.12 API is still evolving (some types marked unstable). May need migration later.

---

## P2 — SSE 端到端验证 + messageId 安全修复

**Status:** done (2026-05-05)
**Goal:** Verify SSE pipeline and messageId security.
**Outcome:**

- **Security: No IDOR vulnerability.** `getMessageForSession` enforces `(userId, sessionId, messageId)` triple. A user cannot access another user's messages by guessing IDs.
- Added route-level tests in `apps/backend/src/modules/chat/stream.test.ts`:
  - Missing messageId → 400
  - messageId not belonging to user+session → 404
  - Valid triple → delegates to `streamAssistantMessage`
  - `POST /sessions/:id/messages` returns correct `{ assistantMessageId, streamUrl }`
- All 42 backend tests passing.

---

## P3 — AI parser prompt spike

**Status:** done (2026-05-05)
**Goal:** Produce a prompt template for Chinese NL → conditionGroup JSON parsing.
**Outcome:**

- Full prompt template and 12 test cases in `docs/plans/ai-parser-prompt.md`
- Covers: single/compound conditions, limit up/down, volume ratio, 5-min changes, custom cooldown, urgent tier, ambiguous inputs, out-of-scope
- Key finding: stock name→code resolution is the main risk; recommend a stock search API rather than embedding a lookup table in the prompt

---

## AI-1 — 建立 deferred-work.md 追踪机制

**Status:** done (2026-05-05)
**Goal:** This file. A lightweight markdown tracker for work that spans sessions or doesn't fit a single story.

---

## Completed

| Item | Date       | Outcome                                                           |
| ---- | ---------- | ----------------------------------------------------------------- |
| AI-1 | 2026-05-05 | Established this file                                             |
| P1   | 2026-05-05 | assistant-ui integrated, builds clean, streaming adapter wired    |
| P2   | 2026-05-05 | SSE security verified (triple-binding), 4 route tests added       |
| P3   | 2026-05-05 | Prompt template + 12 test cases in docs/plans/ai-parser-prompt.md |
