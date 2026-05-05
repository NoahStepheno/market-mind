# P1: assistant-ui Exploratory Integration Notes

**Date:** 2026-05-05
**Scope:** Stories 2.1 (Chat Session Management) and 2.3 (AI Natural Language Parsing & SSE)
**Target:** Map assistant-ui v0.12.28 APIs to Market's chat requirements

---

## 1. Installed Package State

| Package               | Version | Status     |
| --------------------- | ------- | ---------- |
| `@assistant-ui/react` | 0.12.28 | Installed  |
| `@assistant-ui/core`  | 0.1.17  | Transitive |
| `@assistant-ui/store` | 0.2.9   | Transitive |

The chat page (`pages/chat.tsx`) already uses `useLocalRuntime` + `ChatModelAdapter`. The adapter (`components/chat/market-adapter.ts`) handles text-only streaming. No UIBlock rendering, no thread history loading, no custom tool UI registration.

---

## 2. API Mapping: Market Requirements → assistant-ui APIs

### 2.1 Chat Container & Message Rendering

| Requirement              | assistant-ui API                                   | Current State                             |
| ------------------------ | -------------------------------------------------- | ----------------------------------------- |
| Message timeline         | `ThreadPrimitive.Root`, `ThreadPrimitive.Messages` | ✅ Basic                                  |
| Empty state              | `ThreadPrimitive.Empty`                            | ✅ Basic placeholder                      |
| User message bubble      | Custom rendering inside `ThreadPrimitive.Messages` | ✅ Custom div                             |
| Assistant message bubble | Custom rendering inside `ThreadPrimitive.Messages` | ✅ Custom div                             |
| Message part rendering   | `MessagePrimitive`, `MessagePartPrimitive`         | ❌ Not used — using raw `message.content` |

**Finding:** Current implementation manually iterates messages via `ThreadPrimitive.Messages` render prop. This works but bypasses assistant-ui's built-in message part lifecycle. For UIBlock support, we need to switch to `MessagePartPrimitive` or register custom tool UI components.

### 2.2 Custom UIBlock Components (alarm_preview, alarm_editor, unsupported_response)

**Recommended approach: `makeAssistantToolUI` + `useAssistantToolUI`**

```tsx
// Register a custom UI component for tool calls
const AlarmPreviewUI = makeAssistantToolUI({
  name: "alarm_preview",
  render: ({ args, result }) => <AlarmPreviewBlock draft={args} />,
});
```

**However**, our architecture uses UIBlocks (not tool_calls) in the message model. The backend `Block` type has `type: "ui"` with `component: "alarm_preview" | "alarm_editor"`. This is **not** the same as assistant-ui's tool_call/tool_result pattern.

**Two integration paths:**

**Path A (Recommended): Adapter translates UIBlock events to assistant-ui tool_call format**

- Backend SSE sends `block_start` with `type: "ui"` → adapter maps to assistant-ui's `tool_call` message part
- Frontend registers `makeAssistantToolUI` for `alarm_preview`, `alarm_editor`
- This lets assistant-ui manage the component lifecycle (loading → result → streaming)

**Path B: Custom message part renderer**

- Use `MessagePartPrimitive` to detect UIBlock parts and render custom components
- More manual control but less assistant-ui magic

**Decision: Path A** — assistant-ui's tool UI system provides loading states, streaming support, and error handling out of the box. The adapter layer is the right place to translate our UIBlock protocol to assistant-ui's tool_call protocol.

### 2.3 Streaming (SSE → assistant-ui)

| Backend SSE Event    | assistant-ui Equivalent | Adapter Handling                                                      |
| -------------------- | ----------------------- | --------------------------------------------------------------------- |
| `message_start`      | Run starts              | `yield` initial content                                               |
| `block_start` (text) | Text content part       | Start accumulating text                                               |
| `block_delta`        | Text delta              | `yield { content: [{ type: "text", text: accumulated }] }`            |
| `block_end`          | —                       | No-op (delta was already yielded)                                     |
| `block_start` (ui)   | Tool call start         | `yield { content: [{ type: "tool-call", toolName, args: partial }] }` |
| `block_patch`        | Tool call args update   | `yield { content: [{ type: "tool-call", toolName, args: updated }] }` |
| `message_end`        | Run completes           | Stop yielding                                                         |
| `error`              | Error part              | `yield { content: [{ type: "error", text }] }`                        |

**Current adapter gaps:**

1. Only handles `block_delta` text events — ignores `block_start`, `block_end`, `message_start`, `message_end`
2. No UIBlock → tool_call translation
3. No error event handling
4. No abort/cancel support for `message_end` cleanup

### 2.4 Composer (Input Bar)

| Feature                 | API                                       | Status                  |
| ----------------------- | ----------------------------------------- | ----------------------- |
| Text input              | `ComposerPrimitive.Input`                 | ✅                      |
| Send button             | `ComposerPrimitive.Send`                  | ✅                      |
| Cancel button           | `ComposerPrimitive.Cancel`                | ✅                      |
| Placeholder cycling     | Custom state + interval                   | ❌ Needs implementation |
| Template card insertion | Imperative `composer.send()` or value set | ❌ Needs research       |

**Composer enhancement plan:**

- Use `ComposerPrimitive.Input` with a cycling placeholder via `useState` + `useEffect` interval
- Template cards: clicking a template fills the composer value. assistant-ui does not expose a direct "set input" API on the composer. Options:
  1. Use a controlled input state outside the primitive and pass as `value` prop
  2. Use `useLocalRuntime`'s `composer.send()` to directly send the template text as a message
  3. Recommended: maintain a ref to the input element and set `.value` directly + dispatch input event

### 2.5 Thread History Loading

| Requirement            | API                                                | Status             |
| ---------------------- | -------------------------------------------------- | ------------------ |
| Load existing messages | `ExternalStoreAdapter` + `useExternalStoreRuntime` | ❌ Not implemented |
| Session list           | Separate from assistant-ui                         | ❌ Not implemented |

**Current issue:** `useLocalRuntime` is a stateless runtime — it doesn't load history. Each page load creates a new session and starts fresh.

**For Story 2.1 (Chat Session Management):**

- Need to switch from `useLocalRuntime` to `useExternalStoreRuntime` for history support
- Or keep `useLocalRuntime` and populate initial messages from backend before runtime starts
- `useExternalStoreRuntime` provides `isRunning`, `messages`, `onNew` callbacks that sync with an external store (our backend)

**Decision: Keep `useLocalRuntime` for V1** — it's simpler. Load messages via `listMessages(sessionId)` and convert to assistant-ui's `ThreadMessageLike[]` format before passing to the runtime. The runtime manages sending; history is loaded once on session switch.

```tsx
// Converting backend MessageDto → ThreadMessageLike
function toThreadMessages(messages: ChatMessage[]): ThreadMessageLike[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.blocks.map(blockToContentPart),
    createdAt: new Date(msg.createdAt),
  }));
}
```

### 2.6 Disconnect/Reconnect (UX-DR13)

assistant-ui does not provide built-in SSE reconnect. This must be handled in our adapter layer.

**Strategy:**

1. Adapter wraps SSE connection in a reconnect loop
2. On connection loss, yield a special status message that renders as "Connection lost. Reconnecting..."
3. On reconnect, resume streaming or show last message state
4. assistant-ui's `AbortController` signal is the hook for cancel/retry

---

## 3. Integration Checklist for Stories 2.1 / 2.3

### Story 2.1 — Chat Session Management & /chat Page

- [ ] Enhance `market-adapter.ts` to load initial thread history via `listMessages()`
- [ ] Implement `toThreadMessages()` converter (MessageDto → ThreadMessageLike)
- [ ] Add session list sidebar/panel (separate from assistant-ui)
- [ ] Implement composer placeholder cycling (3 trading scenarios)
- [ ] Add template cards below input (3 preset templates)
- [ ] Wire template card click → fill composer → send message
- [ ] Style chat container per UX-DR9 (max-width 768px, parchment bg)

### Story 2.3 — AI Natural Language Parsing & Streaming Response

- [ ] Extend `marketChatAdapter.run()` to handle all SSE event types
- [ ] Implement UIBlock → tool_call translation in adapter
- [ ] Register `makeAssistantToolUI` for `alarm_preview`
- [ ] Register `makeAssistantToolUI` for `alarm_editor` (if needed in this story)
- [ ] Implement SSE disconnect/reconnect in adapter
- [ ] Handle `error` SSE events → assistant-ui error state

---

## 4. Risks & Unknowns

| Risk                                                                 | Impact | Mitigation                                               |
| -------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| assistant-ui v0.12.28 API may change in breaking ways                | Medium | Pin version; evaluate upgrade path per story             |
| `makeAssistantToolUI` streaming support unclear                      | Medium | Test with a simple tool UI before building alarm_preview |
| `useLocalRuntime` may not support initial message loading            | Low    | Can switch to `useExternalStoreRuntime` if needed        |
| Composer value injection not documented                              | Low    | DOM ref approach is reliable fallback                    |
| assistant-ui `ThreadMessageLike` type mismatch with our `MessageDto` | Medium | Need manual conversion; adapter layer handles it         |

---

## 5. Key Takeaways

1. **assistant-ui is already integrated at a basic level** — the skeleton exists (adapter, runtime, primitives). The work is enhancement, not greenfield.
2. **UIBlock → tool_call translation is the critical design decision** — it determines how alarm_preview and alarm_editor components plug into assistant-ui's lifecycle.
3. **`useLocalRuntime` is sufficient for V1** — thread history can be loaded once and injected. No need for the more complex `useExternalStoreRuntime`.
4. **Composer interaction (template cards, placeholder cycling) is outside assistant-ui's scope** — pure React state management.
5. **SSE reconnect is our responsibility** — implement in the adapter, not in assistant-ui.
