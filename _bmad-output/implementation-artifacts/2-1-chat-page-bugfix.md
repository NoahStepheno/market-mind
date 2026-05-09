# Story 2.1 Bugfix: Chat Page Input & Layout Bugs

Status: done

## Story

As a user on the /chat page,
I want to be able to type messages in the input field and see the correct layout,
So that I can interact with the chat system.

## Bug Reports

### Bug 1: Missing AssistantRuntimeProvider (FIXED)

**Symptom:** Page does not render at all. All `ComposerPrimitive` and `ThreadPrimitive` components throw because no runtime context is available.

**Root Cause:** `useLocalRuntime()` result was not passed to `AssistantRuntimeProvider`. The runtime was created but never provided to the component tree.

**Fix:** Capture `useLocalRuntime` return value and wrap the chat UI with `<AssistantRuntimeProvider runtime={runtime}>`.

### Bug 2: Input Field Cannot Accept Typing

**Symptom:** After Bug 1 fix, the page renders but the `ComposerPrimitive.Input` textarea cannot accept keyboard input.

**Root Cause (hypothesis):** The `ChatThread` component returns `AssistantRuntimeProvider` without a DOM wrapper, causing the messages div and input div to be direct children of the outer flex container. This may cause layout issues where the input is not properly positioned or the flex layout doesn't constrain the thread correctly. Additionally, `ComposerPrimitive.Input` is a controlled component — it reads `value` and `disabled` from the AUI store. If the store's `composer.isEditing` is false or `thread.isDisabled` is true, the input value is forced to `""` and onChange is a no-op.

**Fix:** Wrap the `AssistantRuntimeProvider` children in a proper flex container div so that `ChatThread` occupies a single flex slot in the parent layout.

### Bug 3: Send and Cancel Buttons Both Always Visible

**Symptom:** Both "发送" (Send) and "停止" (Cancel) buttons render simultaneously regardless of runtime state.

**Root Cause:** Both buttons are always rendered unconditionally. They should toggle based on whether the assistant is generating.

**Fix:** Use `ComposerPrimitive.If` or conditional rendering based on `isRunning` state.

### Bug 4: Empty Thread Shows No Content

**Symptom:** When a new chat session is created with no messages, the message area is completely blank with no guidance for the user.

**Root Cause:** `<ThreadPrimitive.Empty />` is rendered without children, producing no visible output.

**Fix:** This will be addressed in Story 2-2 (preset alarm templates). For now, add a minimal empty state placeholder.

## Tasks

- [x] Task 1: Fix AssistantRuntimeProvider wrapping (Bug 1)
- [x] Task 2: Fix input field layout and structure (Bug 2)
- [x] Task 3: Fix Send/Cancel button conditional rendering (Bug 3)
- [x] Task 4: Add minimal empty state placeholder (Bug 4)

## Review Findings

### Decision Needed

- [x] [Review][Decision] ImeSafeInput replaces ComposerPrimitive.Input — **resolved: reverted to ComposerPrimitive.Input per spec intent** [`apps/frontend/src/pages/chat.tsx`]
- [x] [Review][Decision] `.env.example` deleted — **resolved: kept deleted per owner decision**
- [x] [Review][Decision] Backend CORS `X-Message-Id` header added — **resolved: removed, out of scope** [`apps/backend/src/index.ts:35`]

### Patch

- [x] [Review][Patch] `scrollRef` declared but never used — dead code → removed [`apps/frontend/src/pages/chat.tsx:MessageList`]
- [x] [Review][Patch] `syncText` useEffect overwrites textarea during rapid typing → eliminated by reverting to `ComposerPrimitive.Input` [`apps/frontend/src/pages/chat.tsx`]
- [x] [Review][Patch] Enter key submission via `closest("form")?.requestSubmit()` → eliminated by reverting to `ComposerPrimitive.Input` [`apps/frontend/src/pages/chat.tsx`]
- [x] [Review][Patch] Stale `isEditing` can silently drop keystrokes → eliminated by reverting to `ComposerPrimitive.Input` [`apps/frontend/src/pages/chat.tsx`]
- [x] [Review][Patch] Cancel/Send ternary rendering loses keyboard focus → both buttons now rendered with `hidden` class toggle [`apps/frontend/src/pages/chat.tsx:ComposerBar`]

### Deferred

- [x] [Review][Defer] Hardcoded Chinese strings not internationalized — deferred, pre-existing pattern
- [x] [Review][Defer] IME composition edge case on Android/iOS keyboards (`compositionstart` may fire after first `onChange`) — deferred, platform-specific
- [x] [Review][Defer] `selectSession` fires redundantly when creating new session — deferred, pre-existing store logic
- [x] [Review][Defer] Non-text message content (ui/tool_call/tool_result) silently swallowed — deferred, pre-existing
- [x] [Review][Defer] `streamSse` drops malformed SSE data and final buffer without trailing newline — deferred, pre-existing
- [x] [Review][Defer] `createAndSelectSession` does not set `messagesStatus` — deferred, pre-existing store logic
- [x] [Review][Defer] CORS fallback allows any origin when `CORS_ALLOWED_ORIGINS` is empty — deferred, pre-existing
- [x] [Review][Defer] Race condition on concurrent `selectSession` calls (no abort/cancellation) — deferred, pre-existing

## Code Map

### Files Changed

- `apps/frontend/src/pages/chat.tsx` — Main chat page component
