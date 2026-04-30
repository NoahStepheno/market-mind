# MarketMind - Frontend Design (V1)

**Version**: aligned with `docs/prds/market-mind-prd.md` V1  
**Scope**: web frontend information architecture, interaction flows, state model, API integration, and engineering conventions.  
**Core constraint**: chat UI must use `assistant-ui`.

---

## 1. Goals and Non-goals

### 1.1 V1 goals

- Let users create an alarm in about 1 minute through natural language plus structured confirmation.
- Keep frontend boundaries consistent with domain model: chat handles draft and confirmation UX, alarm domain owns persisted alarms.
- Build a maintainable React architecture based on `shadcn`, `TailwindCSS`, and `zustand`.
- Ensure chat experience is stable and clear with `assistant-ui` streaming interactions.

### 1.2 Non-goals

- No strategy journaling, OCR, trading attribution, or complex indicator cockpit in V1.
- No nested condition builder (only flat `AND` or flat `OR`).
- No frontend-side rule engine; evaluation/triggering stays in backend alarm domain.

---

## 2. Product-facing Flow

Primary V1 user flow:

1. User enters a natural-language request in chat.
2. Assistant returns explanation + structured draft card.
3. User edits/validates symbol, conditions, cooldown, `notifyLabel`, `notifyTier`.
4. User confirms creation.
5. Frontend calls `POST /alarms`.
6. Success message appears in chat, and alarm list refreshes.

Domain boundary mapping:

- **Chat domain** on frontend: conversation timeline, draft editing state, streaming rendering, confirmation action.
- **Alarm domain** on frontend: alarms CRUD screens and client-side representation of persisted alarms.
- **Identity/Access domain** on frontend: session status, auth guard, token/cookie attached requests.

---

## 3. Frontend Architecture

### 3.1 Tech stack

- React + TypeScript
- TailwindCSS + `shadcn` UI components
- `zustand` for app-level state
- `assistant-ui` for chat container, messages, composer, and streaming-friendly message rendering
- Fetch layer via `src/services/` modules

### 3.2 Proposed directory structure

```text
apps/frontend/src/
  pages/
    chat/
    alarms/
    settings/
  components/
    ui/                       # shadcn primitives
    chat/
      assistant-thread.tsx
      assistant-composer.tsx
      blocks/
        text-block.tsx
        alarm-preview-block.tsx
        alarm-editor-block.tsx
    alarms/
      alarm-list.tsx
      alarm-form.tsx
  hooks/
    use-session.ts
    use-chat-stream.ts
    use-alarms.ts
  services/
    http-client.ts
    auth-api.ts
    chat-api.ts
    alarms-api.ts
  stores/
    session-store.ts
    chat-store.ts
    alarms-store.ts
  types/
    chat.ts
    alarms.ts
    api.ts
  utils/
    formatters.ts
    validators.ts
```

### 3.3 Layer responsibilities

- `pages/`: route-level composition and data loading triggers.
- `components/`: pure UI + local interaction logic.
- `stores/`: cross-component state and async action orchestration.
- `services/`: backend protocol wrappers and transport concerns.
- `types/`: shared frontend type contracts (mirroring backend schema shape).

---

## 4. Route and Page Design

### 4.1 Route map

- `/chat` - primary creation flow with `assistant-ui`
- `/alarms` - alarm list and management
- `/alarms/:id` - alarm detail/edit
- `/settings` - auth/session/push preference placeholders

### 4.2 Chat page layout (`/chat`)

- Left (desktop)/top (mobile): conversation thread.
- Bottom: composer input.
- Inline in thread: draft preview/editor blocks.
- Optional right panel: persisted alarms quick list for reference.

### 4.3 Alarms page layout (`/alarms`)

- Header: create new via "Go to chat".
- List rows: symbol, condition summary, cooldown, tier, enabled, updated time.
- Row actions: enable/disable, edit, soft delete.

---

## 5. Chat Design with `assistant-ui`

### 5.1 Why `assistant-ui`

- Provides production-ready chat primitives and interaction patterns.
- Reduces custom boilerplate for timeline/composer/message states.
- Good fit for block-based assistant messages and incremental stream updates.

### 5.2 Message model in frontend

Frontend follows backend message domain contract:

- `Message` with `role`, `status`, `blocks`.
- `TextBlock` rendered as markdown/plain text.
- `UIBlock` rendered via component registry (`alarm_preview`, `alarm_editor`).

Block rendering registry:

- `alarm_preview` -> read-only summary card.
- `alarm_editor` -> editable structured form with confirm CTA.
- unknown block -> fallback "unsupported content" component.

### 5.3 Stream handling strategy

- Use SSE stream endpoint from chat API.
- Append/patch current assistant message in `chat-store` by `messageId` + `blockId`.
- Keep "streaming" status until `message_end`.
- On disconnect, mark message as failed and provide retry action.

### 5.4 Confirm create action

From `alarm_editor` block:

1. Validate structured fields locally.
2. Serialize into alarm-domain request body.
3. Call `POST /alarms` through `alarms-api`.
4. On success:
   - append system/assistant success block in chat;
   - invalidate/reload alarms list store;
   - keep conversation continuity for next request.

This preserves boundary: chat UI initiates, alarm domain persists.

---

## 6. State Management (`zustand`)

### 6.1 `session-store`

- `session`: current user/session data
- `status`: `loading | authenticated | anonymous`
- actions: `bootstrap()`, `logout()`

### 6.2 `chat-store`

- `activeSessionId`
- `messagesBySession`
- `streamState` (connected/error/retrying)
- actions:
  - `loadSessionMessages(sessionId)`
  - `sendUserMessage(text)`
  - `startStream(messageId)`
  - `applyStreamEvent(event)`
  - `confirmDraft(payload)`

### 6.3 `alarms-store`

- `alarms[]`
- `listStatus`
- actions:
  - `fetchAlarms()`
  - `toggleEnabled(id, enabled)`
  - `deleteAlarm(id)` (soft delete via API)
  - `updateAlarm(id, patch)`

---

## 7. API Contracts and Mapping

### 7.1 Chat APIs

- `POST /chat/sessions`
- `GET /chat/sessions`
- `GET /chat/sessions/:id/messages`
- `POST /chat/sessions/:id/messages`
- `GET /chat/sessions/:id/stream?messageId=...` (SSE)

Frontend requirement:

- strict typing for stream events (`message_start`, `block_delta`, `block_patch`, `message_end`, `error`)
- idempotent patch application by message/block id

### 7.2 Alarm APIs

- `POST /alarms`
- `GET /alarms`
- `GET /alarms/:id`
- `PATCH /alarms/:id`
- `DELETE /alarms/:id`
- `POST /alarms/:id/feedback` (when notification feedback UI is added)

### 7.3 Request/response normalization

- Backend snake_case to frontend camelCase mapping at service layer.
- Preserve domain terms for critical fields (`notifyTier`, `notifyLabel`, `conditionGroup`) to minimize accidental mismatch.

---

## 8. UX Rules for V1

- Structured draft must always be user-editable before creation.
- Show condition logic clearly: "all conditions" (`AND`) vs "any condition" (`OR`).
- Validate and explain invalid inputs inline (operator/value mismatch, empty symbol, negative cooldown).
- Use clear success and error toasts/banners with recovery actions.
- Keep push tier wording product-friendly:
  - `standard` -> "Normal"
  - `emphasis` -> "High attention"

---

## 9. Security and Data Safety

- All protected routes require authenticated session guard.
- Never trust client-supplied `userId`; backend injects ownership.
- Sanitize any rendered rich text from assistant before display.
- Keep form validation both client-side (UX) and server-side (authority).
- Log client errors without leaking tokens or PII.

---

## 10. Observability and Error Handling

- Assign request ids from response headers (if available) for debug correlation.
- Track key frontend events:
  - chat message sent
  - stream started/ended/failed
  - draft confirmed
  - alarm created/updated/deleted
- Provide fallback UI states:
  - empty chat history
  - stream interrupted
  - alarm list load failure

---

## 11. Testing Strategy

### 11.1 Unit tests

- block renderer registry behavior
- stream event reducer/apply logic
- alarm payload serializer from editor state

### 11.2 Component tests

- `alarm-editor-block` interaction and validation
- chat thread rendering with mixed block types

### 11.3 Integration tests

- full flow: input NL -> receive draft block -> confirm -> create alarm success
- failure flow: alarm create API error and retry

---

## 12. Implementation Milestones (Frontend)

1. **Foundation**
   - Create typed `services` and `stores`
   - Route scaffolding for `/chat` and `/alarms`
2. **assistant-ui chat integration**
   - Compose thread/composer
   - Add block registry and SSE handling
3. **alarm confirmation and CRUD**
   - `alarm_editor` confirm to `POST /alarms`
   - alarms list management
4. **quality hardening**
   - tests, empty/error states, analytics hooks

---

## 13. Acceptance Checklist

- [ ] User can create one alarm end-to-end from chat without leaving `/chat`.
- [ ] `assistant-ui`-based chat supports streaming and block rendering.
- [ ] `alarm_editor` supports symbol, conditions, cooldown, `notifyLabel`, `notifyTier`.
- [ ] Alarm list reflects newly created alarm after confirmation.
- [ ] Auth guard and API error handling are in place.
- [ ] Core unit/integration tests for chat + create flow pass.
