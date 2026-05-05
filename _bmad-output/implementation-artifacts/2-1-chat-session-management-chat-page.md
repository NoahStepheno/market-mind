# Story 2.1: Chat Session Management & /chat Page

Status: done

## Story

As a logged-in user,
I want to create and switch between chat sessions and view message history,
so that I can organize my alarm creation conversations.

## Acceptance Criteria

1. **Given** the chat_sessions and chat_messages tables exist with user-scoped rows **When** a logged-in user visits /chat **Then** the system auto-creates a chat session if none exists (POST /chat/sessions) **And** the /chat page renders with max-width 768px centered layout on parchment background per UX-DR9.

2. **Given** the /chat page is rendered **When** the page loads with assistant-ui integration **Then** the chat container displays with "calm workshop" theme: parchment thread background, SF Pro typography, minimal composer styling, Action Blue send button per UX-DR16.

3. **Given** a logged-in user on /chat **When** the user clicks the chat session selector **Then** the system displays a list of past chat sessions (GET /chat/sessions) scoped to the current user per FR5.

4. **Given** a user selects a past chat session **When** the session loads **Then** the system fetches and displays all messages in chronological order (GET /chat/sessions/:id/messages) with user and assistant messages rendered distinctly per FR10.

5. **Given** a chat session with existing messages **When** the user scrolls through the conversation **Then** messages are loaded with pagination and rendered without layout shift.

6. **Given** a chat session with no messages (new session) **When** the /chat page loads **Then** only the input field is visible — no "no messages" prompt per UX-DR19. Template cards area is left as a placeholder for Story 2.2.

## Tasks / Subtasks

- [x] Task 1: Create chat zustand store (AC: #3, #4, #5)
  - [x] 1.1 Create `apps/frontend/src/store/chat.ts` — zustand store following AR11 pattern (XyzState + XyzActions + persist)
  - [x] 1.2 State shape: `sessions: ChatSession[]`, `currentSessionId: string | null`, `messages: ChatMessage[]`, `sessionsStatus: "idle" | "loading" | "success" | "error"`, `messagesStatus: "idle" | "loading" | "success" | "error"`, `messagesCursor: string | null`, `hasMoreMessages: boolean`
  - [x] 1.3 Actions: `loadSessions()`, `createAndSelectSession()`, `selectSession(id)`, `loadMessages(sessionId, cursor?)`, `addLocalMessage(msg)`, `clearCurrentSession()`
  - [x] 1.4 `loadSessions()` calls `listSessions()` from chat-api, populates `sessions`
  - [x] 1.5 `selectSession(id)` sets `currentSessionId`, calls `loadMessages(id)` to fetch messages
  - [x] 1.6 `loadMessages(sessionId, cursor?)` calls `listMessages(sessionId, 50, cursor)`, appends to `messages` on pagination, sets `messagesCursor` and `hasMoreMessages`
  - [x] 1.7 `createAndSelectSession()` calls `createSession()`, adds to `sessions`, sets as `currentSessionId`, clears `messages`
  - [x] 1.8 `clearCurrentSession()` resets `currentSessionId` to null, clears `messages` and `messagesCursor`
  - [x] 1.9 Persist config: persist `currentSessionId` only via `partialize`

- [x] Task 2: Refactor ChatPage to use chat store (AC: #1, #6)
  - [x] 2.1 Replace module-level `activeSessionId` + `setActiveSession` in `market-adapter.ts` with store-driven state — the adapter reads `useChat.getState().currentSessionId`
  - [x] 2.2 Rewrite `ChatPage` to use `useChat` store: on mount, check if `currentSessionId` exists in store; if not, call `createAndSelectSession()`; if yes, call `selectSession(id)` to load messages
  - [x] 2.3 Remove the `useState<string | null>(null)` sessionId and inline loading logic from ChatPage
  - [x] 2.4 Loading state: show skeleton while `sessionsStatus === "loading"` or `messagesStatus === "loading"` on initial load
  - [x] 2.5 Empty state (AC #6): when `messages.length === 0` and session exists, show only the composer — no "no messages" or instructional text. The `ThreadPrimitive.Empty` slot should render nothing (empty fragment)

- [x] Task 3: Build session selector UI (AC: #3)
  - [x] 3.1 Create `apps/frontend/src/components/chat/session-selector.tsx`
  - [x] 3.2 Render as a compact header bar at the top of the chat page: session title (or "新对话" for untitled) + chevron-down icon to toggle dropdown
  - [x] 3.3 Dropdown lists sessions from store (`sessions` array), each row shows `title || "会话 · {createdAt short date}"`, click calls `selectSession(id)`
  - [x] 3.4 "新建会话" button at bottom of dropdown calls `createAndSelectSession()`
  - [x] 3.5 Current session highlighted with `text-apple-on-primary bg-apple-primary` or similar active indicator
  - [x] 3.6 Styling: `bg-apple-canvas rounded-apple-md border border-apple-hairline px-apple-sm py-apple-xs text-body text-apple-ink`
  - [x] 3.7 Max-height on dropdown with scroll for many sessions

- [x] Task 4: Integrate message history with assistant-ui runtime (AC: #4, #5)
  - [x] 4.1 The adapter reads `currentSessionId` from the chat store for session management
  - [x] 4.2 Create `apps/frontend/src/lib/chat-message-mapper.ts` — converts backend `ChatMessage` (with `blocks: Block[]`) to assistant-ui `ThreadMessage` format. Map `role: "user"` → user message, `role: "assistant"` → assistant message. For each `TextBlock` in `blocks`, create `{ type: "text", text: block.content }` content part. Ignore `UIBlock` and `ToolCallBlock` for now (Story 2.3/2.4 scope)
  - [x] 4.3 When session changes, the chat thread re-mounts via `key={currentSessionId}`, loading historical messages from the store
  - [x] 4.4 Pagination (AC #5): when user scrolls to top of message list, trigger `loadMessages(sessionId, cursor)` via IntersectionObserver on sentinel element. New messages prepend with `overflow-anchor-auto` for stable scroll position

- [x] Task 5: Apply "calm workshop" theme to chat UI (AC: #2)
  - [x] 5.1 Update chat page container: `max-w-[768px] mx-auto` centered column on `bg-apple-parchment` background per UX-DR9
  - [x] 5.2 Chat thread area: `bg-apple-parchment` (parchment warmth, not pure white)
  - [x] 5.3 Message gap: `gap-apple-md` (17px) per UX-DR9 spacing rhythm
  - [x] 5.4 User message bubble: `rounded-apple-lg rounded-br-apple-xs bg-apple-primary px-apple-md py-apple-sm text-body text-apple-on-primary`
  - [x] 5.5 Assistant message bubble: `rounded-apple-lg rounded-bl-apple-xs bg-apple-canvas px-apple-md py-apple-sm text-body text-apple-ink`
  - [x] 5.6 Composer: pill-radius input, 44px height (`h-11`), sticky bottom with `rounded-apple-pill`
  - [x] 5.7 Send button: Action Blue pill `rounded-apple-pill bg-apple-primary text-apple-on-primary`
  - [x] 5.8 Cancel button: `rounded-apple-pill bg-apple-ink text-apple-body-on-dark`
  - [x] 5.9 Page horizontal margin: `px-apple-xl` (32px) on outer container per UX spacing spec
  - [x] 5.10 Composer placeholder text: "例如：茅台跌破1800时提醒我" (Chinese, real trading scenario)

- [x] Task 6: Wire session selector into ChatPage (AC: #3, #4)
  - [x] 6.1 Update `ChatPage` layout structure: `<SessionSelector />` at top → `<ChatThread />` in middle → `<Composer />` sticky at bottom
  - [x] 6.2 Session selector loads sessions on mount via `useEffect(() => { loadSessions() }, [])`
  - [x] 6.3 When switching sessions: `key={currentSessionId}` re-mounts ChatThread, selectSession loads new messages
  - [x] 6.4 Session creation errors handled gracefully by store (error status, no crash)

- [x] Task 7: Tests (AC: #1–#6)
  - [x] 7.1 Create `apps/frontend/src/store/chat.test.ts` — 7 tests covering loadSessions, selectSession, createAndSelectSession, pagination, clearCurrentSession, addLocalMessage
  - [x] 7.2 Create `apps/frontend/src/components/chat/session-selector.test.tsx` — 4 tests covering title rendering, fallback, chevron, container structure
  - [x] 7.3 Create `apps/frontend/src/lib/chat-message-mapper.test.ts` — 5 tests covering TextBlock conversion, UIBlock ignore, empty blocks, tool block filtering

## Dev Notes

### CRITICAL: This is a BROWNFIELD story — backend and partial frontend already exist

The backend chat module is **fully functional** with all routes, service, repo, stream, mapper, and types. The frontend has a working ChatPage with session creation, SSE streaming via assistant-ui adapter, and basic message rendering. This story enhances the frontend with session management, message history loading, and UX-compliant theming.

### What Already Exists (DO NOT recreate)

**Backend (complete, no changes needed):**

- `entities/chat_sessions.ts` — table with userId, title, memorySummary, createdAt, updatedAt, deletedAt
- `entities/chat_messages.ts` — table with sessionId, userId, role (user/assistant/system), status (streaming/done), blocks (JSONB), createdAt
- `modules/chat/routes.ts` — POST /sessions, GET /sessions, GET /sessions/:id/messages, POST /sessions/:id/messages, GET /sessions/:id/stream, POST /sessions/:id/confirm-alarm
- `modules/chat/service.ts` — createChatSession, getChatSessions, getChatMessages, createUserAndAssistantPlaceholder, createConfirmAlarmMessage
- `modules/chat/repo.ts` — createSession, getSessionForUser, listSessionsForUser, listMessagesForSession, createMessage, getMessageForSession, updateAssistantMessageDone, touchSession — all with cursor-based pagination
- `modules/chat/stream.ts` — SSE streaming with event protocol (message_start, block_start, block_delta, block_end, message_end, error)
- `modules/chat/mapper.ts` — toMessageDto conversion
- `modules/chat/types.ts` — TextBlock, UIBlock, ToolCallBlock, ToolResultBlock, Block, MessageDto, SseEventName, SseEvent
- `modules/chat/errors.ts` — typed error codes
- `modules/chat/metrics.ts` — chat counters
- `modules/chat/context-policy.ts` — chat context budget management

**Frontend (already working):**

- `pages/chat.tsx` — ChatPage with session creation, ChatThread with assistant-ui ThreadPrimitive + ComposerPrimitive
- `components/chat/market-adapter.ts` — ChatModelAdapter for assistant-ui: reads activeSessionId, yields content from SSE stream
- `services/chat-api.ts` — createSession, listSessions, listMessages, sendMessage, streamSse — all API functions with proper types
- `services/api.ts` — apiFetch with auto Bearer token, 401 retry with refresh
- `store/auth.ts` — zustand with persist, isAuthenticated, clearAuth, setAuth, setTokens
- `App.tsx` — routing: /chat → ProtectedRoute → AppLayout → ChatPage
- `components/app-layout.tsx` — layout wrapper with GlobalNavigation + main content area

**No backend changes needed for this story.** The API already supports all operations.

### assistant-ui Integration — Key Considerations

The project uses `@assistant-ui/react` v0.12.28. Key APIs in use:

- `useLocalRuntime(adapter)` — creates a local runtime from a ChatModelAdapter. This runtime manages its own message state.
- `ThreadPrimitive` — low-level primitives for building chat threads (Root, Empty, Messages)
- `ComposerPrimitive` — primitives for the message composer (Root, Input, Send, Cancel)
- `ChatModelAdapter` — interface with `async *run(options)` generator that yields content parts

**Challenge with `useLocalRuntime`:** It manages messages internally. To display loaded historical messages, you need one of these approaches:

1. **Re-key the component:** When session changes, mount a new `<ChatThread key={sessionId} />` — this creates a fresh runtime. For historical messages, use `initialMessages` prop of `useLocalRuntime` if available in v0.12.x
2. **Use `useExternalStoreRuntime`:** Manage messages in your own store and provide them to the runtime. This gives full control but requires implementing the runtime adapter interface.
3. **Hybrid approach:** Keep `useLocalRuntime` for new message streaming, but render historical messages separately before the runtime-managed thread content.

Recommended: **Approach 1** for V1 simplicity. When session switches, re-mount the chat thread component with a key change. Convert loaded messages to assistant-ui format via `chat-message-mapper.ts` and pass as `initialMessages`. Check if `useLocalRuntime` in v0.12.x accepts `initialMessages` — if not, use a custom hook or wrapper that injects the messages.

### chat-message-mapper.ts — Conversion Logic

Backend `ChatMessage` has `blocks: Block[]` where Block can be TextBlock, UIBlock, ToolCallBlock, ToolResultBlock. For this story, only TextBlock rendering is needed:

```ts
// Backend Block → assistant-ui content part
TextBlock { type: "text", content: "..." } → { type: "text", text: "..." }
UIBlock { type: "ui", component: "alarm_preview", ... } → skip (Story 2.4)
ToolCallBlock → skip (Story 2.3)
ToolResultBlock → skip (Story 2.3)
```

### Session Selector Design

Given UX-DR9's max-width 768px centered layout, a sidebar won't fit. Use a compact header dropdown:

```
┌────────────────────────────────────────┐
│ [会话 · 5月5日 ▾]                      │  ← Session selector (Popover)
├────────────────────────────────────────┤
│                                        │
│        (chat messages area)            │
│                                        │
├────────────────────────────────────────┤
│ [ 例如：茅台跌破1800时提醒我 ] [发送]   │  ← Sticky composer
└────────────────────────────────────────┘
```

The selector shows current session title (or "新对话" / date). Clicking opens a popover listing all sessions. "新建会话" at the bottom.

### Layout Structure (per UX-DR9)

```
<div className="mx-auto flex h-[calc(100vh-44px)] max-w-[768px] flex-col bg-apple-parchment">
  <SessionSelector />           ← Compact header
  <ChatThread />                ← Flex-1 scrollable message area
  <Composer />                  ← Sticky bottom
</div>
```

### Market Adapter Refactor

Current `market-adapter.ts` uses module-level state:

```ts
let activeSessionId: string | null = null;
export function setActiveSession(id: string | null) {
  activeSessionId = id;
}
```

This must be refactored to read from the chat store:

```ts
import { useChat } from "@/store/chat";
// In adapter:
const sessionId = useChat.getState().currentSessionId;
```

Remove `setActiveSession` and `getActiveSessionId` exports. The adapter becomes a pure function of store state.

### Previous Story Learnings

**From Story 1.3 (Authenticated Navigation):**

- Design tokens are fully configured in TailwindCSS (colors, typography, radius, spacing, fontFamily)
- Use semantic token classes: `bg-apple-canvas`, `text-apple-ink`, `rounded-apple-pill`, `text-body`, etc.
- All product UI text must be Chinese per frontend CLAUDE.md
- GlobalNavigation provides the top bar (44px) — chat page height should use `calc(100vh - 44px)` for full-height layout
- `pt-11` padding on AppLayout accounts for the sticky top bar
- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Tests co-located with source files

**From Story 1.1 (Google OAuth):**

- `apiFetch()` auto-attaches Bearer token via `getValidAccessToken()`
- `ProtectedRoute` uses `!!(s.user && s.refreshToken)` selector — stable reference
- `ApiError.code` type is `string | number`

**From Story 1.0 (Project Scaffold):**

- Run `vp check` and `vp test` before finishing
- Import from `vite-plus/test`, NOT `vitest`
- Test environment: `happy-dom`

**From deferred-work.md:**

- `api.ts` defaults to port 3000 but backend runs on 3001 — requires `VITE_API_URL` env var
- `ProtectedRoute` selector creates new function each render — pre-existing, don't fix
- `callback.tsx` error path leaks OAuth error details — pre-existing
- Auth store hydration flash on first render — pre-existing from Story 1.2

### Architecture Compliance

- **AR11 (Zustand store pattern):** New `store/chat.ts` follows the established pattern from `store/auth.ts` — typed state + actions, persist wrapper, clear domain boundary
- **AR12 (Vite+ toolchain):** Run `vp check`, `vp test`, `vp fmt` — never direct vitest
- **AR16 (Naming conventions):** File: `chat.ts` (store), `session-selector.tsx` (component), `chat-message-mapper.ts` (lib); Components: PascalCase; Functions: camelCase
- **AR17 (API response format):** Already handled by chat-api.ts — `{ session }` for single, `{ sessions }` for list
- **Frontend file structure:** Stores in `store/`, components in `components/chat/`, utilities in `lib/`, types in `types/` (if needed)

### Testing Standards

- Tests co-located with source files
- Run `vp test` (not raw vitest)
- Run `vp check` for lint + type checks
- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Frontend tests mock API calls via `vi.mock()` on `services/chat-api`
- Mock `react-router-dom` hooks (`useLocation`, `useNavigate`) via `vi.mock()` if needed
- Test environment: `happy-dom`
- Use `renderToString` for simple component tests (matching existing project pattern from `global-navigation.test.tsx`)
- For store tests, test state transitions directly without React rendering

### References

- [Source: epics.md#Story 2.1] — Acceptance criteria for chat session management & /chat page
- [Source: architecture.md#Frontend Architecture] — Zustand stores, assistant-ui ChatModelAdapter, react-router-dom v7
- [Source: architecture.md#AR11] — Zustand store pattern (session-store, chat-store, alarms-store)
- [Source: architecture.md#AR12] — Vite+ toolchain constraints
- [Source: architecture.md#UX-DR9] — /chat page layout: max-width 768px, input-first, sticky-bottom composer, 17px message gap
- [Source: architecture.md#UX-DR16] — assistant-ui theme integration: parchment background, SF Pro typography, minimal composer, Action Blue send
- [Source: architecture.md#UX-DR19] — Empty states: /chat shows input only, no "no messages" prompt
- [Source: ux-design-specification.md#Core User Experience] — Input-as-understanding, input-first landing state
- [Source: ux-design-specification.md#Navigation Patterns] — No badges in nav, SPA routing
- [Source: ux-design-specification.md#Responsive Strategy] — Desktop-first, max-width centered layouts
- [Source: ux-design-specification.md#Spacing & Layout] — Page margin xl (32px), message gap md (17px), card padding lg (24px)
- [Source: existing pages/chat.tsx] — Current ChatPage implementation with useLocalRuntime
- [Source: existing components/chat/market-adapter.ts] — Current ChatModelAdapter with module-level session state
- [Source: existing services/chat-api.ts] — API functions: createSession, listSessions, listMessages, sendMessage, streamSse
- [Source: existing store/auth.ts] — Zustand store pattern to follow for chat store
- [Source: existing modules/chat/routes.ts] — Backend routes (no changes needed)
- [Source: existing modules/chat/types.ts] — Backend Block and MessageDto types
- [Source: existing components/app-layout.tsx] — Layout wrapper with pt-11 for top bar
- [Source: deferred-work.md] — Pre-existing issues: hydration flash, PORT mismatch, ProtectedRoute selector

### Project Structure Notes

**Files to CREATE:**

```
apps/frontend/src/store/chat.ts                          # Chat zustand store
apps/frontend/src/components/chat/session-selector.tsx   # Session dropdown
apps/frontend/src/lib/chat-message-mapper.ts             # Backend msg → assistant-ui format
apps/frontend/src/store/chat.test.ts                     # Store tests
apps/frontend/src/components/chat/session-selector.test.tsx  # Selector tests
apps/frontend/src/lib/chat-message-mapper.test.ts        # Mapper tests
```

**Files to UPDATE:**

```
apps/frontend/src/pages/chat.tsx                     # Refactor to use chat store + session selector + theme
apps/frontend/src/components/chat/market-adapter.ts  # Remove module-level state, use store
```

**Files to VERIFY (do NOT modify):**

```
apps/frontend/src/services/chat-api.ts               # API functions (already correct)
apps/frontend/src/services/api.ts                    # Base apiFetch (already correct)
apps/frontend/src/store/auth.ts                      # Auth store (already correct)
apps/frontend/src/App.tsx                            # Routing (already correct)
apps/frontend/src/components/app-layout.tsx          # Layout wrapper (already correct)
```

## Dev Agent Record

### Agent Model Used

Claude GLM-5.1

### Debug Log References

### Completion Notes List

- Created `store/chat.ts` with zustand + persist pattern matching auth store. State includes sessions, messages, cursor pagination, and status tracking. All 7 actions implemented.
- Refactored `market-adapter.ts` to read `currentSessionId` from chat store instead of module-level state. Removed `setActiveSession` and `getActiveSessionId` exports.
- Rewrote `ChatPage` to use chat store for session lifecycle: loadSessions on mount → auto-create or select session → display messages.
- Created `SessionSelector` component with click-outside-aware dropdown, session list with active highlighting, and "新建会话" button.
- Created `chat-message-mapper.ts` for converting backend ChatMessage to assistant-ui ThreadMessage format (TextBlock only for V1).
- Added IntersectionObserver-based pagination sentinel at top of message list with overflow-anchor-auto for scroll stability.
- Applied "calm workshop" theme: max-w-768px centered, bg-apple-parchment, gap-apple-md, rounded-apple-pill composer with h-11, px-apple-xl margins.
- All 32 frontend tests pass (7 store + 5 mapper + 4 selector + 16 existing).

### File List

**Created:**

- apps/frontend/src/store/chat.ts
- apps/frontend/src/store/chat.test.ts
- apps/frontend/src/components/chat/session-selector.tsx
- apps/frontend/src/components/chat/session-selector.test.tsx
- apps/frontend/src/lib/chat-message-mapper.ts
- apps/frontend/src/lib/chat-message-mapper.test.ts

**Modified:**

- apps/frontend/src/pages/chat.tsx
- apps/frontend/src/components/chat/market-adapter.ts

### Review Findings

- [x] [Review][Patch] Persist 水合竞态条件 — 已修复：添加 `sessions.some()` 验证持久化的 `currentSessionId` 是否仍存在于服务端，无效时 `clearCurrentSession()` 降级创建新会话。`chat.tsx:26-29`
- [x] [Review][Patch] chat-message-mapper 集成 — 已修复：使用 `toThreadMessages()` 转换后端消息为 `ThreadMessageLike[]`，通过 `useLocalRuntime(marketChatAdapter, { initialMessages })` 传入 runtime。`chat.tsx:84-89`
- [x] [Review][Patch] API 失败错误恢复 — 已修复：添加 error 状态渲染和「重试」按钮。`chat.tsx:49-65`
- [x] [Review][Patch] ARIA 属性和键盘导航 — 已修复：添加 `aria-expanded`、`aria-haspopup="listbox"`、`role="listbox"`/`role="option"`、`aria-selected`，以及 Escape 键关闭。`session-selector.tsx`
- [x] [Review][Patch] 点击已激活会话保护 — 已修复：`if (session.id !== currentSessionId)` 跳过不必要的 `selectSession` 调用。`session-selector.tsx:73-75`
- [x] [Review][Defer] 首次加载时 createAndSelectSession + selectSession 产生冗余 API 调用 — 新会话刚创建后立刻又调用 selectSession 触发 loadMessages（空结果）。性能问题非 bug。`chat.tsx:20-28`
