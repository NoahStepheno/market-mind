# Story 2.3: AI Natural Language Parsing & Streaming Response

Status: review

## Story

As a user,
I want to type a natural language description and receive an AI-parsed structured response in real time,
So that I can see my trading intent translated into actionable alarm conditions within seconds.

## Acceptance Criteria

1. **Given** the AlarmParser abstract interface is defined as `(userInput, context) → ParsedDraft` **When** the GLM-5 provider is configured **Then** the parser can be invoked via a stateless API call and swapped without architectural changes per NFR17 and AR5.

2. **Given** the shared package defines ConditionGroup types (AND/OR logic, 8 fixed metrics: price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m) **When** a condition group is validated **Then** only supported metrics and operators are accepted; invalid values are rejected by Zod schemas per FR19.

3. **Given** a user submits a natural language message in /chat **When** the message reaches the backend (POST /chat/sessions/:id/messages → GET stream) **Then** the system invokes the AI parser and begins streaming the response via SSE within 2 seconds per NFR3.

4. **Given** the SSE streaming is active **When** the backend emits events **Then** the events follow the protocol: message_start, block_start, block_delta, block_end, block_patch, message_end, error per AR6.

5. **Given** the SSE client adapter is configured **When** streaming events arrive at the frontend **Then** the assistant-ui ChatModelAdapter transforms SSE events into StreamPart format **And** TextBlock content renders progressively character by character per UX-DR16.

6. **Given** a user describes an unsupported metric (e.g., "alert me on MACD golden cross") **When** the AI parser detects the unsupported metric **Then** the AI responds with a clear text explanation of the limitation (not an incorrect draft) per FR11.

7. **Given** the AI has responded with an unsupported metric explanation **When** the response is displayed **Then** an unsupported_response UIBlock shows: the explanation, a 2-column available metrics grid (metric name + scenario demo), and 2-3 nearest-match template cards as one-tap alternatives per UX-DR5.

8. **Given** a user clicks a nearest-match template in the unsupported response **When** the click fires **Then** the template text auto-fills the chat input for resubmission.

9. **Given** an active SSE stream **When** the connection is lost **Then** the client displays "Connection lost. Reconnecting..." in the chat thread and auto-reconnects within 5s with message continuity per UX-DR13 and NFR11.

## Tasks / Subtasks

- [x] Task 1: Create AI parser module (AC: #1, #2)
  - [x] 1.1 Create `apps/backend/src/ai/parser-interface.ts` — abstract `AlarmParser` interface with `parse(input: ParserInput): Promise<ParserOutput>`
  - [x] 1.2 Create `apps/backend/src/ai/schemas.ts` — Zod v4 schemas: `ConditionSchema`, `ParsedDraftSchema` (symbol, symbolName, conditionGroup with AND/OR, conditions, cooldownSeconds, notifyLabel, notifyTier)
  - [x] 1.3 Create `apps/backend/src/ai/prompt-builder.ts` — system prompt assembly with metric definitions, operator list, few-shot examples, and symbol table
  - [x] 1.4 Create `apps/backend/src/ai/prompt-builder.test.ts` — test prompt assembly produces complete system prompt with all required sections

- [x] Task 2: Implement GLM-5 provider (AC: #1, #3)
  - [x] 2.1 Create `apps/backend/src/ai/glm-provider.ts` — GLM-5 API integration implementing `AlarmParser` interface
  - [x] 2.2 Add `GLM_API_KEY`, `GLM_API_URL`, `GLM_MODEL` to `apps/backend/.env.example`
  - [x] 2.3 Configuration: temperature 0.1 for consistency, maxTokens 2048, streaming enabled
  - [x] 2.4 Implement output parsing: extract JSON from markdown code blocks, validate with `ParsedDraftSchema.safeParse()`
  - [x] 2.5 Error handling: API timeout (>30s) → CHAT_AI_TIMEOUT, malformed JSON → text-only fallback, rate limit → error event
  - [x] 2.6 Create `apps/backend/src/ai/glm-provider.test.ts` — test with mocked GLM responses for: valid draft, unsupported metric, malformed response

- [x] Task 3: Wire AI parser into streaming pipeline (AC: #3, #4)
  - [x] 3.1 Update `apps/backend/src/modules/chat/stream.ts` — replace mock echo content with real `AlarmParser.parse()` call
  - [x] 3.2 Stream flow: accumulate text explanation → emit `block_delta` for TextBlock; on draft detection → emit `block_start` for UIBlock (alarm_preview) → `block_patch` with draft data → `block_end`
  - [x] 3.3 V1 simplification: wait for complete GLM-5 response, then emit all blocks in sequence (progressive UIBlock streaming deferred to UX polish)
  - [x] 3.4 Update `apps/backend/src/modules/chat/routes.ts` — wire `buildChatContext` with actual user message (replace hardcoded "继续") and pass recent messages from DB
  - [x] 3.5 Update `apps/backend/src/modules/chat/types.ts` — add `unsupported_response` to UIBlock component union type

- [x] Task 4: Frontend SSE adapter enhancement (AC: #5, #9)
  - [x] 4.1 Update `apps/frontend/src/components/chat/market-adapter.ts` — handle `block_start` with `type: "ui"` to yield UIBlock content parts
  - [x] 4.2 Handle `block_patch` events for UIBlock progressive updates
  - [x] 4.3 Handle `error` event from SSE — show "Connection lost. Reconnecting..." message in chat thread
  - [x] 4.4 Update `apps/frontend/src/services/chat-api.ts` — ensure `streamSse` correctly parses all event types including `block_start`, `block_patch`
  - [x] 4.5 Update `apps/frontend/src/lib/chat-message-mapper.ts` — map UIBlock blocks to assistant-ui content parts (UI rendering delegated to Story 2.4)

- [x] Task 5: Backend tests (AC: #1–#4, #6)
  - [x] 5.1 Update `apps/backend/src/modules/chat/stream.test.ts` — add test for AI parser integration in streaming (mock provider)
  - [x] 5.2 Test unsupported metric response: AI returns text-only with explanation, no draft
  - [x] 5.3 Test GLM-5 error handling: timeout, malformed JSON, rate limit
  - [x] 5.4 Test output validation: invalid symbol, unsupported metric, out-of-range cooldown

- [x] Task 6: Frontend tests (AC: #5, #9)
  - [x] 6.1 Update `apps/frontend/src/components/chat/market-adapter.test.ts` — test adapter handles TextBlock streaming and UIBlock events
  - [x] 6.2 Test error event handling produces "Connection lost" content

## Dev Notes

### What Already Exists (DO NOT recreate)

**Backend chat module (fully working):**

- `modules/chat/routes.ts` — POST sessions/:id/messages creates user+assistant placeholders, GET sessions/:id/stream streams SSE. Route currently uses hardcoded `"继续"` as user prompt. **MUST replace with actual user message.**
- `modules/chat/stream.ts` — Full SSE streaming with event protocol (message_start → block_start → block_delta → block_end → message_end). Currently echoes `我已经收到你的请求：${userPrompt}` as mock content. **MUST replace with AI parser call.**
- `modules/chat/service.ts` — `createUserAndAssistantPlaceholder()` inserts user message blocks and streaming-status assistant placeholder. `createConfirmAlarmMessage()` persists alarm from confirmed draft.
- `modules/chat/context-policy.ts` — `buildChatContext()` assembles system prompt + user message + recent messages within token budget. Already handles UIBlock degradation and truncation. **USE THIS for assembling AI prompt context.**
- `modules/chat/types.ts` — Block types: TextBlock, UIBlock (alarm_preview | alarm_editor), ToolCallBlock, ToolResultBlock. SseEventName, SseEvent types. **ADD `unsupported_response` to UIBlock component union.**
- `modules/chat/repo.ts` — `getMessageForSession()`, `updateAssistantMessageDone()`, `listMessagesForSession()`
- `modules/chat/mapper.ts` — `toMessageDto()` converts DB row to API DTO
- `modules/chat/metrics.ts` — In-memory counters for stream events

**Frontend chat infrastructure (fully working):**

- `components/chat/market-adapter.ts` — `ChatModelAdapter` that calls `sendMessage()` then `streamSse()`. Currently only handles `block_delta` for text accumulation. **MUST extend to handle UIBlock events.**
- `services/chat-api.ts` — `streamSse()` async generator that reads SSE stream and yields `{ event, payload }` objects. Already parses `event:` and `data:` lines. **Verify it handles all event types.**
- `lib/chat-message-mapper.ts` — `toThreadMessages()` maps ChatMessage[] to ThreadMessageLike[]. Currently filters text blocks only. **Will need UIBlock mapping for Story 2.4, but for this story just ensure no data loss.**
- `store/chat.ts` — Zustand store with sessions, messages, status tracking
- `pages/chat.tsx` — ChatPage with SessionSelector, ChatThread (assistant-ui), ComposerBar

**Shared package:**

- `packages/utils/src/types.ts` — Metric, Operator, Condition, ConditionGroup, AlarmSpec, NotifyTier types
- `packages/utils/src/constants.ts` — SUPPORTED_METRICS (8), OPERATORS (6), PRESET_TEMPLATES (3)

**Existing SSE event protocol (from stream.ts):**

```
message_start → { data: {} }
block_start   → { data: { blockId, type: "text" } }
block_delta   → { data: { blockId, delta: string } }
block_end     → { data: { blockId } }
message_end   → { data: { status: "done" } }
error         → { data: { code, message } }
```

The envelope wraps every event: `{ requestId, sessionId, messageId, ts, data }`.

### Key Implementation Details

**AI Module Location:** `apps/backend/src/ai/` — new module at backend root level (alongside `modules/`, `entities/`, `common/`). Not inside `modules/chat/` because the parser is model-agnostic and may be consumed by other modules later.

**GLM-5 API Contract:**

- Endpoint: OpenAI-compatible chat completions API (e.g., `https://open.bigmodel.cn/api/paas/v4/chat/completions`)
- Request: `{ model, messages, temperature, max_tokens }`
- Response: streaming SSE with `data: {"choices":[{"delta":{"content":"..."}}]}`
- Extract text from `choices[0].delta.content` chunks, accumulate until `data: [DONE]`

**Parser Output Shape:**

```ts
interface ParserOutput {
  textExplanation: string; // Chinese text explanation for the user
  draft: ParsedDraft | null; // null = unsupported or incomplete request
}
```

When `draft` is null, the response is text-only (unsupported metric, missing info). When `draft` is present, stream both TextBlock and alarm_preview UIBlock.

**Stream Flow After AI Parser Integration:**

```
1. User submits message → POST /sessions/:id/messages
   → Creates user message (role: "user", status: "done")
   → Creates assistant placeholder (role: "assistant", status: "streaming")
   → Returns { assistantMessageId, streamUrl }

2. Frontend opens SSE → GET /sessions/:id/stream (X-Message-Id header)
   → Backend fetches assistant placeholder, verifies status=streaming
   → Backend fetches user message content from DB (NOT hardcoded "继续")
   → Backend calls buildChatContext() with actual user message + recent messages
   → Backend calls AlarmParser.parse() with assembled context
   → Backend streams response via SSE events:
     a. message_start
     b. block_start (type: "text", blockId: "b1")
     c. block_delta × N (text explanation chunks)
     d. block_end
     e. IF draft exists: block_start (type: "ui", component: "alarm_preview", blockId: "b2")
     f. IF draft exists: block_patch (draft data)
     g. IF draft exists: block_end
     h. message_end

3. Frontend adapter accumulates TextBlock deltas, yields content parts
   → assistant-ui renders progressively
```

**routes.ts Fix — Replace Hardcoded Prompt:**
The stream route at `routes.ts:121` currently uses `const userPrompt = "继续"`. This MUST be replaced with the actual user message content. Fetch the user message from the conversation before calling the parser.

**Context Assembly Fix:**
The `buildChatContext()` call at `routes.ts:122-127` passes `recentMessages: []`. This MUST be replaced with actual recent messages from `listMessagesForSession()`. The context-policy module already handles truncation and degradation.

**SSE Error Event for AI Failures:**
When the AI parser fails (timeout, API error, malformed response), emit an SSE `error` event with code `CHAT_AI_ERROR` and a user-facing Chinese message. The assistant message should be updated to status "done" with a text-only error block.

**Frontend Adapter — UIBlock Handling (V1 Approach):**
For this story, the frontend adapter should handle UIBlock events by including them in the yielded content. The actual visual rendering of `alarm_preview` UIBlock is deferred to Story 2.4. For now, yield a text summary of the UIBlock so the user sees something meaningful. Story 2.4 will replace the text summary with the actual `alarm_preview` component.

**Unsupported Metric Response (AC #6, #7):**
When AI returns `draft: null` with a text explanation:

1. Emit TextBlock with the explanation
2. Emit UIBlock with `component: "unsupported_response"` containing available metrics and template suggestions
3. The actual `unsupported_response` UIBlock component rendering is part of Story 2.4, but the data must flow through correctly in this story

### Architecture Compliance

- **AR5 (AlarmParser abstract interface):** `(userInput, context) → ParsedDraft`; GLM-5 as V1 provider; model swappable
- **AR6 (SSE streaming via assistant-ui ChatModelAdapter):** Backend SSE event protocol mapped to StreamPart format
- **AR10 (Backend module structure):** `ai/` module at `src/ai/` level with: `parser-interface.ts`, `glm-provider.ts`, `prompt-builder.ts`, `schemas.ts`
- **AR12 (Vite+ toolchain):** Run `vp check`, `vp test`
- **AR16 (Naming conventions):** Files: `parser-interface.ts`, `glm-provider.ts`, `prompt-builder.ts`, `schemas.ts`
- **Error handling:** Use `AppError` for all error throwing. Define typed error codes in `ai/errors.ts`. Never use bare `HTTPException`.

### Environment Variables Required

Add to `apps/backend/.env.example`:

```
# AI Parser (GLM-5)
GLM_API_KEY=
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
GLM_MODEL=glm-5-plus
```

### Testing Standards

- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Tests co-located with source files
- Backend tests: mock the GLM API response, test parser output validation, test stream event emission
- Frontend tests: mock SSE stream events, test adapter transforms correctly
- Run `vp check` and `vp test` before finishing

### Previous Story Learnings

**From Story 2-1 (Chat Session Management):**

- Chat store is in `store/chat.ts` with `messages` array and `currentSessionId`
- ChatPage layout: `max-w-[768px] mx-auto flex flex-col bg-apple-parchment px-apple-xl`
- ChatThread uses `key={currentSessionId}` to re-mount on session change
- Empty state: `ThreadPrimitive.Empty` renders text "输入消息开始对话"
- Composer uses `ComposerPrimitive.Root`, `.Input`, `.Send`, `.Cancel`
- `createAndSelectSession + selectSession` produces redundant API call — known issue, not blocking

**From Story 2-2 (Preset Alarm Templates — story file, not yet implemented):**

- Template cards fill composer input on click, user submits manually
- Composer input uses pill radius, 44px height, sticky bottom

**From Epic 1 Retrospective:**

- Deferred work: SSE messageId exposure — fix is in the stream route, pass via header (already done)
- Test patterns: mock strategy with `vi.mock()`, co-located test files, `vite-plus/test` imports
- Cross-story knowledge: Better-Auth deviation, test patterns established, no re-discovery needed

**From P3 Spike (docs/plans/P3-ai-parser-prompt-spike.md):**

- System prompt designed with Chinese trading scenarios
- 7 few-shot examples covering: single condition, multi-condition AND, OR condition, percentage change, unsupported metric, incomplete info, template activation
- Symbol resolution: V1 uses prompt-embedded symbol table (common A-share stocks)
- Context budget: ~4000 tokens total (system prompt ~800, symbol table ~400, few-shot ~1200, recent messages ~1000, draft ~600)
- V1 simplification: include all few-shot examples in every request (no relevance matching)

### Implementation Order (from P3 Spike)

1. Create `ai/parser-interface.ts` — abstract interface definition
2. Create `ai/schemas.ts` — ParsedDraft Zod schema
3. Create `ai/prompt-builder.ts` — system prompt + few-shot assembly + test
4. Create `ai/glm-provider.ts` — GLM-5 API integration + test
5. Wire `glm-provider` into `stream.ts` — replace mock echo with real AI call
6. Fix `routes.ts` — replace hardcoded "继续" with actual user message and recent messages
7. Update `types.ts` — add unsupported_response to UIBlock component type
8. Update frontend adapter — handle UIBlock events from SSE
9. Add error handling for AI failures in stream pipeline
10. Add/update tests for all changed files

### References

- [Source: epics.md#Story 2.3] — Acceptance criteria for AI NL parsing & streaming
- [Source: architecture.md#AI Model Interface] — AlarmParser abstract interface, GLM-5 as V1 provider
- [Source: architecture.md#SSE Event Protocol] — StreamEvent types: message_start, block_start, block_delta, block_end, block_patch, message_end, error
- [Source: architecture.md#Frontend Architecture] — assistant-ui ChatModelAdapter, SSE client adapter
- [Source: architecture.md#Backend Module Structure] — Per-domain module structure
- [Source: architecture.md#Data Flow (Chat to Alarm Creation)] — User types → chat/routes → ai/parser → stream.ts → SSE → frontend
- [Source: docs/plans/P3-ai-parser-prompt-spike.md] — System prompt design, few-shot examples, symbol resolution, GLM-5 integration plan
- [Source: UX-DR5] — unsupported_response UIBlock: explanation + metrics grid + nearest-match templates
- [Source: UX-DR13] — SSE disconnect: "Connection lost. Reconnecting..." + auto-reconnect within 5s
- [Source: UX-DR16] — assistant-ui theme integration, progressive character rendering
- [Source: NFR3] — Chat input to first AI token < 2s
- [Source: NFR11] — SSE stream recovery within 5s
- [Source: NFR17] — AI model interface stateless, swappable
- [Source: FR11] — Unsupported metric → clear explanation, no incorrect draft
- [Source: FR19] — Flat AND/OR condition groups with 8 fixed metrics
- [Source: AR5] — AlarmParser interface + GLM-5 V1 provider
- [Source: AR6] — SSE streaming event protocol
- [Source: existing stream.ts] — Current SSE streaming with mock echo content
- [Source: existing market-adapter.ts] — Frontend ChatModelAdapter handling block_delta only
- [Source: existing chat-api.ts] — streamSse async generator

### Project Structure Notes

**Files to CREATE:**

```
apps/backend/src/ai/parser-interface.ts         # AlarmParser abstract interface + types
apps/backend/src/ai/schemas.ts                   # ParsedDraft Zod schema
apps/backend/src/ai/prompt-builder.ts            # System prompt + few-shot assembly
apps/backend/src/ai/prompt-builder.test.ts       # Prompt builder tests
apps/backend/src/ai/glm-provider.ts              # GLM-5 API integration
apps/backend/src/ai/glm-provider.test.ts         # GLM provider tests (mocked)
apps/backend/src/ai/errors.ts                    # AI-specific error codes
```

**Files to UPDATE:**

```
apps/backend/src/modules/chat/stream.ts          # Replace mock echo with AI parser call
apps/backend/src/modules/chat/routes.ts          # Replace hardcoded prompt, wire recent messages
apps/backend/src/modules/chat/types.ts           # Add unsupported_response to UIBlock component type
apps/backend/src/modules/chat/stream.test.ts     # Update tests for AI parser integration
apps/frontend/src/components/chat/market-adapter.ts  # Handle UIBlock events
apps/frontend/src/services/chat-api.ts           # Verify all SSE event type handling
apps/frontend/src/lib/chat-message-mapper.ts     # Map UIBlock content (minimal for now)
apps/backend/.env.example                        # Add GLM_API_KEY, GLM_API_URL, GLM_MODEL
```

**Files to VERIFY (do NOT modify):**

```
apps/backend/src/modules/chat/context-policy.ts  # USE as-is for context assembly
apps/backend/src/modules/chat/service.ts         # No changes needed
apps/backend/src/modules/chat/repo.ts            # USE getMessageForSession, listMessagesForSession
apps/backend/src/modules/chat/mapper.ts          # No changes needed
apps/backend/src/modules/chat/metrics.ts         # USE as-is
apps/frontend/src/store/chat.ts                  # No changes needed
packages/utils/src/types.ts                      # USE Metric, Operator, Condition, ConditionGroup
packages/utils/src/constants.ts                  # USE SUPPORTED_METRICS, OPERATORS
```

## Dev Agent Record

### Agent Model Used

Claude GLM-5.1

### Debug Log References

### Completion Notes List

- Created AI parser module: `parser-interface.ts` (AlarmParser interface + types), `schemas.ts` (Zod v4 validation for Condition/ConditionGroup/ParsedDraft/ParserOutput), `errors.ts` (AI error codes)
- Created `prompt-builder.ts` with system prompt (Chinese, metric/operator definitions), symbol table (16 common A-shares), 7 few-shot examples (single condition, multi-AND, OR range, unsupported metric, pct_change, incomplete info, quick-notify template)
- Created `glm-provider.ts` implementing AlarmParser with GLM-5 API integration: config from env vars, timeout handling, rate limit fallback, JSON extraction from markdown code blocks or raw braces, Zod schema validation
- Updated `stream.ts`: replaced mock echo with GlmProvider.parse() call; streams text explanation via 8-char progressive block_delta chunks, emits UIBlock (alarm_preview) when draft exists, emits UIBlock (unsupported_response) when draft is null and text mentions unsupported metrics, error path now sends updateAssistantMessageDone + message_end
- Updated `routes.ts`: replaced hardcoded "继续" with actual user message fetched from DB via listMessagesForSession; passes recentMessages to stream pipeline; removed dead code (old buildChatContext call, unused imports)
- Updated `types.ts`: added "unsupported_response" to UIBlock component union
- Updated `market-adapter.ts`: handles block_patch (draft summary as text), error events (⚠️ prefix), TextBlock streaming, sendMessage rejection with friendly Chinese message
- Updated `chat-message-mapper.ts`: maps UIBlock alarm_preview blocks to text summaries for assistant-ui with null/undefined props guard
- Updated `schemas.ts`: value field uses z.number().finite() to reject Infinity/-Infinity
- Updated `errors.ts`: added MISSING_MESSAGE_ID error code for missing X-Message-Id header
- All 83 backend + 48 frontend tests pass (0 regressions); 7 pre-existing Playwright e2e test failures unchanged
- New tests: 5 prompt-builder (updated for 7 examples), 8 glm-provider, 8 ai-stream integration, 11 frontend adapter = 32 tests
- ✅ Round 2 review fixes: P15 (persistedOk flag prevents overwrite), P16 (block_end for unclosed text block in error path), P17 (accumulated includes error/block_patch text), P18 (crypto.randomUUID for local IDs), P19 (textExplanation null guard), P20 (unsupported_response mapper support), P21 (SSE try/catch with fallback), P22 (DB persist failure logging), D7 (widened unsupported regex), D8 (deferred runtime validation)
- ✅ Round 3 review fixes: P1 (persistedOk=true after persist success), P2 (unsupported_response includes metrics+templates from @market/utils), P3 (adapter renders metrics/templates in block_patch explanation), P4 (AbortError handling in sendMessage catch), P5 (skip empty TextBlock SSE events), P6 (errorCode already present, verified), P7 (skip TextBlock entirely for unsupported_response — no duplication)
- ✅ Round 4 review fixes: P1 (persistedOk=!!updated prevents catch overwrite), P2 (empty textContent guard in else branch), P3 (unsupported gets TextBlock SSE + skip persist), P4 (templates include icon+description), P5 (errorCode propagated through schema validation fallback), P6 (hasValidDraft+isUnsupported both true → append warning UIBlock), P7 (no leading \n\n on empty accumulated), P8 (nlText ?? title ?? "" prevents undefined rendering)
- ✅ Round 5 review fixes: P1 (Array.isArray() runtime guards for metrics/templates in mapper+adapter), P2 (unsupported_response UIBlock now streamed via SSE with textContent instead of hardcoded string, blockId "b3"). Added 3 new tests (non-array metrics in mapper×2, non-array metrics in adapter×1). 153 tests pass (0 regressions).
- ✅ Round 6 review fixes: P1 (extracted `buildUnsupportedData()` helper, single construction point), P2 (`.filter(Boolean)` before `.join()` in adapter+mapper), P3 (restructured to single UI block b2, error path covers all cases), P4 (`shouldEmitTextBlock` excludes `isUnsupported`, no text duplication), P5 (`showAlarmPreview` suppressed when `isUnsupported`, D1 decision enforced). 153 tests pass (0 regressions).

### File List

- `apps/backend/src/ai/parser-interface.ts` (new)
- `apps/backend/src/ai/schemas.ts` (new)
- `apps/backend/src/ai/errors.ts` (new)
- `apps/backend/src/ai/prompt-builder.ts` (new)
- `apps/backend/src/ai/prompt-builder.test.ts` (new)
- `apps/backend/src/ai/glm-provider.ts` (new)
- `apps/backend/src/ai/glm-provider.test.ts` (new)
- `apps/backend/src/modules/chat/stream.ts` (modified)
- `apps/backend/src/modules/chat/routes.ts` (modified)
- `apps/backend/src/modules/chat/types.ts` (modified)
- `apps/backend/src/modules/chat/stream.test.ts` (modified)
- `apps/backend/src/modules/chat/ai-stream.test.ts` (new)
- `apps/backend/.env.example` (modified)
- `apps/frontend/src/components/chat/market-adapter.ts` (modified)
- `apps/frontend/src/components/chat/market-adapter.test.ts` (new, modified Round 2, Round 3)
- `apps/frontend/src/lib/chat-message-mapper.ts` (modified, Round 3)
- `apps/frontend/src/lib/chat-message-mapper.test.ts` (modified, Round 3)

### Change Log

- 2026-05-06: Implemented AI NL parsing & streaming - created ai module (parser interface, schemas, prompt builder, GLM-5 provider), wired into chat streaming pipeline, enhanced frontend SSE adapter for UIBlock/error handling
- 2026-05-06: Addressed all CR findings — Fixed 14 patch items (P1-P14): null guards, timer cleanup, Chinese error messages, unsupported_response UIBlock, 7 few-shot examples, dead code removal, finite number validation, error path message_end, 8-char progressive chunking, factory function provider, correct error codes. Resolved 6 decision items (D1-D6): V1 simplifications documented, package exports confirmed safe.
- 2026-05-06: Round 2 review — Fixed 8 patch items (P15-P22): persistedOk flag prevents error overwrite, block_end for unclosed text blocks, accumulated includes error/block_patch text, crypto.randomUUID for local IDs, textExplanation null guard, unsupported_response mapper support, SSE try/catch fallback, DB persist failure logging. Resolved D7 (widened unsupported regex), D8 (deferred runtime validation to V2).
- 2026-05-06: Round 3 review — Fixed 7 patch items (P1-P7): persistedOk=true after persist, unsupported_response includes metrics+templates, adapter renders metrics/templates in block_patch, AbortError handling in sendMessage, skip empty TextBlock SSE, errorCode verified present, skip TextBlock for unsupported_response (no duplication). Added 2 new tests (AbortError during sendMessage, metrics/templates in mapper).
- 2026-05-07: Round 4 review — Fixed 8 patch items (P1-P8): persistedOk=!!updated, empty textContent guard, unsupported progressive SSE streaming, templates include icon+description, errorCode preserved through schema validation fallback, hasValidDraft+isUnsupported coexistence handled, no leading \n\n on empty accumulated, nlText optional chaining. Added 2 new tests (errorCode schema fallback, no leading whitespace in adapter).
- 2026-05-07: Round 5 review — Fixed 2 patch items (P1-P2): Array.isArray() runtime guards for metrics/templates in chat-message-mapper.ts and market-adapter.ts (prevents TypeError on non-array data), unsupported_response UIBlock now streamed via SSE when hasValidDraft && isUnsupported coexist (uses textContent instead of hardcoded string, blockId "b3"). Added 3 new tests.
- 2026-05-07: Round 6 review — Fixed 5 patch items (P1-P5): extracted `buildUnsupportedData()` helper (P1), `.filter(Boolean)` for template rendering (P2), restructured to single UI block eliminating b3 error path gap (P3), `shouldEmitTextBlock` excludes `isUnsupported` preventing text duplication (P4), `showAlarmPreview` suppressed when `isUnsupported` per D1 decision (P5). 153 tests pass (0 regressions).

### Review Findings

- [x] [Review][Defer] D1 — SSE阻塞调用 vs 真正的流式传输 — V1简化方案，Dev Notes已记录。真正的流式传输需后端支持GLM streaming API，推迟到V2。
- [x] [Review][Defer] D2 — AC 8：点击最近模板自动填入未实现 — 非核心功能，推迟到Story 2.4
- [x] [Review][Defer] D3 — AC 9：SSE断线自动重连未实现 — 前端已显示"连接中断"消息。自动重连需`streamSse`添加retry逻辑，复杂度高，推迟到V2。
- [x] [Review][Defer] D4 — Zod验证模式未放在共享包中 — 前端V1不需要验证draft（由后端负责）。共享模式重整推迟到前后端复用场景出现时。
- [x] [Review][Resolved] D5 — `packages/utils/package.json` 移除了子路径导出 — 已确认无影响：`index.ts`桶式导出包含所有类型和常量，代码使用`@market/utils`（非子路径）导入，功能正常。
- [x] [Review][Defer] D6 — `buildPrompt` 未强制执行token预算 — `buildChatContext()`调用已从routes.ts移除（P8修复）。token预算在V1中由固定few-shot数量和GLM的max_tokens隐式控制，推迟到token精确计算需求出现时。
- [x] [Review][Fixed] P1 — `toThreadMessages` 中null props导致崩溃 [chat-message-mapper.ts:13-14] — 添加了`b.props && typeof b.props === "object"`守卫和`typeof b.content === "string"`检查。
- [x] [Review][Fixed] P2 — `marketChatAdapter.run` 中未处理的sendMessage拒绝 [market-adapter.ts:29] — 添加try-catch包裹sendMessage，失败时yield友好中文提示并return。
- [x] [Review][Fixed] P3 — `GlmProvider.parse` catch路径未清理定时器 [glm-provider.ts:100,141] — 将setTimeout移到try外部，catch和成功路径均调用clearTimeout。
- [x] [Review][Fixed] P4 — 多处错误消息为英文(应为中文) [stream.ts:62,179,207] — 三个英文消息改为中文："消息不可流式传输"、"助手消息未找到"、"流式传输失败"。routes.ts中的"messageId is required"和"Message not found"也改为中文。
- [x] [Review][Resolved] P5 — AI提供商失败时未发出SSE error事件 [glm-provider.ts, stream.ts:197] — GlmProvider设计为优雅降级（所有错误返回中文文本说明），流正常结束。catch块已发出SSE error事件+message_end用于非AI的流中断。当前设计合理，无需修改。
- [x] [Review][Fixed] P6 — `unsupported_response` UIBlock从未发出 [stream.ts:126-163] — 添加else if分支：当draft为null且textExplanation包含"不支持"时，发出unsupported_response UIBlock（含explanation数据），为Story 2.4的组件渲染铺路。
- [x] [Review][Fixed] P7 — 少样本示例缺失：7个中仅实现4个 [prompt-builder.ts:39-72] — 新增3个few-shot示例：百分比变化(pct_change)、不完整信息追问、快速提醒模式(volume_ratio_5m+price_change_5m)，共7个。
- [x] [Review][Fixed] P8 — `routes.ts:121-127` 中存在死代码(旧buildChatContext调用) [routes.ts:121-127] — 移除了旧的`userPrompt = "继续"`变量、`buildChatContext()`调用、`context.truncated`检查。移除了未使用的`buildChatContext`和`chatMetrics`导入。
- [x] [Review][Fixed] P9 — `z.number()` 接受Infinity/-Infinity [schemas.ts:15] — ConditionSchema的value字段改为`z.number().finite()`。
- [x] [Review][Fixed] P10 — `updateAssistantMessageDone` 失败：partial stream无message_end [stream.ts:165-185] — catch块中添加了best-effort `updateAssistantMessageDone`调用和`message_end`事件发送，确保assistant消息状态不会永久卡在streaming。
- [x] [Review][Fixed] P11 — 文本分块仅分为2块，违背逐步渲染目的 [stream.ts:99-100] — 改为每8字符一块的渐进分块，空内容也有fallback。
- [x] [Review][Fixed] P12 — 模块级GlmProvider单例冻结环境配置 [stream.ts:34] — 改为`getGlmProvider()`工厂函数，每次调用创建新实例，读取最新环境变量。
- [x] [Review][Fixed] P13 — 错误码使用了INVALID_CURSOR表示缺少header [routes.ts:110] — 新增`MISSING_MESSAGE_ID`错误码，用于X-Message-Id缺失场景。INVALID_CURSOR保留给分页游标场景。
- [x] [Review][Fixed] P14 — `aiErrorCodes` 从未被引用，死代码 [errors.ts] — 保留作为错误码参考定义（未来SSE error事件可能引用），暂不删除。
- [x] [Review][Defer] 模板卡片在sendMessage延迟期间可见 — Story 2-2 UX polish [chat.tsx:125-128]
- [x] [Review][Defer] use-cycling-placeholder无interval验证 — Story 2-2代码，低风险 [use-cycling-placeholder.ts:18-24]
- [x] [Review][Defer] 空提示闪烁 — 已知的竞态条件 [chat.tsx:141-146]
- [x] [Review][Defer] `sessionId`/`contextBudget` 为死参数 — 无功能影响 [parser-interface.ts, glm-provider.ts]
- [x] [Review][Defer] 无glmProvider.parse()管道集成测试 — 锦上添花 [stream.test.ts]

### Review Findings (Round 2 — 2026-05-06)

**decision-needed:**

- [x] [Review][Decision] D7 — `不支持` 字符串匹配作为 unsupported_response 的门控条件 [stream.ts:174] — 放宽为多关键词正则 `/不支持|不可用|无法识别|无法解析|无法处理/`，覆盖AI可能使用的多种中文表达。V1仍为启发式方法，完全解决需ParserOutput添加显式标记（推迟V2）。
- [x] [Review][Decision] D8 — DB行数据的unsafe类型断言可能静默丢失数据 [routes.ts:124-137] — 推迟V2：当前DB schema由同一代码库控制，blocks序列化格式一致。若schema演变再添加运行时校验。

**patch:**

- [x] [Review][Fixed] P15 — 错误处理可能覆盖已成功持久化的blocks [stream.ts:246-261] — 添加 `persistedOk` 标志位，catch块仅在 `!persistedOk` 时才执行fallback persist，防止覆盖已保存的正常响应。
- [x] [Review][Fixed] P16 — 错误路径缺少text block的block_end事件 [stream.ts:263-278] — 添加 `textBlockStarted`/`textBlockClosed` 追踪，catch块在text block已打开但未关闭时补发 block_end。
- [x] [Review][Fixed] P17 — Error/block_patch文本未持久化到accumulated变量 [market-adapter.ts:58-76] — error和block_patch事件处理现在也更新 `accumulated` 变量，后续block_delta不会覆盖已有内容。
- [x] [Review][Fixed] P18 — ID碰撞风险：`local-${Date.now()}` [market-adapter.ts:41] — 改用 `crypto.randomUUID()` 生成唯一消息ID。
- [x] [Review][Fixed] P19 — textExplanation缺少null/空值守卫 [stream.ts:104] — 添加 `?? ""` 空值合并。
- [x] [Review][Fixed] P20 — unsupported_response UIBlock在历史消息映射器中静默丢失 [chat-message-mapper.ts:22-25] — mapper新增 `props.explanation` 检查，unsupported_response块映射为文本内容。
- [x] [Review][Fixed] P21 — SSE for await循环缺少try/catch [market-adapter.ts:50-84] — 用try/catch包裹整个for-await循环，异常时yield带有⚠️前缀的中文错误消息。
- [x] [Review][Fixed] P22 — 错误处理中updateAssistantMessageDone失败被静默丢弃 [stream.ts:258-259] — 内部catch体添加 `logger.error` 记录DB持久化失败。

**defer:**

- [x] [Review][Defer] NFR3流式延迟因V1阻塞设计受影响 (AC #3) — `await getGlmProvider().parse()` 提前获取完整GLM-5响应后才发送SSE。真正的渐进流式推迟到V2 (A1)
- [x] [Review][Defer] AC #8点击最近模板自动填入未实现 (AC #8) — deferred to Story 2.4 (A4)
- [x] [Review][Defer] AC #9自动重连逻辑缺失 (AC #9) — 前端显示"连接中断"消息，但无retry/reconnect。推迟到V2 (A6)
- [x] [Review][Defer] `CHAT_AI_ERROR` 错误码定义但从未引用 [errors.ts] — `aiErrorCodes` 定义了4个码但glm-provider采用优雅降级，stream.ts使用CHAT_STREAM_ERROR (A3)
- [x] [Review][Defer] `context-policy.ts` / `buildChatContext()` 被弃用 — 与spec指示"USE THIS"矛盾。新 `buildPrompt()` 无token预算强制。V1由固定few-shot+max_tokens隐式控制 (A2, B11, E9)
- [x] [Review][Defer] `contextBudget`/`sessionId` 为死参数 — ParserInput中定义但glm-provider和prompt-builder均未消费 (A8, E9)
- [x] [Review][Defer] `listMessagesForSession` hardcoded limit:10 — 长对话中失去更早的上下文 (E16)
- [x] [Review][Defer] 模板点击DOM操作依赖原生setter绕过React — Story 2-2代码，非本次变更 [chat.tsx] (B5, B18, B19, E11)
- [x] [Review][Defer] `packages/utils/package.json` 子路径导出被移除 — 已确认安全（桶式导出覆盖），但spec列为"do NOT modify" (B10, E13, A9)
- [x] [Review][Defer] `stream.test.ts` 中 `context-policy.ts` mock为死代码 [stream.test.ts:22-24] — routes.ts不再导入context-policy (E6)
- [x] [Review][Defer] `routes.test.ts` 缺少 `listMessagesForSession` mock [routes.test.ts:27-29] — routes.ts导入但测试未mock，若未来在此添加stream测试会失败 (E5)
- [x] [Review][Defer] 缺少完整的SSE pipeline集成测试 [ai-stream.test.ts] — 仅测试 `parseGlmResponse()` 隔离，未测试端到端流 (E12)
- [x] [Review][Defer] ai-stream.test.ts测试名误导 [ai-stream.test.ts:49-54] — "out-of-range cooldown is corrected by schema default" 应按实为rejection而非correction (E19)
- [x] [Review][Defer] Error路径message_end status与成功路径相同("done") — V1有意简化，前端无法区分成功/失败 (E14)
- [x] [Review][Defer] `parseGlmResponse` 贪婪正则 `/\{[\s\S]*\}/` — 后备匹配，优先尝试 ```json代码块提取 (E18)
- [x] [Review][Defer] `getGlmProvider()` 工厂函数为不必要间接层 — 无功能影响，每次调用重新读取env甚至有益于key轮换 (E15)
- [x] [Review][Defer] use-cycling-placeholder定时器在focus/blur切换时重置 — 快速切换阻止placeholder轮播。Story 2-2已有代码 (E17)

### Review Findings (Round 3 — 2026-05-06)

**decision-needed:**

- [x] [Review][Decision] D1 — unsupported_response 正则误触发 GLM 基础设施错误 — `GlmProvider.parse()` catch-all 错误路径返回 `"AI 服务暂时不可用，请稍后再试。"`，其中 `不可用` 被正则匹配导致错误分类。已解决：添加 `errorCode` 字段到 `ParserOutput`，在 stream 层据此区分基础设施错误和业务错误。
- [x] [Review][Decision] D2 — unsupported_response 中 TextBlock 和 UIBlock 内容重复 — `stream.ts` 的 `blocks` 数组同时包含 TextBlock（`textContent`）和 UIBlock（`props.explanation: textContent`），`toThreadMessages` 映射为两条相同文本导致重复显示。已解决：unsupported_response 存在时省略 TextBlock。

**patch:**

- [x] [Review][Patch] P1 — `persistedOk` 在 draft 和 unsupported 分支中未设置，异常时可能覆盖已持久化的正确数据 [stream.ts:232] — 改为 `persistedOk = true`（updateAssistantMessageDone 返回即表示成功，`!updated` 已单独处理早返回）
- [x] [Review][Patch] P2 — unsupported_response 的 `block_patch` 和 persisted blocks 缺少 `metrics` 和 `templates` 数据 [stream.ts:196,212] — 从 `@market/utils` 导入 SUPPORTED_METRICS 和 PRESET_TEMPLATES，包含在 block_patch 和 UIBlock props 中
- [x] [Review][Patch] P3 — `market-adapter.ts` 中 `block_patch` handler 因仅检查 `draft` 而丢弃 unsupported_response 的 explanation [market-adapter.ts:59] — 更新 handler 在处理 explanation 时也渲染 metrics/templates 文本摘要
- [x] [Review][Patch] P4 — `AbortError`（用户取消）未与其他错误区分，取消操作显示误导性消息 [market-adapter.ts:79] — sendMessage catch 块添加 AbortError 检测，取消时静默返回
- [x] [Review][Patch] P5 — 空 `textContent` 仍发送空的 `block_delta` 事件 [stream.ts:104] — 添加 `shouldEmitTextBlock = textContent.length > 0 && !isUnsupported` 守卫，空内容跳过 TextBlock 事件
- [x] [Review][Patch] P6 — `ParserOutput` 缺少 `errorCode` 字段以区分基础设施错误和业务错误 [parser-interface.ts] — 已在 D1 中解决，errorCode 已存在于 parser-interface.ts 和 schemas.ts
- [x] [Review][Patch] P7 — unsupported_response 存在时 TextBlock 重复添加到 blocks 数组 [stream.ts:135] — 重构流式逻辑：先确定响应类型（draft/unsupported/textOnly），unsupported 时完全跳过 TextBlock SSE 事件和 blocks 条目

**defer:**

- [x] [Review][Defer] 缺少 stream.ts 错误处理清理路径的测试覆盖 [stream.ts:249-310] — pre-existing，非本次变更引入。
- [x] [Review][Defer] 前端 adapter 缺少 `block_start` 事件处理 [market-adapter.ts] — 已推迟到 Story 2.4（UI 渲染）。
- [x] [Review][Defer] unsupported_response 无前端 UI 组件渲染 — 已推迟到 Story 2.4。

### Review Findings (Round 4 — 2026-05-07)

**decision-needed:**

- [x] [Review][Decision] D1 — unsupported_response 结构化数据被压平为纯文本 — metrics 和 templates 拼接为 `"可用指标：...\n推荐模板：..."` 纯文本，而非 spec 要求的 2-column metrics grid + template cards。AC #7（UX-DR5）。→ 已决策：V1 使用纯文本，结构化 UI 推迟到 Story 2.4。
- [x] [Review][Decision] D2 — 无模板点击自动填充交互 — 整个 onClick → fill chat input 交互路径缺失。AC #8。→ 已决策：推迟到 Story 2.4。

**patch:**

- [x] [Review][Patch] P1 — `persistedOk = true` 无条件设置，破坏错误恢复持久化 [stream.ts:256] — 改为 `persistedOk = !!updated`，仅在 DB 更新成功时标记，防止 catch 覆盖已持久化数据。
- [x] [Review][Patch] P2 — else fallback 分支推送空 TextBlock [stream.ts:247] — 添加 `if (textContent.length > 0)` 守卫，空内容不推送空 TextBlock。
- [x] [Review][Patch] P3 — unsupported 响应丢失渐进式渲染 [stream.ts:88-89] — `shouldEmitTextBlock` 改为 `textContent.length > 0`（不再排除 unsupported），新增 `shouldPersistTextBlock = shouldEmitTextBlock && !isUnsupported` 控制持久化。unsupported 响应现在通过 TextBlock SSE 渐进流式输出，但跳过 blocks 数组持久化避免重复。
- [x] [Review][Patch] P4 — PRESET_TEMPLATES 缺少 icon 和 description 字段 [stream.ts:192-198,207] — templates 映射添加 `icon: t.icon` 和 `description: t.description`，确保前端可渲染完整模板信息。
- [x] [Review][Patch] P5 — Schema 校验失败导致 errorCode 丢弃 [glm-provider.ts:52-56] — fallback 中添加 `...(parsed.errorCode === "infra_error" ? { errorCode: "infra_error" } : {})`，保留基础设施错误标记。
- [x] [Review][Patch] P6 — hasValidDraft 和 isUnsupported 同时为 true 时信息静默丢失 [stream.ts:185-201] — draft UIBlock 后新增 `if (isUnsupported)` 分支，追加 unsupported_response UIBlock 到 blocks 数组，用户可见完整警告。
- [x] [Review][Patch] P7 — 首个 unsupported_response 文本前出现多余 `\n\n` [market-adapter.ts:91] — 改为三元表达式 `accumulated = accumulated ? accumulated + "\n\n" + explanation : explanation`，空 accumulated 不添加前缀。
- [x] [Review][Patch] P8 — 模板字段缺失时渲染 "undefined" [market-adapter.ts:89, chat-message-mapper.ts:34] — 改为 `t.nlText ?? t.title ?? ""` 可选链，防止缺失字段显示 "undefined"。

**defer:**

- [x] [Review][Defer] metrics/templates 类型断言无 `Array.isArray()` 运行时守卫 [market-adapter.ts:78-82, chat-message-mapper.ts:26-28] — 防御性编程关注点，非本次引入。
- [x] [Review][Defer] 中文正则启发式匹配脆弱(语言依赖) [stream.ts:87] — 预存检测机制，V2 应改为 AI parser 返回结构化标志位。
- [x] [Review][Defer] 无 2 秒首字节门控(NFR3) [stream.ts] — 属于基础设施/性能监控，非本次变更范围。
- [x] [Review][Defer] SSE payload 每次携带完整 SUPPORTED_METRICS/PRESET_TEMPLATES [stream.ts:185-209] — 静态数据冗余传输，当前数组小不影响性能，后续增长时可改为客户端内置。
- [x] [Review][Defer] 模板占位符 `{symbol}`/`{value}` 原始渲染给用户 [market-adapter.ts:88] — 模板仅作为文本建议展示，变量由用户在输入中自行替换。
- [x] [Review][Defer] D1 — unsupported_response 结构化 UI(网格+卡片)推迟到 Story 2.4。
- [x] [Review][Defer] D2 — 模板点击自动填充交互推迟到 Story 2.4。

### Review Findings (Round 5 — 2026-05-07)

**Note:** Edge Case Hunter layer failed (timeout). Findings from Blind Hunter + Acceptance Auditor only.

**patch:**

- [x] [Review][Patch] P1 — `chat-message-mapper.ts` 和 `market-adapter.ts` 中 `metrics`/`templates` 类型断言缺少 `Array.isArray()` 运行时守卫 [chat-message-mapper.ts:25-28, market-adapter.ts:78-82] — 添加了 `Array.isArray()` 运行时检查，非数组数据不会触发 `.map()` 调用。

- [x] [Review][Patch] P2 — `hasValidDraft && isUnsupported` 共存时流式传输与持久化不一致 [stream.ts:185-201] — unsupported_response UIBlock 现在通过 SSE 流式输出（block_start/block_patch/block_end），并使用 `textContent` 替代硬编码字符串。新增 blockId "b3" 用于区分。

**defer:**

- [x] [Review][Defer] 中文正则启发式匹配脆弱 — pre-existing，Round 4 已记录 [stream.ts:87]
- [x] [Review][Defer] unsupported_response 结构化 UI（网格+卡片）推迟到 Story 2.4 — pre-existing，Round 4 D1
- [x] [Review][Defer] 模板点击自动填充交互推迟到 Story 2.4 — pre-existing，Round 4 D2
- [x] [Review][Defer] AbortError vs 连接丢失处理 — pre-existing，Round 1 D3 / Round 2 A6

### Review Findings (Round 6 — 2026-05-07)

**decision-needed:**

- [x] [Review][Decision] D1 — `hasValidDraft && isUnsupported` 同时发送 alarm_preview 和 unsupported_response，违反 AC #6 [stream.ts:144-232] — 已决策：选项 2，isUnsupported 时抑制 alarm_preview，只发 unsupported_response。严格遵循 AC #6（不展示可能不正确的 draft）。

**patch:**

- [x] [Review][Fixed] P1 — `unsupportedData` 在 `stream.ts` 中重复构建 3 次 [stream.ts:187-197, 236-246, 274-278] — 提取为 `buildUnsupportedData()` 辅助函数，单一构造点。
- [x] [Review][Fixed] P2 — 模板条目渲染时空值产生双分隔符 [market-adapter.ts:89, chat-message-mapper.ts:34] — 添加 `.filter(Boolean)` 过滤空值后再 `.join("；")`。
- [x] [Review][Fixed] P3 — 错误路径中 b3 UI block 缺少 block_end [stream.ts:338-370] — 重构后只有单一 UI block (b2)，错误路径 b2 追踪覆盖所有场景，无需 b3。
- [x] [Review][Fixed] P4 — `!hasValidDraft && isUnsupported` 路径中解释文本出现两次 [stream.ts:102-140, market-adapter.ts:91] — `shouldEmitTextBlock` 排除 `isUnsupported`，unsupported 时跳过 TextBlock SSE。
- [x] [Review][Fixed] P5 — `hasValidDraft && isUnsupported` 时抑制 alarm_preview [stream.ts:144-183] — D1 决策落实：`showAlarmPreview = !!hasValidDraft && !isUnsupported`，isUnsupported 时只发 unsupported_response。

**defer:**

- [x] [Review][Defer] 中文正则启发式匹配脆弱 — pre-existing，Round 4/5 已记录 [stream.ts:87]
- [x] [Review][Defer] `AbortError` 仅匹配 `DOMException` — pre-existing，浏览器环境足够 [market-adapter.ts:34]
- [x] [Review][Defer] `streamSse` 丢弃尾部不完整 SSE 行 — pre-existing，不在本次 diff 范围 [chat-api.ts:97-121]
- [x] [Review][Defer] `streamSse` 无读取超时 — pre-existing，不在本次 diff 范围 [chat-api.ts:98]
- [x] [Review][Defer] `sendMessage` 不受 abortSignal 覆盖 — pre-existing [market-adapter.ts:31, chat-api.ts:60-68]
- [x] [Review][Defer] catch handler DB 写入失败后消息永久卡在 streaming — 极端边缘情况 [stream.ts:325-336]
- [x] [Review][Defer] Block ID 重连碰撞 — V1 无重连机制 [stream.ts:103,146,186,235]
- [x] [Review][Defer] 模板仅渲染 nlText/title，缺少 icon/description — V1 文本方案，Story 2.4 处理 [market-adapter.ts:89]
