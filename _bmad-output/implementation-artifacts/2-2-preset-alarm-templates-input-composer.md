# Story 2.2: Preset Alarm Templates & Input Composer

Status: done

## Story

As a new user on the /chat page,
I want to see preset alarm templates that I can activate with one click,
So that I can create my first alarm without knowing what to type.

## Acceptance Criteria

1. **Given** the shared package constants include PRESET_TEMPLATES (Price Breakout, Volume Surge, Large Move) **When** a user opens /chat with no messages **Then** 3 template cards are displayed in a 3-column flex row below the input field per UX-DR6.

2. **Given** a template card is displayed **When** the user hovers over it **Then** the card scales to 0.98 (hover state) **And** on click/press, it scales to 0.95 (press state).

3. **Given** a template card is displayed **Then** each card shows: an icon, template title (body-strong typography), and one-line description (caption typography) **And** uses canvas background, 1px hairline border, md radius per UX-DR6.

4. **Given** a user clicks a template card **When** the click action fires **Then** the template's preset natural language text fills the chat input field per FR20.

5. **Given** a user has filled the input via a template **When** the user submits the message **Then** the system processes it as a normal natural language input (integrates with Story 2.3).

6. **Given** a user on mobile (<768px) **When** viewing template cards **Then** the 3-column layout collapses to a vertical stack per UX-DR12.

7. **Given** the chat input composer **When** displayed **Then** the input uses pill radius, 44px height, and is sticky at the bottom of the chat page per UX-DR9 and UX-DR20 **And** placeholder text cycles through real trading scenarios (e.g., "翠微股份跌停打开的时候提醒我，放量3倍以上").

## Tasks / Subtasks

- [x] Task 1: Create TemplateCard component (AC: #2, #3)
  - [x] 1.1 Create `apps/frontend/src/components/chat/template-card.tsx`
  - [x] 1.2 Props: `icon: string`, `title: string`, `description: string`, `nlText: string`, `onClick: (nlText: string) => void`
  - [x] 1.3 Visual: `bg-apple-canvas border border-apple-hairline rounded-apple-md p-apple-md` — canvas bg, 1px hairline border, md radius per UX-DR6
  - [x] 1.4 Layout: icon (text-based emoji) + title (`text-body-strong text-apple-ink`) + description (`text-caption text-apple-ink-muted-80`)
  - [x] 1.5 Hover: `hover:scale-[0.98]` transition — UX-DR6 press state scale
  - [x] 1.6 Press: `active:scale-[0.95]` — UX-DR6 active state
  - [x] 1.7 Focus: `focus-visible:outline-2 focus-visible:outline-apple-focus-blue focus-visible:outline-offset-1`
  - [x] 1.8 Touch target: min `w-11 h-11` (44px) via proper padding per UX-DR20
  - [x] 1.9 Cursor: `cursor-pointer`, whole card clickable
  - [x] 1.10 aria-label: `"使用模板: {title}"`

- [x] Task 2: Create TemplateCards row component (AC: #1, #6)
  - [x] 2.1 Create `apps/frontend/src/components/chat/template-cards.tsx`
  - [x] 2.2 Import PRESET_TEMPLATES from `@market/utils/constants` and render 3 TemplateCard instances
  - [x] 2.3 Desktop layout: `flex flex-row gap-apple-md` — 3-column flex row per UX-DR6
  - [x] 2.4 Mobile layout: `flex flex-col gap-apple-sm` — stack vertically at <768px per UX-DR12. Use `flex-col md:flex-row` (md = 768px)
  - [x] 2.5 Props: `onTemplateClick: (nlText: string) => void`
  - [x] 2.6 Each card rendered with `icon`, `title`, `description`, `nlText` from PRESET_TEMPLATES constant

- [x] Task 3: Add placeholder text cycling to composer (AC: #7)
  - [x] 3.1 Create `apps/frontend/src/hooks/use-cycling-placeholder.ts`
  - [x] 3.2 Cycle through array of real trading scenario strings every 4 seconds
  - [x] 3.3 Placeholder texts (Chinese, per frontend CLAUDE.md): ["翠微股份跌停打开的时候提醒我，放量3倍以上", "茅台跌破1800时提醒我", "中科曙光涨停打开立刻通知我", "宁德时代涨到220告诉我"]
  - [x] 3.4 Fade transition on text change (optional: `transition-opacity duration-300`)
  - [x] 3.5 Return current placeholder string

- [x] Task 4: Wire template cards into ChatPage (AC: #1, #4, #6)
  - [x] 4.1 Update `apps/frontend/src/pages/chat.tsx` — add TemplateCards component to ChatThread
  - [x] 4.2 Template cards appear ONLY when messages are empty (new session): conditionally render below the messages area, above the composer
  - [x] 4.3 On template click: fill the ComposerPrimitive.Input with the template's `nlText` using a ref to the input element
  - [x] 4.4 The `ComposerPrimitive.Input` needs a `ref` forwarded to the actual `<textarea>` so we can programmatically set its value
  - [x] 4.5 After filling, the user must manually click "发送" (Send) or press Enter — do NOT auto-submit

- [x] Task 5: Update ChatThread layout for template cards placement (AC: #1, #7)
  - [x] 5.1 In ChatThread, the layout structure: messages area (flex-1) → template cards (conditional) → composer (sticky bottom)
  - [x] 5.2 Template cards container: `px-apple-md py-apple-sm` with appropriate spacing
  - [x] 5.3 When messages exist, hide template cards — they only show on empty state per UX-DR19
  - [x] 5.4 Composer remains sticky-bottom regardless of template card visibility

- [x] Task 6: Tests (AC: #1–#7)
  - [x] 6.1 Create `apps/frontend/src/components/chat/template-card.test.tsx` — 4 tests: renders icon+title+description, click handler fires with nlText, hover/press scale classes present, aria-label set
  - [x] 6.2 Create `apps/frontend/src/components/chat/template-cards.test.tsx` — 3 tests: renders 3 cards from PRESET_TEMPLATES, passes onClick to each, responsive classes present
  - [x] 6.3 Create `apps/frontend/src/hooks/use-cycling-placeholder.test.ts` — 2 tests: returns initial placeholder, cycles to next on interval

## Dev Notes

### What Already Exists (DO NOT recreate)

**Shared package (complete):**

- `packages/utils/src/constants.ts` — PRESET_TEMPLATES with 3 templates (price-breakout, volume-surge, large-move), each with id, icon, title, description, nlText
- `packages/utils/src/types.ts` — Metric, Operator, Condition, ConditionGroup, AlarmSpec types

**Frontend (working from Story 2.1):**

- `pages/chat.tsx` — ChatPage with SessionSelector + ChatThread + Composer. Layout: max-w-768px centered, bg-apple-parchment
- `components/chat/market-adapter.ts` — ChatModelAdapter for SSE streaming via assistant-ui
- `components/chat/session-selector.tsx` — Session dropdown
- `store/chat.ts` — zustand store with sessions, messages, status tracking
- `services/chat-api.ts` — createSession, listSessions, listMessages, sendMessage, streamSse
- `lib/chat-message-mapper.ts` — Backend ChatMessage → assistant-ui ThreadMessage conversion

**Design tokens (configured in Story 1.3):**

- Semantic Tailwind classes: `bg-apple-canvas`, `text-apple-ink`, `text-apple-ink-muted-48`, `rounded-apple-md`, `rounded-apple-pill`, `text-body`, `text-caption`, `text-body-strong`
- Spacing: `gap-apple-md` (17px), `px-apple-md`, `py-apple-sm`, etc.
- All product UI text must be Chinese per frontend CLAUDE.md

### Key Implementation Details

**Template Cards Placement:**
The template cards should appear between the message list and the composer, visible ONLY when there are no messages (empty/new session). This matches UX-DR19: "/chat: input + 3 template cards only, no 'no messages' prompt."

```
┌─────────────────────────────────────┐
│ [Session selector]                  │
├─────────────────────────────────────┤
│                                     │
│  (empty — no messages)              │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Price │ │Volume│ │Large │  ← 3 template cards
│  │Break │ │Surge │ │ Move │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
├─────────────────────────────────────┤
│ [ 例如：茅台跌破1800时提醒我 ] [发送] │  ← Sticky composer
└─────────────────────────────────────┘
```

When messages exist, the template cards disappear and the full message thread takes over.

**Filling Composer Input on Template Click:**
The `ComposerPrimitive.Input` from assistant-ui renders a `<textarea>`. To programmatically set its value when a template card is clicked, you need a React ref to the underlying DOM element. Since `ComposerPrimitive.Input` is a Radix primitive, you may need to:

1. Use a wrapper component that captures the ref via `React.forwardRef` or a `useRef` with DOM query
2. Set `textarea.value = nlText` and dispatch an `input` event so React/assistant-ui picks up the change
3. Alternative: maintain local state for the input value and pass it as `defaultValue` or controlled value

Check assistant-ui v0.12.28 API for whether `ComposerPrimitive.Input` accepts a `ref` prop or controlled value. If not, use `document.querySelector` to find the textarea within the composer container and set its value directly with a synthetic InputEvent.

**Placeholder Cycling Implementation:**
Use a simple `useState` + `useEffect` with `setInterval`. The cycling should only run when the input is empty (not actively typed in). On first focus or keypress, stop cycling and show the user's own text. This is a UX enhancement — keep it simple.

**PRESET_TEMPLATES Content:**
The shared package already has templates with English titles and descriptions. Per frontend CLAUDE.md, all product UI must be Chinese. The nlText fields are already Chinese. For the title and description displayed on cards, either:

1. Use Chinese display strings mapped in the frontend component (recommended — keeps shared package generic)
2. Or update the shared package constants to Chinese

Recommendation: Add a `TEMPLATE_DISPLAY` mapping in the frontend that provides Chinese labels:

```ts
const TEMPLATE_LABELS: Record<string, { title: string; description: string }> = {
  "price-breakout": { title: "价格突破", description: "价格突破目标时提醒" },
  "volume-surge": { title: "放量提醒", description: "成交量异常放大时提醒" },
  "large-move": { title: "大涨大跌", description: "涨跌幅超过阈值时提醒" },
};
```

This keeps the shared package language-neutral while satisfying the Chinese UI requirement.

### Responsive Behavior

Per UX-DR12:

- Desktop (≥1024px): 3-column flex row of template cards
- Tablet (768-1023px): 2-column (collapse to 2 visible + 1 wrapped) — use `flex-wrap`
- Mobile (<768px): vertical stack — `flex-col md:flex-row`

Use Tailwind responsive prefix: `flex flex-col gap-apple-sm md:flex-row md:gap-apple-md`

### Architecture Compliance

- **AR12 (Vite+ toolchain):** Run `vp check`, `vp test`, `vp fmt`
- **AR16 (Naming conventions):** Files: `template-card.tsx`, `template-cards.tsx`, `use-cycling-placeholder.ts`
- **Frontend file structure:** Components in `components/chat/`, hooks in `hooks/`
- **Design tokens only:** No hardcoded colors, sizes, or radii — use `bg-apple-canvas`, `border-apple-hairline`, `rounded-apple-md`, etc.

### Testing Standards

- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Tests co-located with source files
- Test environment: `happy-dom`
- Use `renderToString` for simple component tests (matching existing project pattern)
- Run `vp check` and `vp test` before finishing

### Previous Story Learnings

**From Story 2.1 (Chat Session Management):**

- Chat store is in `store/chat.ts` with `messages` array and `currentSessionId`
- ChatPage layout: `max-w-[768px] mx-auto flex flex-col bg-apple-parchment px-apple-xl`
- ChatThread uses `key={currentSessionId}` to re-mount on session change
- Empty state: `ThreadPrimitive.Empty` renders nothing (empty fragment)
- Composer uses `ComposerPrimitive.Root`, `ComposerPrimitive.Input`, `ComposerPrimitive.Send`, `ComposerPrimitive.Cancel`
- Design tokens: `apple-*` prefix for all semantic tokens
- All UI text must be Chinese

**From Story 1.3 (Authenticated Navigation):**

- Design tokens fully configured: `text-body-strong`, `text-caption`, `rounded-apple-md`, etc.
- `pt-11` on AppLayout accounts for 44px sticky top bar
- `h-[calc(100vh-44px)]` for full-height chat page

**From Story 1.0 (Project Scaffold):**

- Run `vp check` and `vp test` before finishing
- Import from `vite-plus/test`, NOT `vitest`
- Test environment: `happy-dom`

### References

- [Source: epics.md#Story 2.2] — Acceptance criteria for preset templates & input composer
- [Source: UX-DR6] — template_card component spec: icon, title (body-strong), description (caption), canvas bg, 1px hairline, md radius, 3-column flex row, hover 0.98, press 0.95
- [Source: UX-DR9] — /chat layout: max-width 768px, input-first, sticky-bottom composer, 17px gap, 44px input height
- [Source: UX-DR12] — Responsive: desktop 3-col, tablet 2-col, mobile stack
- [Source: UX-DR19] — Empty state: input + 3 template cards only, no "no messages" prompt
- [Source: UX-DR20] — Touch targets ≥ 44×44px
- [Source: architecture.md#Frontend Architecture] — Template cards as custom components built on shadcn primitives
- [Source: architecture.md#FR20–21] — Users browse and activate preset templates
- [Source: packages/utils/src/constants.ts] — PRESET_TEMPLATES with 3 templates
- [Source: existing pages/chat.tsx] — Current ChatPage with ChatThread and Composer
- [Source: existing store/chat.ts] — Chat store with messages array
- [Source: frontend CLAUDE.md] — All product UI text must be Chinese

### Project Structure Notes

**Files to CREATE:**

```
apps/frontend/src/components/chat/template-card.tsx           # Single template card component
apps/frontend/src/components/chat/template-card.test.tsx      # Template card tests
apps/frontend/src/components/chat/template-cards.tsx          # Template cards row (responsive)
apps/frontend/src/components/chat/template-cards.test.tsx     # Template cards row tests
apps/frontend/src/hooks/use-cycling-placeholder.ts            # Placeholder cycling hook
apps/frontend/src/hooks/use-cycling-placeholder.test.ts       # Hook tests
```

**Files to UPDATE:**

```
apps/frontend/src/pages/chat.tsx                              # Add template cards to ChatThread
```

**Files to VERIFY (do NOT modify):**

```
packages/utils/src/constants.ts                               # PRESET_TEMPLATES (read-only import)
packages/utils/src/types.ts                                   # Shared types (read-only import)
apps/frontend/src/store/chat.ts                               # Chat store (read from store)
apps/frontend/src/components/chat/market-adapter.ts           # SSE adapter (no changes)
apps/frontend/src/components/chat/session-selector.tsx        # Session selector (no changes)
apps/frontend/src/services/chat-api.ts                        # API functions (no changes)
```

## Dev Agent Record

### Agent Model Used

Claude GLM-5.1

### Debug Log References

### Completion Notes List

- Created TemplateCard component with all UX-DR6 specs: canvas bg, hairline border, md radius, hover/press scale, focus ring, aria-label
- Created TemplateCards row with responsive layout: flex-col on mobile, flex-row on desktop (md breakpoint)
- Defined PRESET_TEMPLATES locally in template-cards.tsx with Chinese labels (title/description) since @market/utils package is not a frontend dependency
- Created useCyclingPlaceholder hook cycling through 4 Chinese trading scenario placeholders every 4 seconds
- Updated ChatPage: template cards show only when messages are empty, clicking fills composer textarea via native setter + input event dispatch
- Composer uses cycling placeholder via useCyclingPlaceholder hook
- All 9 new tests pass, all 109 existing tests pass (no regressions)
- vp check: 0 errors, 2 pre-existing warnings
- [Review Fix] Wired addLocalMessage into marketChatAdapter so template cards disappear after first send
- [Review Fix] Imported PRESET_TEMPLATES from @market/utils with TEMPLATE_DISPLAY Chinese label mapping
- [Review Fix] Rewrote hook test to actually test useCyclingPlaceholder with renderHook, fake timers, focus/blur lifecycle
- [Review Fix] Added try-catch and change event fallback to handleTemplateClick for robustness
- [Review Fix] useCyclingPlaceholder now stops cycling on focus, resumes on blur (onFocus/onBlur callbacks)
- [Review Fix] Suppressed ThreadPrimitive.Empty text when template cards are visible
- [Review Fix] Added sticky bottom-0 to ComposerBar container
- [Review R2 Fix] P1: persistedOk 赋值移至 DB 更新后立即执行 `persistedOk = !!updated`
- [Review R2 Fix] P2: crypto.randomUUID() 添加非安全上下文特性检测回退
- [Review R2 Fix] P3: AbortError 区分处理，不产生误导性消息
- [Review R2 Fix] P4: 验证 uiBlockId 正确使用，原始发现为误报
- [Review R2 Fix] P5: explanation 类型检查改为 `typeof === "string" &&`
- [Review R2 Fix] P6: 移除冗余 `!parserResult.draft` 条件
- [Review R2 Fix] P7: 错误路径 message_end status 改为 "error"
- [Review R2 Fix] P8: 添加 hasValidDraft 结构化验证防止空 draft 通过
- [Review R2 Fix] P9: 添加 uiBlockStarted/uiBlockClosed 追踪，错误恢复补发 b2 block_end
- [Review R2] 新增 5 个测试覆盖：empty draft、missing symbol、AbortError、non-string explanation、empty string explanation
- [Review R2] 140 个测试全部通过，vp check 0 错误

### File List

- `apps/frontend/src/components/chat/template-card.tsx` (new)
- `apps/frontend/src/components/chat/template-card.test.tsx` (new)
- `apps/frontend/src/components/chat/template-cards.tsx` (modified — imported from @market/utils, added TEMPLATE_DISPLAY mapping)
- `apps/frontend/src/components/chat/template-cards.test.tsx` (new)
- `apps/frontend/src/components/chat/market-adapter.ts` (modified — added addLocalMessage call, crypto.randomUUID fallback, AbortError handling)
- `apps/frontend/src/components/chat/market-adapter.test.ts` (modified — added addLocalMessage mock, AbortError test)
- `apps/frontend/src/hooks/use-cycling-placeholder.ts` (modified — added frozen state, onFocus/onBlur callbacks)
- `apps/frontend/src/hooks/use-cycling-placeholder.test.ts` (modified — rewritten with renderHook, proper interval/focus/blur testing)
- `apps/frontend/src/pages/chat.tsx` (modified — sticky composer, suppressed empty text, robust template click, cycling freeze on focus)
- `apps/frontend/src/lib/chat-message-mapper.ts` (modified — strict explanation type check)
- `apps/frontend/src/lib/chat-message-mapper.test.ts` (modified — added non-string and empty string explanation tests)
- `apps/frontend/package.json` (modified — added @market/utils workspace dependency)
- `apps/backend/src/modules/chat/stream.ts` (modified — persistedOk timing, hasValidDraft validation, uiBlock tracking, error status, redundant condition removal)
- `apps/backend/src/modules/chat/ai-stream.test.ts` (modified — added empty draft and missing symbol tests)

### Review Findings

- [x] [Review][Patch] Template cards never unmount — `messages.length === 0` gate is always true because zustand store's `addLocalMessage` is never called by the runtime adapter. Fix: wire `addLocalMessage` into marketChatAdapter streaming flow. [chat.tsx:117]
- [x] [Review][Patch] PRESET_TEMPLATES duplicated locally instead of importing from `@market/utils/constants` — shared package has the canonical definition but frontend uses a local copy with Chinese labels. Fix: add `@market/utils` as frontend dependency, import PRESET_TEMPLATES, use TEMPLATE_DISPLAY mapping for Chinese labels. [template-cards.tsx:3-25]
- [x] [Review][Defer] No tablet 2-column intermediate layout — spec responsive behavior section requires tablet (768-1023px) 2-col with flex-wrap, but Task 2.4 specifies `flex-col md:flex-row` without wrap. 不是很重要，后续迭代优化。 [template-cards.tsx:29]
- [x] [Review][Patch] Hook test does not test the hook — `use-cycling-placeholder.test.ts` only checks constant array values, never calls `useCyclingPlaceholder()`. The interval, cleanup, and state cycling are untested. [use-cycling-placeholder.test.ts:1-27]
- [x] [Review][Patch] Fragile native-setter DOM mutation — `handleTemplateClick` uses `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set` to bypass React's controlled input lifecycle. This is environment-sensitive and can silently fail if editing state guard drops the text or React re-renders. [chat.tsx:102-109]
- [x] [Review][Patch] Placeholder cycles during user typing — `useCyclingPlaceholder` runs setInterval unconditionally for the entire session lifetime, causing unnecessary re-renders. Dev Notes say cycling should stop when user interacts with the input. [use-cycling-placeholder.ts:13-18]
- [x] [Review][Patch] ThreadPrimitive.Empty renders alongside template cards — UX-DR19 mandates "input + 3 template cards only, no 'no messages' prompt." The "输入消息开始对话" text in ThreadPrimitive.Empty must be suppressed when template cards are shown. [chat.tsx:132-136]
- [x] [Review][Patch] ComposerBar lacks explicit sticky positioning — AC7 requires sticky bottom, but the container div has no `sticky bottom-0` class. Currently works via flex layout, but fragile to layout changes. [chat.tsx:178]
- [x] [Review][Defer] useMemo stale closure over messages — pre-existing from Story 2.1, not introduced by this change. [chat.tsx:91-97]
- [x] [Review][Defer] API-loaded messages invisible to runtime — pre-existing architectural issue from Story 2.1; runtime created with empty initialMessages before API resolves. [chat.tsx:91-97]
- [x] [Review][Defer] Template card flicker on page load — pre-existing useEffect race from Story 2.1; ChatThread mounts with empty messages before API resolves. [chat.tsx:26-49]
- [x] [Review][Defer] renderToString tests only cover static rendering — project test pattern, not specific to this change. Click-to-composer interaction flow is untested. [template-card.test.tsx, template-cards.test.tsx]
- [x] [Review][Defer] Unsubstituted `{symbol}` and `{value}` placeholders in nlText — by design; user fills these before submitting. [template-cards.tsx:9,15,21]
- [x] [Review][Defer] No text overflow handling on card text spans — minor, current content fits at all breakpoints. [template-card.tsx:23-25]
- [x] [Review][Defer] `addLocalMessage` is dead code in chat store — pre-existing from Story 2.1. [store/chat.ts:88-90]

### Review Findings (2026-05-06 — Round 2 CR of story 2.2 scope)

**Note:** The diff under review contains Story 2.3 error-resilience fixes (stream.ts, market-adapter.ts, chat-message-mapper.ts), not Story 2.2 template/U/X code. Story 2.2 implementation code was already committed in `fa4fb8b`. These findings address the uncommitted changes.

**decision-needed:**

_None_

**patch:**

- [x] [Review][Patch] P1 — `persistedOk` 移至 `updateAssistantMessageDone` 返回后立即赋值 `persistedOk = !!updated`，确保 DB 写入后标志正确 [stream.ts:230]
- [x] [Review][Patch] P2 — `crypto.randomUUID()` 添加 `typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"` 特性检测，非安全上下文回退到 `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` [market-adapter.ts:41-44]
- [x] [Review][Patch] P3 — 添加 `err instanceof DOMException && err.name === "AbortError"` 判断，AbortError 时直接 return 不产生误导消息 [market-adapter.ts:83-85]
- [x] [Review][Patch] P4 — 验证 uiBlockId 在 alarm_preview 和 unsupported_response 分支中均正确使用于 block_start/block_patch/block_end 三个事件。原始发现为误报 [stream.ts:143-175, 184-216]
- [x] [Review][Patch] P5 — `explanation` 检查改为 `typeof explanation === "string" && explanation`，防止对象/数组/数字类型通过 [chat-message-mapper.ts:23-24]
- [x] [Review][Patch] P6 — 移除 `else if` 中冗余的 `!parserResult.draft &&` 条件，前置 `if (hasValidDraft)` 已保证该分支 draft 无效 [stream.ts:181-182]
- [x] [Review][Patch] P7 — 错误路径 `message_end` 事件 `status` 从 `"done"` 改为 `"error"`，客户端可区分成功完成与流内错误 [stream.ts:331]
- [x] [Review][Patch] P8 — 添加 `hasValidDraft = parserResult.draft && typeof parserResult.draft.symbol === "string"` 结构化验证，空 draft `{}` 不再通过检查 [stream.ts:139-140]
- [x] [Review][Patch] P9 — 添加 `uiBlockStarted`/`uiBlockClosed` 追踪变量，错误恢复中补发 b2 `block_end` 防止孤立 block_start [stream.ts:52-53, 154, 175, 195, 216, 291-305]

**defer:**

- [x] [Review][Defer] else 分支 return 跳过 message_end SSE 事件 — pre-existing，通用回退分支直接 return 不发送 message_end [stream.ts:218-222]
- [x] [Review][Defer] AI 生成文本无大小限制 — pre-existing，块循环按 CHUNK_SIZE=8 无限发送 delta 事件，无最大字符检查 [stream.ts:104-122]
- [x] [Review][Defer] JSON.stringify 在 flatMap 回调中无异常捕获 — pre-existing，draft.conditionGroup 可能包含循环引用导致整个消息列表渲染崩溃 [chat-message-mapper.ts:20]
- [x] [Review][Defer] 不支持正则表达式无锚点 — `/不支持|不可用|无法识别|无法解析|无法处理/` 可能匹配正常响应中的子串（如 "该平台不支持美股数据，但我们支持港股数据"）。实际场景发生概率低 [stream.ts:176]
- [x] [Review][Defer] 硬编码 CHAT_STREAM_ERROR 错误代码 — pre-existing，无论根因如何均发送相同错误代码，前端无法实现差异化恢复 [stream.ts:291]
- [x] [Review][Defer] 空 textExplanation 发送空 delta — pre-existing，解析器返回空字符串时块循环至少发送一个空 delta 事件 [stream.ts:104-110]

### Review Findings (2026-05-06 — Round 3 CR, cross-story error-resilience fixes)

**decision-needed:**

- [x] [Review][Decision] D1 — unsupported_response 正则误触发基础设施错误 — 已解决：添加 `errorCode: "infra_error"` 字段到 ParserOutput、schemas、all GlmProvider 错误路径，以及在 stream.ts 的正则匹配前添加 errorCode 检查 — `/不支持|不可用|无法识别|无法解析|无法处理/` 匹配 GLM 基础设施错误文本 `"AI 服务暂时不可用，请稍后再试。"` 中的 `不可用`，将 API 故障错误分类为业务级 unsupported_response UIBlock。故事 2.3 Round 3 提议的 `errorCode` 字段仍不存在于 `ParserOutput` 接口中 [stream.ts:180]。选项：(1) 添加 errorCode 字段以区分基础设施错误和业务错误，(2) 从正则中移除 `不可用`，(3) 推迟到故事 2.3。

**patch:**

- [x] [Review][Patch] P1 — `block_patch` handler 在实时流式传输中丢弃 unsupported_response explanation — 已修复：market-adapter.ts 现在同时处理 `draft` 和 `explanation`，当 `draft` 不存在时，将 `explanation` 字符串追加到 accumulated 并 yield [market-adapter.ts:62]
- [x] [Review][Patch] P2 — persisted blocks 中 unsupported_response 的重复文本导致历史记录中双重渲染 — 已修复：blocks 数组初始化为空，仅在 unsupported_response 分支中推入 UIBlock，在 plain-text else 分支中推入 text block，从根本上避免了重复 [stream.ts:137, 214-218]

**defer:**

- [x] [Review][Defer] persistedOk 在 `!updated` 分支中存在边缘情况 — 如果 `writeEvent` 在 `!updated` 分支内抛出（发送 CHAT_MESSAGE_NOT_FOUND），catch 块会在 `persistedOk` 仍为 `false` 时执行，不必要地尝试回退持久化。极罕见的边缘情况 [stream.ts:227-239]
- [x] [Review][Defer] 错误恢复中硬编码的 `"b2"` block_id — catch 块在恢复的 block_end 事件（行 297）中使用硬编码字符串，而非在告警/不支持分支中声明的 `uiBlockId` 变量。如果块 ID 命名约定改变，将导致维护风险 [stream.ts:297]
- [x] [Review][Defer] `streamSse` 在错误/中止时从不释放 ReadableStream reader 锁 — `chat-api.ts` 调用 `reader.releaseLock()` 或 `reader.cancel()` 的调用路径均不存在。浏览器通常在流错误时释放锁，但 Streams 规范不保证此行为 [chat-api.ts:92]
- [x] [Review][Defer] `crypto.randomUUID()` 特性检测在 HTTP localhost 上正确回退到低熵 ID — 非安全上下文需要 `Math.random()` 回退。快速顺序调用（同一毫秒内）可能产生冲突 ID。这是正确行为，但受到浏览器安全策略限制 [market-adapter.ts:42-43]
- [x] [Review][Defer] 没有测试覆盖 `streamSse` 在任何事件产生前抛出 — 外部 try/catch 路径在 `accumulated` 为空字符串时正确处理，但路径未经测试 [market-adapter.test.ts]
- [x] [Review][Defer] `symbol` 与 `symbolName` 命名不一致 — `hasValidDraft` 守卫检查 `draft.symbol`，而 `block_patch` 提取 `draft.symbolName ?? draft.symbol`。如果解析器设置 `symbolName` 而不设置 `symbol`，流将拒绝。在当前解析器输出下不会发生运行时错误 [stream.ts:139, market-adapter.ts:62]
- [x] [Review][Defer] 空字符串 `symbol: ""` 通过 hasValidDraft 守卫 — `typeof "" === "string"` 为 true。在实践中不太可能（解析器单独验证），但守卫与其名称的严格性不匹配 [stream.ts:139]

## Change Log

- 2026-05-04: Story created
- 2026-05-04: Story implementation completed — all tasks done, tests passing
- 2026-05-05: Code review round 1 — addressed 8 patch findings, 5 defer findings
- 2026-05-05: Story status updated to review
- 2026-05-06: Code review round 2 — addressed 9 patch findings (P1–P9), added 5 new tests, 140 tests pass, vp check 0 errors
- 2026-05-06: Code review round 3 — cross-story error-resilience review: 1 decision-needed, 2 patch, 7 defer
