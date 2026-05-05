# P2: SSE End-to-End Verification + messageId Security Fix

**Date:** 2026-05-05
**Scope:** Stories 2.1 (Chat Routes) and 2.3 (AI Streaming)
**Target:** Verify SSE protocol compliance, fix messageId exposure, document auto-reconnect

---

## 1. Current SSE Implementation State

### Backend (`modules/chat/stream.ts`)

| Event           | Architecture Spec                               | Implementation                                      | Status                                   |
| --------------- | ----------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `message_start` | `{ messageId }`                                 | `{ requestId, sessionId, messageId, ts, data: {} }` | ✅ Matches                               |
| `block_start`   | `{ messageId, blockId, block: Block }`          | `{ ..., data: { blockId, type: "text" } }`          | ⚠️ Partial — missing full `Block` object |
| `block_delta`   | `{ messageId, blockId, delta }`                 | `{ ..., data: { blockId, delta } }`                 | ✅ Matches                               |
| `block_end`     | `{ messageId, blockId }`                        | `{ ..., data: { blockId } }`                        | ✅ Matches                               |
| `block_patch`   | `{ messageId, blockId, patch: Partial<Block> }` | Not emitted                                         | ❌ Missing                               |
| `message_end`   | `{ messageId }`                                 | `{ ..., data: { status: "done" } }`                 | ✅ Matches (with extra status field)     |
| `error`         | `{ message, code }`                             | `{ ..., data: { code, message } }`                  | ✅ Matches                               |

**Key finding:** The `SseEventName` type in `types.ts` is missing `"block_patch"`. This event is needed for UIBlock updates (e.g., when the AI patches alarm_editor props during streaming).

### Frontend (`services/chat-api.ts`)

| Feature        | Status     | Notes                                                   |
| -------------- | ---------- | ------------------------------------------------------- |
| SSE connection | ✅ Working | Uses `fetch` + `ReadableStream` reader                  |
| Event parsing  | ✅ Working | Manual line-by-line parsing of `event:` / `data:` lines |
| Auth token     | ✅ Working | Bearer token from auth store                            |
| AbortSignal    | ✅ Working | Passed through from adapter                             |
| Auto-reconnect | ❌ Missing | No retry logic on connection loss                       |
| Error recovery | ❌ Missing | Throws on non-ok response                               |

---

## 2. messageId Security Fix

### Current Issue

The stream endpoint URL contains `messageId` as a query parameter:

```
GET /api/v1/chat/sessions/:sessionId/stream?messageId=xxx
```

**Risk:** Query parameters appear in:

- Server access logs (Pino, nginx, etc.)
- Browser history
- Proxy/CDN logs
- Referer headers

While `messageId` is not a secret credential, it is an internal identifier that could enable:

- Information leakage about message volume/patterns
- Potential for request smuggling if messageId format changes
- Unnecessary exposure per defense-in-depth principle

### Fix: Move messageId to Request Header

**Backend change** (`routes.ts`):

```ts
// Before
const messageId = c.req.query("messageId");

// After
const messageId = c.req.header("X-Message-Id");
```

**Frontend change** (`chat-api.ts`):

```ts
// Before
const url = `${baseUrl}/api/v1/chat/sessions/${sessionId}/stream?messageId=${encodeURIComponent(messageId)}`;

// After
const url = `${baseUrl}/api/v1/chat/sessions/${sessionId}/stream`;
const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "text/event-stream",
    "X-Message-Id": messageId,
  },
  signal,
});
```

**Also fix backend stream URL construction** (`routes.ts:93`):

```ts
// Before
streamUrl: `/api/v1/chat/sessions/${sessionId}/stream?messageId=${assistantMessageId}`,

// After
streamUrl: `/api/v1/chat/sessions/${sessionId}/stream`,
// messageId passed separately; frontend knows it from the response
```

### Additional SSE Route Validation

The current stream route (`GET /sessions/:id/stream`) validates message ownership via `getMessageForSession({ userId, sessionId, messageId })`. This triple-key lookup (user + session + message) is correct and provides proper authorization even if messageId is known. The header-based fix is defense-in-depth, not a vulnerability patch.

---

## 3. SSE Protocol Alignment Checklist

### 3.1 Add `block_patch` Event

The architecture spec defines `block_patch` for partial UIBlock updates. This is needed when the AI parser progressively fills alarm fields.

**Backend `types.ts`:**

```ts
export type SseEventName =
  | "message_start"
  | "block_start"
  | "block_delta"
  | "block_end"
  | "block_patch" // ADD THIS
  | "message_end"
  | "error";
```

### 3.2 Fix `block_start` Event Data Shape

Current `block_start` emits `{ blockId, type: "text" }`. The architecture spec requires the full `Block` object:

```ts
// Architecture spec
{ event: "block_start", data: { messageId, blockId, block: Block } }
```

For text blocks, `block: { type: "text", content: "" }`. For UIBlocks, `block: { type: "ui", component: "alarm_preview", props: {} }`.

**This must be fixed before Story 2.3** — the adapter needs the full block definition to determine rendering strategy.

### 3.3 Frontend SSE Event Parsing Robustness

Current parser has issues:

1. **Multi-line data:** SSE spec allows multi-line `data:` fields. Current parser only handles single-line.
2. **Comment lines:** SSE spec uses `:` as comment lines. Not handled.
3. **ID field:** SSE `id:` field for event tracking. Not parsed.

**For V1, single-line data is sufficient** since we control both ends. But document this limitation.

### 3.4 Frontend `SsePayload` Type Mismatch

`chat-api.ts` defines:

```ts
type SsePayload = {
  requestId: string;
  sessionId: string;
  messageId: string;
  ts: string;
  data: Record<string, unknown>;
};
```

Backend `eventEnvelope` produces exactly this shape. ✅ Aligned.

---

## 4. Auto-Reconnect Strategy

### Requirements (from UX-DR13, NFR11)

- Auto-reconnect within 5s of disconnection
- Display "Connection lost. Reconnecting..." in conversation
- Message continuity (no duplicate messages after reconnect)

### Design

**Reconnect is implemented at the adapter level**, not at the SSE client level:

```ts
// In market-adapter.ts
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

async function* streamWithReconnect(sessionId: string, messageId: string, signal?: AbortSignal) {
  let attempts = 0;
  while (attempts < MAX_RECONNECT_ATTEMPTS) {
    try {
      for await (const evt of streamSse(sessionId, messageId, signal)) {
        yield evt;
      }
      return; // Stream completed normally
    } catch (err) {
      attempts++;
      if (attempts >= MAX_RECONNECT_ATTEMPTS || signal?.aborted) throw err;
      yield { event: "reconnecting", payload: { attempt: attempts } };
      await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
    }
  }
}
```

**Message continuity:** The backend already persists messages as they stream (`updateAssistantMessageDone`). On reconnect, the frontend can reload the message via `listMessages()` and skip events already applied.

### For Story 2.1 vs 2.3

- **Story 2.1:** Implement basic reconnect in `streamSse()` (retry on fetch failure)
- **Story 2.3:** Add "Connection lost" UI state + message continuity logic

---

## 5. End-to-End Verification Plan

### Manual Test Script

1. **Start backend:** `vp run dev` in apps/backend
2. **Start frontend:** `vp run dev` in apps/frontend
3. **Authenticate:** Log in via Google OAuth
4. **Create session:** `POST /api/v1/chat/sessions`
5. **Send message:** `POST /api/v1/chat/sessions/:id/messages` with `{ content: "测试消息" }`
6. **Open stream:** `GET /api/v1/chat/sessions/:id/stream` (with messageId header)
7. **Verify events:** Expect `message_start` → `block_start` → `block_delta` × N → `block_end` → `message_end`
8. **Verify timing:** First event within 2s (NFR3)
9. **Test abort:** Cancel mid-stream, verify no server-side errors
10. **Test reconnect:** Kill backend during stream, restart, verify client reconnects

### Automated Test Coverage

| Test                                       | Location         | Status              |
| ------------------------------------------ | ---------------- | ------------------- |
| Stream returns 400 without messageId       | `stream.test.ts` | ✅                  |
| Stream returns 404 for wrong user/session  | `stream.test.ts` | ✅                  |
| Stream delegates to streamAssistantMessage | `stream.test.ts` | ✅                  |
| Full SSE event sequence verification       | Missing          | ❌ Add in Story 2.1 |
| messageId in header (post-fix)             | Missing          | ❌ Add with fix     |
| Reconnect behavior                         | Missing          | ❌ Add in Story 2.3 |

---

## 6. Implementation Order

1. **Fix messageId in header** (can be done during Story 2.1) — routes.ts + chat-api.ts
2. **Add `block_patch` to `SseEventName`** (during Story 2.1 setup) — types.ts
3. **Fix `block_start` data shape** (during Story 2.1) — stream.ts
4. **Add basic reconnect** (during Story 2.1) — chat-api.ts
5. **Add "Connection lost" UI** (during Story 2.3) — market-adapter.ts + chat.tsx
6. **Message continuity** (during Story 2.3) — load last message on reconnect

---

## 7. Deferred Work Addressed

| Item                                    | Source             | Resolution                                                                            |
| --------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| SSE messageId exposure                  | Story 1.0 deferred | Fixed by moving to header (this doc §2)                                               |
| `c.req.json()` invalid JSON returns 500 | Story 1.0 deferred | Fix during Story 2.1 chat routes — add `.catch(() => ({}))` or specific error handler |

**Note on `c.req.json()` fix:** The current `routes.ts:53` already handles this for `CreateSessionBodySchema`:

```ts
const body = CreateSessionBodySchema.parse(await c.req.json().catch(() => ({})));
```

But `CreateMessageBodySchema` at line 83 does not:

```ts
const body = CreateMessageBodySchema.parse(await c.req.json());
```

This should be fixed to catch JSON parse errors and return 400 instead of 500.
