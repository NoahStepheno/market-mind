---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
---

# market - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for market, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Users can sign up and log in via Google OAuth
- FR2: Users can log out and invalidate their session
- FR3: The system identifies the current user on every authenticated request and injects user identity into all business operations
- FR4: Users can create a chat session to begin an alarm creation conversation
- FR5: Users can view their list of past chat sessions
- FR6: Users can send a natural language message describing an alarm condition
- FR7: The system streams an AI-parsed response in real time, including a text explanation and a structured alarm draft
- FR8: The system presents the parsed alarm as an editable structured card (symbol, conditions, operator, cooldown, notify_label, notify_tier)
- FR9: Users can modify any field in the structured draft before confirming
- FR10: Users can load and scroll through the message history of a chat session
- FR11: When a user's natural language request references a metric or condition the system does not support, the AI responds with a clear text explanation indicating the limitation, rather than producing an incorrect or incomplete alarm draft
- FR12: Users can confirm a structured draft to create a persisted alarm
- FR13: The system persists only user-confirmed alarms with ownership tied to the authenticated user
- FR14: Users can view a list of their active alarms with key attributes (symbol, condition summary, enabled status, notify tier, last triggered time)
- FR15: Users can view the full details of a single alarm
- FR16: Users can update an existing alarm's conditions, cooldown, notify_label, or notify_tier
- FR17: Users can enable or disable an alarm without deleting it
- FR18: Users can delete an alarm (soft delete — hidden from lists and rule engine, recoverable if needed)
- FR19: The system supports flat condition groups using AND or OR logic with a fixed set of metrics (price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m)
- FR20: Users can browse a set of preset alarm templates (e.g., price breakout, volume surge, large price move)
- FR21: Users can activate a preset template as a personalized alarm with one action
- FR22: The system evaluates all enabled, non-deleted alarms against incoming market data in real time
- FR23: The system triggers an alarm only on edge transition (condition state changes from false to true)
- FR24: The system enforces a per-alarm cooldown period between consecutive triggers
- FR25: The system supports per-alarm notification label (user-defined short text for push display)
- FR26: The system supports per-alarm notification tier (standard or emphasis) affecting push delivery behavior
- FR27: The system delivers a push notification to the user when an alarm triggers
- FR28: Users receive push notifications even when the browser tab is in the background or closed (Web Push)
- FR29: The system renders notification content following a structured template (stock name + condition summary + trigger context), incorporating the alarm's notify_label when present
- FR30: The system plays an audible sound alert when a push notification arrives, with the sound behavior differentiated by notify tier (standard vs emphasis)
- FR31: Users can rate a triggered notification as "useful" or "not useful"
- FR32: The system records feedback associated with the alarm and user for future quality analysis

### NonFunctional Requirements

- NFR1: Event-to-notification latency (market event → push received) < 2s p99 during trading hours
- NFR2: Alarm creation end-to-end (first keystroke → alarm persisted) < 60s for any user
- NFR3: Chat input to first AI token < 2s
- NFR4: Initial page load (Time to Interactive) < 3s on broadband
- NFR5: Alarm list render (≤ 50 items) < 500ms
- NFR6: Rule engine tick processing — complete evaluation cycle for a symbol within 500ms of tick arrival
- NFR7: Initial bundle size < 300KB gzipped
- NFR8: Rule engine uptime during A-share trading hours (9:30–15:00 CST) ≥ 99.9%
- NFR9: Duplicate trigger prevention — 0 duplicate notifications per edge transition + cooldown cycle
- NFR10: Notification delivery rate ≥ 99% of triggered alarms produce a delivered push notification
- NFR11: SSE stream recovery — client auto-reconnects within 5s of disconnection with message continuity
- NFR12: User identity enforcement — all write operations derive user_id exclusively from server-side auth context; client-supplied user identifiers are ignored
- NFR13: Data isolation — users can only read and modify alarms, sessions, and feedback they own; cross-user access returns 404
- NFR14: Market data containment — no API endpoint exposes raw or derived market data to external consumers
- NFR15: AI output containment — AI-parsed alarm drafts are never persisted to the alarm domain without explicit user confirmation
- NFR16: Market data feed — system consumes broker-provided real-time data; feed interruption triggers a system health alert
- NFR17: AI model interface — NL-to-structured parsing is invoked via a stateless API call; model can be swapped without architectural changes
- NFR18: Push notification service — Web Push delivery via browser push service (FCM for Chrome, APNs for Safari); subscription management tied to authenticated sessions

### Additional Requirements

- AR1: No starter template — brownfield codebase with established patterns; architecture aligns with existing conventions
- AR2: Docker Compose scaffold — api + redis + postgres + mock-datasource services; single `docker-compose up` for local/prod consistency
- AR3: BullMQ + Redis — persistent, retry-capable message queue for trigger→notification decoupling; shared Redis instance for queue, tick cache, and session cache
- AR4: Unified error framework — AppError base class extending HTTPException with domain error codes (convention: DOMAIN_ENTITY_ACTION) + global Hono onError handler returning unified `{ message, code }` JSON
- AR5: AlarmParser abstract interface — `(userInput, context) → ParsedDraft`; GLM-5 as V1 provider; model swappable without architectural changes (NFR17)
- AR6: SSE streaming via assistant-ui ChatModelAdapter — backend SSE event protocol (message_start, block_start, block_delta, block_end, block_patch, message_end, error) mapped to assistant-ui StreamPart format
- AR7: Web Push via standard protocol — VAPID keys (web-push library); subscription stored in DB; auto-register on login; refresh on focus
- AR8: Drizzle ORM + PostgreSQL JSONB — condition_group and blocks stored as JSONB with Zod validation at API boundary
- AR9: Better-Auth middleware — requireAuth on all protected routes; user_id derived from `c.get("authUser").id` only; never trust client-supplied user_id
- AR10: Backend module structure — per domain: routes.ts (Hono + Zod), service.ts (business logic), errors.ts (typed error codes), mapper.ts (row→API), mapper.test.ts (co-located tests)
- AR11: Zustand store pattern — three stores (session-store, chat-store, alarms-store) with persist wrapper and clear domain boundaries matching backend
- AR12: Vite+ toolchain — all operations through `vp`; no direct pnpm/npm/vitest; imports from `vite-plus` not `vite` or `vitest`
- AR13: Datasource interface — WebSocket (backend as client, datasource as server); V1 uses mock WebSocket server; real broker integration deferred
- AR14: Shared package (packages/utils) — types.ts (AlarmSpec, Condition, ConditionGroup), constants.ts (SUPPORTED_METRICS, OPERATORS, PRESET_TEMPLATES), tick.ts (Tick, DerivedMetrics)
- AR15: Process model — single process (API + rule engine) with modular boundaries; future worker extraction requires only transport layer change
- AR16: Naming conventions — DB: snake_case plural tables + camelCase Drizzle fields; API: plural noun routes + camelCase JSON; Code: kebab-case files, PascalCase components, camelCase functions
- AR17: API response format — single: `{ resourceName: value }`; list: `{ resourceNames: [...] }`; creation: 201; deletion: 204 null; error: `{ message, code }`
- AR18: Date/time format — storage: timestamptz UTC; API JSON: ISO 8601; frontend: Date objects displayed in user local timezone (CST)

### UX Design Requirements

- UX-DR1: Map all DESIGN.md tokens (13 colors, 12 typography scales, 4 radius levels, 8 spacing levels) to TailwindCSS configuration under `theme.extend` — all components reference semantic tokens (`bg-canvas`, `text-ink`, `rounded-pill`) with zero hardcoded values
- UX-DR2: Build `alarm_preview` UIBlock — read-only display of AI-parsed result with canvas background, 1px hairline border, lg radius; shows stock name + code, condition logic (AND/OR), condition rows (label + operator + value), cooldown, notify tier; single "Edit" button transitions card in-place to alarm_editor; supports streaming (rows render progressively) and done states
- UX-DR3: Build `alarm_editor` UIBlock — editable confirmation card with canvas background, 2px Action Blue border, lg radius, "Editing" badge top-right; contains: stock name/code display, AND/OR toggle, condition rows (metric Select + operator Select + value Input + remove button per row), "+ Add condition" button, collapsible advanced section (cooldown Input + notify_label Input + notify_tier Select), "Confirm Create" pill button; real-time inline validation in ink-muted-48; states: editing, submitting (button loading), success, error (inline + retry)
- UX-DR4: Build `alarm_list_row` — compact single-row display with canvas or pearl background, 1px hairline border, lg radius; shows stock name (body-strong), condition summary (caption), tier badge, toggle switch, last triggered time (fine-print), action buttons (edit/delete); three status background tints: active (rgba(52,199,89,0.06) green undertone), triggered (rgba(255,159,10,0.08) amber undertone), paused (#fafafc surface-pearl + all text muted to ink-muted-48)
- UX-DR5: Build `unsupported_response` UIBlock — educational response with canvas background, 1px hairline border, lg radius; contains TextBlock explanation, available metrics grid (2-column, each: metric name + scenario demo), 2-3 nearest-match template cards (clickable, auto-fill chat input)
- UX-DR6: Build `template_card` — cold-start onboarding preset with icon, template title (body-strong), one-line description (caption); click fills chat input with template text; states: default, hover (scale 0.98), active (scale 0.95 press state); canvas background, 1px hairline border, md radius, 3-column flex row layout
- UX-DR7: Implement button hierarchy — primary pill (Action Blue bg + white text + pill radius, max one per view), secondary ghost (white bg + Action Blue border/text), utility rect (surface-pearl bg + ink-muted-80 text + md radius), inline text-link (Action Blue text); all buttons use scale(0.95) press state + 2px Focus Blue outline on focus
- UX-DR8: Implement feedback patterns — success: inline system message in conversation flow (permanent, surface-pearl bg + checkmark + body text + Action Blue link); failure: toast (canvas bg + hairline border + error text + retry button, manual dismiss); loading: skeleton pulse; streaming: progressive render; SSE disconnect: in-conversation "Connection lost. Reconnecting..." message
- UX-DR9: Implement /chat page layout — max-width 768px centered single-column flow; input-first landing state (highest visual weight); placeholder text cycles through real trading scenarios; sticky-bottom composer; 3 template cards row below input; message gap 17px rhythm
- UX-DR10: Implement /alarms page layout — max-width 960px centered; compact list rows with 8px gap; empty state: brief text "No alarms yet. Create one in chat." + link to /chat; loading state: 3-4 skeleton pulse rows
- UX-DR11: Implement global navigation — sticky top bar, 44px height, pure black bg, fine-print 12px text; entries: Chat, Alarms, Settings; active item white text, inactive muted gray; no badges/counters/notification icons; transitions to bottom tab bar at <768px breakpoint
- UX-DR12: Implement responsive breakpoints — desktop ≥1024px: full experience; tablet 768-1023px: content fills width, template cards collapse to 2-column; mobile <768px: single-column, template cards stack vertically, global nav to bottom tab bar, alarm_editor condition rows stack vertically, alarm list condition summaries truncate
- UX-DR13: Implement SSE disconnect handling — in-conversation "Connection lost. Reconnecting..." message displayed in chat thread; auto-reconnect within 5s with message continuity; no modal or alert dialog
- UX-DR14: Implement alarm_editor progressive disclosure — collapsible advanced section via Accordion for cooldown, notify_label, notify_tier; collapsed by default; reduces initial cognitive load per "one-sentence rule"
- UX-DR15: Implement in-place preview→editor transition — alarm_preview "Edit" button transitions card to alarm_editor in-place within conversation flow; no page navigation; card height adapts dynamically with no page jump
- UX-DR16: Implement assistant-ui theme integration — override default chrome to match calm workshop: parchment background for chat thread, SF Pro typography, minimal composer styling, Action Blue send button; chat container, message timeline, and streaming rendering customized
- UX-DR17: Implement inline error recovery — API failure produces toast with retry button; user input preserved on error; no data loss; error toasts use canvas bg + hairline border + error text + retry action
- UX-DR18: Implement keyboard navigation — Tab order follows natural reading flow; 2px solid Focus Blue (#0071e3) outline on all interactive elements; Enter to send in chat; keyboard shortcuts for enable/disable alarm
- UX-DR19: Implement empty states — /chat: input + 3 template cards only, no "no messages" prompt; /alarms: "No alarms yet. Create one in chat." + Action Blue link to /chat; loading: skeleton rows/cards
- UX-DR20: Implement touch targets ≥ 44×44px for all interactive elements (matches DESIGN.md input height)
- UX-DR21: Implement ARIA labels on all custom components (alarm_editor, alarm_preview, unsupported_response, template_card, alarm_list_row); shadcn/Radix primitives include ARIA by default

### FR Coverage Map

FR1: Epic 1 — User signs up and logs in via Google OAuth
FR2: Epic 1 — User logs out and invalidates session
FR3: Epic 1 — System identifies current user on every authenticated request
FR4: Epic 2 — User creates a chat session for alarm creation
FR5: Epic 2 — User views list of past chat sessions
FR6: Epic 2 — User sends natural language alarm description
FR7: Epic 2 — System streams AI-parsed response in real time
FR8: Epic 2 — System presents editable structured alarm card
FR9: Epic 2 — User modifies fields in structured draft before confirming
FR10: Epic 2 — User loads and scrolls through chat message history
FR11: Epic 2 — AI responds with clear explanation for unsupported metrics
FR12: Epic 2 — User confirms structured draft to create persisted alarm
FR13: Epic 2 — System persists only user-confirmed alarms with ownership
FR14: Epic 3 — User views list of active alarms with key attributes
FR15: Epic 3 — User views full details of a single alarm
FR16: Epic 3 — User updates an existing alarm's conditions and settings
FR17: Epic 3 — User enables or disables an alarm without deleting it
FR18: Epic 3 — User soft-deletes an alarm
FR19: Epic 2 — System supports flat AND/OR condition groups with 8 fixed metrics
FR20: Epic 2 — User browses preset alarm templates
FR21: Epic 2 — User activates a preset template as a personalized alarm
FR22: Epic 4 — System evaluates all enabled alarms against real-time market data
FR23: Epic 4 — System triggers alarm only on edge transition (false→true)
FR24: Epic 4 — System enforces per-alarm cooldown between triggers
FR25: Epic 4 — System supports per-alarm notification label
FR26: Epic 4 — System supports per-alarm notification tier (standard/emphasis)
FR27: Epic 4 — System delivers push notification when alarm triggers
FR28: Epic 4 — Users receive push even when browser tab is backgrounded or closed
FR29: Epic 4 — System renders notification content with structured template
FR30: Epic 4 — System plays audible sound differentiated by notify tier
FR31: Epic 4 — User rates a triggered notification as useful or not useful
FR32: Epic 4 — System records feedback for future quality analysis

## Epic List

### Epic 1: User Authentication & Foundation

Users can securely sign up via Google OAuth, log in, and manage their session. This epic establishes the project scaffold (Docker Compose, PostgreSQL + Drizzle, shared error framework, shared package, naming conventions, API response format, module structure), configures DESIGN.md design tokens into TailwindCSS, and builds the global navigation shell — providing the authenticated foundation that all subsequent epics build upon.
**FRs covered:** FR1, FR2, FR3
**Key NFRs:** NFR4, NFR7, NFR12, NFR13
**Key ARs:** AR1, AR2, AR4, AR8, AR9, AR10, AR12, AR14, AR15, AR16, AR17, AR18
**Key UX-DRs:** UX-DR1, UX-DR11

#### Story 1.0: Project Scaffold & Shared Infrastructure

As a developer,
I want the project infrastructure (Docker Compose, shared error framework, shared package) running with a single command,
So that all subsequent stories build on a consistent, working foundation.

**Acceptance Criteria:**

**Given** the project has no backend infrastructure
**When** a developer runs `docker-compose up`
**Then** api, redis, postgres, and mock-datasource containers start successfully
**And** PostgreSQL is accessible and Drizzle client connects without error.

**Given** the shared error framework is configured
**When** any route handler throws an `AppError` with a domain error code
**Then** the global Hono `onError` handler catches it and returns `{ "message": "...", "code": "DOMAIN_ENTITY_ACTION" }` JSON
**And** unknown errors return `{ "message": "Internal server error", "code": "INTERNAL_ERROR" }` with 500 status.

**Given** the shared package (packages/utils) is initialized with types.ts, constants.ts, and tick.ts
**When** backend or frontend imports from `@market/utils`
**Then** AlarmSpec, Condition, ConditionGroup, Operator, Metric types are available
**And** SUPPORTED_METRICS (8 metrics) and OPERATORS constants are available
**And** Tick and DerivedMetrics interfaces are available for datasource and rule engine consumption.

#### Story 1.1: Google OAuth Sign-Up & Login

As a new user,
I want to sign up and log in via Google OAuth,
So that I can securely access Market with my existing Google account.

**Acceptance Criteria:**

**Given** Better-Auth is configured with Google OAuth
**When** an unauthenticated user visits /login
**Then** a Google sign-in button is displayed (Action Blue pill, per UX-DR7).

**Given** an unauthenticated user on /login
**When** the user clicks the Google sign-in button
**Then** the browser redirects to Google's OAuth consent screen
**And** after consent, Google redirects back to /callback
**And** the system creates a user record (if new) and a session
**And** the browser redirects to /chat.

**Given** a user has signed up via Google OAuth
**When** the same user clicks Google sign-in again
**Then** the system recognizes the existing user and creates a new session (no duplicate account created).

**Given** a logged-in user on any page
**When** the page loads
**Then** the system validates the session token server-side
**And** `requireAuth` middleware injects `user_id` from the session (never from client-supplied data) per NFR12.

#### Story 1.2: Session Logout & Invalidation

As a logged-in user,
I want to log out and invalidate my session,
So that my account remains secure when I stop using Market.

**Acceptance Criteria:**

**Given** a logged-in user on any page
**When** the user clicks the logout action in the global navigation
**Then** the system calls the logout endpoint
**And** the session is invalidated server-side (removed from Better-Auth sessions)
**And** the browser redirects to /login.

**Given** a user has logged out
**When** the user attempts to access a protected route with the old session token
**Then** the system returns 401 Unauthorized
**And** the frontend redirects to /login.

**Given** a logged-in user with an expired session
**When** the user makes an authenticated request
**Then** the system returns 401
**And** the frontend clears the local auth state and redirects to /login.

#### Story 1.3: Authenticated Navigation & Design System Foundation

As a returning user,
I want the system to automatically recognize me and show the main application shell,
So that I can navigate between Chat, Alarms, and Settings without re-authenticating.

**Acceptance Criteria:**

**Given** all DESIGN.md tokens (13 colors, 12 typography scales, 4 radius levels, 8 spacing levels)
**When** the TailwindCSS configuration is built
**Then** all tokens are mapped under `theme.extend` with semantic names (`bg-canvas`, `text-ink`, `rounded-pill`, etc.)
**And** no component uses hardcoded color, size, or radius values per UX-DR1.

**Given** a logged-in user
**When** any page loads
**Then** a sticky top navigation bar is displayed: 44px height, pure black background, fine-print 12px text
**And** the bar shows Chat, Alarms, and Settings entries
**And** the active entry uses white text, inactive uses muted gray
**And** no badges, counters, or notification icons are shown per UX-DR11.

**Given** a logged-in user on a desktop (≥1024px)
**When** viewing the global navigation
**Then** the nav appears as a horizontal sticky top bar.

**Given** a logged-in user on mobile (<768px)
**When** viewing the global navigation
**Then** the nav transitions to a bottom tab bar with Chat, Alarms, Settings entries per UX-DR12.

**Given** the auth zustand store is configured
**When** a logged-in user opens the app
**Then** the store loads session data from Better-Auth
**And** all protected routes render without redirect
**And** `apiFetch()` auto-attaches Bearer token to every API call.

**Given** a user visits / (root)
**When** the user is authenticated
**Then** the app redirects to /chat.

**Given** a user visits any protected route (/chat, /alarms, /settings)
**When** the user is not authenticated
**Then** the app redirects to /login.

### Epic 2: Natural Language Alarm Creation

Users type one sentence in the chat interface describing a trading scenario; the AI parses it into a structured confirmation card within 2 seconds; the user verifies, optionally edits, and confirms — creating a persisted alarm in under 60 seconds. This is Market's core killer feature. Includes preset templates for cold-start onboarding and graceful degradation for unsupported metrics.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR19, FR20, FR21
**Key NFRs:** NFR2, NFR3, NFR7, NFR11, NFR15, NFR17
**Key ARs:** AR5, AR6, AR8, AR11
**Key UX-DRs:** UX-DR2, UX-DR3, UX-DR5, UX-DR6, UX-DR8, UX-DR9, UX-DR13, UX-DR14, UX-DR15, UX-DR16

#### Story 2.1: Chat Session Management & /chat Page

As a logged-in user,
I want to create and switch between chat sessions and view message history,
So that I can organize my alarm creation conversations.

**Acceptance Criteria:**

**Given** the chat_sessions and chat_messages tables exist with user-scoped rows
**When** a logged-in user visits /chat
**Then** the system auto-creates a chat session if none exists (POST /chat/sessions)
**And** the /chat page renders with max-width 768px centered layout on parchment background per UX-DR9.

**Given** the /chat page is rendered
**When** the page loads with assistant-ui integration
**Then** the chat container displays with "calm workshop" theme: parchment thread background, SF Pro typography, minimal composer styling, Action Blue send button per UX-DR16.

**Given** a logged-in user on /chat
**When** the user clicks the chat session selector
**Then** the system displays a list of past chat sessions (GET /chat/sessions) scoped to the current user per FR5.

**Given** a user selects a past chat session
**When** the session loads
**Then** the system fetches and displays all messages in chronological order (GET /chat/sessions/:id/messages) with user and assistant messages rendered distinctly per FR10.

**Given** a chat session with existing messages
**When** the user scrolls through the conversation
**Then** messages are loaded with pagination and rendered without layout shift.

**Given** a chat session with no messages (new session)
**When** the /chat page loads
**Then** only the input field and template cards area are visible — no "no messages" prompt per UX-DR19.

#### Story 2.2: Preset Alarm Templates & Input Composer

As a new user on the /chat page,
I want to see preset alarm templates that I can activate with one click,
So that I can create my first alarm without knowing what to type.

**Acceptance Criteria:**

**Given** the shared package constants include PRESET_TEMPLATES (Price Breakout, Volume Surge, Large Move)
**When** a user opens /chat with no messages
**Then** 3 template cards are displayed in a 3-column flex row below the input field per UX-DR6.

**Given** a template card is displayed
**When** the user hovers over it
**Then** the card scales to 0.98 (hover state)
**And** on click/press, it scales to 0.95 (press state).

**Given** a template card is displayed
**Then** each card shows: an icon, template title (body-strong typography), and one-line description (caption typography)
**And** uses canvas background, 1px hairline border, md radius per UX-DR6.

**Given** a user clicks a template card
**When** the click action fires
**Then** the template's preset natural language text fills the chat input field per FR20.

**Given** a user has filled the input via a template
**When** the user submits the message
**Then** the system processes it as a normal natural language input (integrates with Story 2.3).

**Given** a user on mobile (<768px)
**When** viewing template cards
**Then** the 3-column layout collapses to a vertical stack per UX-DR12.

**Given** the chat input composer
**When** displayed
**Then** the input uses pill radius, 44px height, and is sticky at the bottom of the chat page per UX-DR9 and UX-DR20
**And** placeholder text cycles through real trading scenarios (e.g., "翠微股份跌停打开的时候提醒我，放量3倍以上").

#### Story 2.3: AI Natural Language Parsing & Streaming Response

As a user,
I want to type a natural language description and receive an AI-parsed structured response in real time,
So that I can see my trading intent translated into actionable alarm conditions within seconds.

**Acceptance Criteria:**

**Given** the AlarmParser abstract interface is defined as `(userInput, context) → ParsedDraft`
**When** the GLM-5 provider is configured
**Then** the parser can be invoked via a stateless API call and swapped without architectural changes per NFR17 and AR5.

**Given** the shared package defines ConditionGroup types (AND/OR logic, 8 fixed metrics: price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m)
**When** a condition group is validated
**Then** only supported metrics and operators are accepted; invalid values are rejected by Zod schemas per FR19.

**Given** a user submits a natural language message in /chat
**When** the message reaches the backend (POST /chat/sessions/:id/messages)
**Then** the system invokes the AI parser and begins streaming the response via SSE within 2 seconds per NFR3.

**Given** the SSE streaming is active
**When** the backend emits events
**Then** the events follow the protocol: message_start, block_start, block_delta, block_end, block_patch, message_end, error per AR6.

**Given** the SSE client adapter is configured
**When** streaming events arrive at the frontend
**Then** the assistant-ui ChatModelAdapter transforms SSE events into StreamPart format
**And** TextBlock content renders progressively character by character per UX-DR16.

**Given** a user describes an unsupported metric (e.g., "alert me on MACD golden cross")
**When** the AI parser detects the unsupported metric
**Then** the AI responds with a clear text explanation of the limitation (not an incorrect draft) per FR11.

**Given** the AI has responded with an unsupported metric explanation
**When** the response is displayed
**Then** an unsupported_response UIBlock shows: the explanation, a 2-column available metrics grid (metric name + scenario demo), and 2-3 nearest-match template cards as one-tap alternatives per UX-DR5.

**Given** a user clicks a nearest-match template in the unsupported response
**When** the click fires
**Then** the template text auto-fills the chat input for resubmission.

**Given** an active SSE stream
**When** the connection is lost
**Then** the client displays "Connection lost. Reconnecting..." in the chat thread and auto-reconnects within 5s with message continuity per UX-DR13 and NFR11.

#### Story 2.4: Structured Alarm Confirmation Card

As a user,
I want to see my AI-parsed alarm as an editable structured card and modify any field before confirming,
So that I retain full control over the alarm conditions.

**Acceptance Criteria:**

**Given** the AI has successfully parsed a user's natural language input
**When** the streaming response includes an alarm_preview UIBlock
**Then** a read-only card renders with: stock name + code, condition logic (AND/OR), condition rows (label + operator + value), cooldown, notify tier
**And** the card uses canvas background, 1px hairline border, lg radius per UX-DR2.

**Given** an alarm_preview UIBlock is streaming
**When** condition rows arrive progressively
**Then** each row renders as it streams in (progressive render) — the card does not wait for the full payload per UX-DR2.

**Given** a fully rendered alarm_preview UIBlock
**When** the user clicks the "Edit" button on the card
**Then** the card transitions in-place to the alarm_editor UIBlock without page navigation per UX-DR15.

**Given** the alarm_editor UIBlock is active
**Then** it displays: stock name/code (non-editable), AND/OR toggle, condition rows (metric Select + operator Select + value Input + remove button per row), "+ Add condition" button per UX-DR3.

**Given** the alarm_editor UIBlock is active
**Then** a collapsible advanced section (Accordion) contains: cooldown Input, notify_label Input (optional), notify_tier Select (standard/emphasis)
**And** this section is collapsed by default per UX-DR14.

**Given** the alarm_editor is displayed
**Then** the card has a 2px Action Blue border (distinguishing from preview's hairline), an "Editing" badge in the top-right corner per UX-DR3.

**Given** a user modifies any field in the alarm_editor
**When** the modification is made
**Then** the change reflects immediately with no save button required per FR9.

**Given** a user enters an invalid value (empty condition, negative cooldown, invalid stock code)
**When** real-time validation runs
**Then** an inline error text appears below the offending field in ink-muted-48 color — no red color or error icons per UX-DR3.

**Given** a user adds a new condition row via "+ Add condition"
**When** the row appears
**Then** it contains empty metric Select, operator Select, and value Input fields ready for input.

**Given** a user removes a condition row
**When** the remove button is clicked
**Then** the row is removed and the card height adapts dynamically with no page jump.

#### Story 2.5: Alarm Persistence & Creation Flow

As a user,
I want to confirm my structured alarm draft and have it persisted as my alarm,
So that my alert becomes active and monitored by the system.

**Acceptance Criteria:**

**Given** the alarms table exists with columns: id, user_id, symbol, condition_group (JSONB), operator, cooldown_seconds, notify_label, notify_tier, enabled, deleted_at, created_at, updated_at
**When** a new alarm is inserted
**Then** the condition_group is stored as validated JSONB with Zod validation at the API boundary per AR8.

**Given** a user has completed editing in the alarm_editor UIBlock
**When** the user clicks the "Confirm Create" pill button (Action Blue, the sole CTA per UX-DR7)
**Then** the system sends POST /alarms with the structured alarm data.

**Given** a valid POST /alarms request
**When** the backend processes it
**Then** the alarm is persisted with user_id derived exclusively from server-side auth context (not from the request body) per FR13 and NFR12.

**Given** a successful alarm creation (201 Created)
**When** the frontend receives the response
**Then** an inline system message is appended to the chat: "Alarm created: {Stock Name} · {Condition Summary}" with Action Blue link to the alarm
**And** a brief toast confirmation appears top-right per UX-DR8.

**Given** a failed alarm creation (validation error or server error)
**When** the frontend receives the error response
**Then** a toast with error text and retry button appears; the user's alarm_editor state is preserved (no data loss) per UX-DR17.

**Given** the "Confirm Create" button is in loading state
**When** the API call is in progress
**Then** the button shows loading state (scale(0.95) press effect) and is disabled to prevent double submission.

**Given** the alarm_editor is in the "confirming" state
**When** the user has not yet confirmed
**Then** AI-parsed draft data exists only in the chat/editor state — it is NOT persisted to the alarm domain per NFR15.

### Epic 3: Alarm Management

Users can view their alarm list with compact rows showing symbol, condition summary, status (active/triggered/paused via background tints), tier badge, and last triggered time. Users can view full alarm details, edit conditions and settings, toggle enable/disable, and soft-delete — managing the complete lifecycle of created alarms.
**FRs covered:** FR14, FR15, FR16, FR17, FR18
**Key NFRs:** NFR5, NFR7, NFR13
**Key ARs:** AR11, AR17
**Key UX-DRs:** UX-DR4, UX-DR7, UX-DR8, UX-DR10, UX-DR19

#### Story 3.1: Alarm List & Detail Pages

As a user,
I want to view all my alarms in a compact list and see full details of any single alarm,
So that I can quickly assess the status of my monitoring portfolio.

**Acceptance Criteria:**

**Given** the GET /alarms endpoint exists (user-scoped, returns alarms where deleted_at is null)
**When** a logged-in user navigates to /alarms
**Then** the system fetches and displays the user's alarms in a list with max-width 960px centered layout per UX-DR10.

**Given** the alarm list is rendered
**When** each alarm_list_row displays
**Then** each row shows: stock name (body-strong), condition summary (caption), tier badge, toggle switch, last triggered time (fine-print), and action buttons (edit/delete) per UX-DR4.

**Given** an alarm_list_row for an active alarm
**When** rendered
**Then** the row uses canvas background with a subtle green tint (rgba(52,199,89,0.06)) per UX-DR7.

**Given** an alarm_list_row for a triggered alarm
**When** rendered
**Then** the row uses canvas background with a subtle amber tint (rgba(255,159,10,0.08)) per UX-DR7.

**Given** an alarm_list_row for a paused (disabled) alarm
**When** rendered
**Then** the row uses surface-pearl (#fafafc) background with all text muted to ink-muted-48 per UX-DR7.

**Given** each alarm_list_row
**When** rendered
**Then** the row uses canvas or pearl background, 1px hairline border, lg radius, compact row height with 8px gap between rows per UX-DR4 and UX-DR10.

**Given** the alarm list is loading
**When** the API call is in progress
**Then** 3-4 skeleton pulse rows are displayed (no spinner) per UX-DR19.

**Given** the user has no alarms (empty list)
**When** /alarms loads
**Then** a brief text "No alarms yet. Create one in chat." is shown with an Action Blue link to /chat per UX-DR19.

**Given** the alarm list renders ≤ 50 items
**When** the list is fully loaded
**Then** render completes in < 500ms per NFR5.

**Given** a user clicks an alarm row
**When** the click navigates to /alarms/:id
**Then** the system fetches and displays the full alarm detail: symbol, condition group (all conditions with metric/operator/value), AND/OR operator, cooldown, notify_label, notify_tier, enabled status, created_at, last triggered time per FR15.

**Given** the GET /alarms/:id endpoint is called
**When** the alarm belongs to a different user
**Then** the system returns 404 (not 403) to avoid information leakage per NFR13.

**Given** a user on mobile (<768px)
**When** viewing the alarm list
**Then** condition summaries truncate, action buttons compress spacing per UX-DR12.

#### Story 3.2: Alarm Edit, Toggle & Delete

As a user,
I want to edit my alarm conditions, toggle alarms on/off, and delete alarms I no longer need,
So that I can keep my monitoring portfolio current and relevant.

**Acceptance Criteria:**

**Given** a user is on the /alarms/:id detail page
**When** the user clicks edit
**Then** the detail page transitions to edit mode with condition rows (metric Select + operator Select + value Input), AND/OR toggle, cooldown input, notify_label input, and notify_tier select — matching the alarm_editor UIBlock pattern from Epic 2 per FR16.

**Given** a user modifies alarm fields in edit mode
**When** the user submits the changes
**Then** the system sends PATCH /alarms/:id with the updated data
**And** user_id is derived from server-side auth context (not from request body) per NFR12.

**Given** a successful alarm update
**When** the frontend receives the response
**Then** the detail page reflects the updated values immediately
**And** a brief success toast appears per UX-DR8.

**Given** a failed alarm update
**When** the frontend receives an error response
**Then** a toast with error text and retry button appears; the user's edits are preserved per UX-DR17.

**Given** a user on the /alarms list page
**When** the user clicks the toggle switch on an alarm_list_row
**Then** the frontend immediately updates the UI to show the new state (optimistic update) and sends PATCH /alarms/:id with the toggled `enabled` value per FR17.

**Given** an optimistic toggle update fails
**When** the API returns an error
**Then** the UI reverts to the previous state and shows an error toast per UX-DR8.

**Given** a user clicks the delete button on an alarm_list_row or detail page
**When** the click fires
**Then** a confirmation dialog appears (shadcn Dialog) asking "Delete this alarm?"

**Given** the user confirms deletion
**When** the system sends DELETE /alarms/:id
**Then** the alarm is soft-deleted (sets deleted_at timestamp) and hidden from lists and the rule engine per FR18.

**Given** a successful soft delete
**When** the frontend receives the response
**Then** the alarm row is removed from the list without page refresh (204 No Content response) per AR17.

**Given** the user cancels the deletion dialog
**When** the cancel button is clicked
**Then** the dialog closes and no action is taken.

### Epic 4: Real-Time Alert Engine & Notification Delivery

The rule engine evaluates all enabled alarms against incoming market ticks in real time, triggers only on edge transitions (false→true), enforces cooldowns, and delivers push notifications within 2 seconds via Web Push (Service Worker + VAPID). Users receive notifications even when the browser is backgrounded or closed, with structured content and tiered sound alerts. After receiving a notification, users can rate it as useful or not useful.
**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32
**Key NFRs:** NFR1, NFR6, NFR8, NFR9, NFR10, NFR11, NFR14, NFR16, NFR18
**Key ARs:** AR3, AR7, AR13
**Key UX-DRs:** UX-DR17, UX-DR18, UX-DR20, UX-DR21

#### Story 4.1: Real-Time Market Data Pipeline

As a user,
I want my alarms to be evaluated against real-time market data,
So that I receive timely signals based on current market conditions.

**Acceptance Criteria:**

**Given** the apps/datasource mock WebSocket server is configured
**When** the backend starts
**Then** the datasource client (backend as WebSocket client) connects to the datasource server per AR13.

**Given** the shared package defines Tick and DerivedMetrics interfaces in packages/utils/tick.ts
**When** a tick arrives from the datasource
**Then** the tick contains: symbol, price, pct_change, volume, turnover, limit_up (boolean), limit_down (boolean), volume_ratio_5m, price_change_5m, timestamp per AR14.

**Given** the datasource client receives a tick
**When** the tick is parsed and validated
**Then** the tick is cached in Redis and dispatched to the rule engine for evaluation.

**Given** the datasource connection is lost
**When** the WebSocket disconnects
**Then** the client attempts automatic reconnection with exponential backoff
**And** Pino logs the disconnection event at error level.

**Given** the docker-compose.yml includes api, redis, postgres, and mock-datasource services
**When** `docker-compose up` runs
**Then** the mock-datasource service starts and begins emitting simulated ticks for a predefined set of stock symbols.

**Given** no API endpoint exposes raw or derived market data
**When** any external request attempts to access market data
**Then** the request is rejected per NFR14.

#### Story 4.2: Edge-Triggered Alarm Evaluation with Cooldown

As a user,
I want to receive notifications only when my alarm conditions genuinely change, without duplicate spam,
So that every notification I receive represents a real trading opportunity I should act on.

**Acceptance Criteria:**

**Given** the rule engine module (modules/rule-engine/) with engine.ts, evaluator.ts, cooldown.ts, and edge-detector.ts
**When** a tick arrives for a symbol
**Then** the engine fetches all enabled, non-deleted alarms for that symbol and evaluates each alarm's condition group against the tick per FR22.

**Given** an alarm's condition group uses AND logic
**When** all conditions in the group evaluate to true
**Then** the group result is true; otherwise false.

**Given** an alarm's condition group uses OR logic
**When** any condition in the group evaluates to true
**Then** the group result is true; otherwise false.

**Given** an alarm's condition group evaluates to true on the current tick
**When** the previous evaluation result (last_match_state) was false
**Then** the edge detector identifies this as a false→true transition and marks the alarm as triggered per FR23.

**Given** an alarm's condition group evaluates to true
**When** the previous evaluation result was also true (no transition)
**Then** the edge detector does NOT trigger — no notification is sent per NFR9.

**Given** an alarm has been triggered
**When** the cooldown period (per-alarm cooldown_seconds) has not elapsed
**Then** the cooldown module suppresses any subsequent trigger for that alarm per FR24.

**Given** an alarm's cooldown period has elapsed
**When** a new false→true edge transition occurs
**Then** the alarm can trigger again.

**Given** a triggered alarm with a notify_label set
**When** the trigger event is dispatched
**Then** the user-defined short text is included in the trigger data per FR25.

**Given** a triggered alarm with notify_tier set to "emphasis"
**When** the trigger event is dispatched
**Then** the tier is included in the trigger data, affecting downstream push delivery behavior per FR26.

**Given** the rule engine processes a tick
**When** evaluation runs for a single symbol
**Then** the complete evaluation cycle completes within 500ms of tick arrival per NFR6.

**Given** the rule engine is running during A-share trading hours (9:30–15:00 CST)
**When** monitoring uptime
**Then** the engine maintains ≥ 99.9% uptime per NFR8.

**Given** the rule engine produces a trigger event
**When** the trigger is dispatched
**Then** the event is enqueued to the BullMQ `alarm-triggers` queue with job data: { alarmId, userId, symbol, notifyLabel, notifyTier, triggeredAt } per AR3.

**Given** a BullMQ trigger job fails
**When** the first attempt fails
**Then** the job is retried up to 3 times with exponential backoff per AR3.

#### Story 4.3: Push Notification Delivery

As a user,
I want to receive push notifications when my alarm triggers, even when the browser is in the background,
So that I never miss a critical trading signal.

**Acceptance Criteria:**

**Given** the push_subscriptions table exists with columns: id, user_id, endpoint, p256dh, auth, created_at
**When** a user logs in on a supported browser
**Then** the frontend registers a Service Worker and subscribes to Web Push via VAPID keys per AR7 and NFR18.

**Given** a user's push subscription already exists in the database
**When** the user revisits the app
**Then** the existing subscription is refreshed (not duplicated) per AR7.

**Given** the notifications/worker.ts consumes jobs from the BullMQ `alarm-triggers` queue
**When** a trigger job is received
**Then** the worker fetches the user's push subscriptions from the database and delivers the notification via web-push library per AR7.

**Given** a push notification is sent
**When** the notification arrives at the browser
**Then** it displays even when the app tab is in the background or closed (Web Push) per FR28.

**Given** a notification is rendered by the notifications/renderer.ts
**When** the notification content is assembled
**Then** it follows the template: stock name + condition summary + trigger context, incorporating the alarm's notify_label when present per FR29.

**Given** a notification with notify_tier = "emphasis"
**When** the push arrives
**Then** the system plays a distinct audible sound alert (different from standard tier) per FR30.

**Given** a notification with notify_tier = "standard"
**When** the push arrives
**Then** the system plays the standard audible sound alert per FR30.

**Given** a triggered alarm
**When** the notification is delivered from trigger event to browser receipt
**Then** the total latency is < 2s p99 during trading hours per NFR1.

**Given** all triggered alarms over a trading day
**When** measuring delivery success
**Then** ≥ 99% of triggered alarms produce a delivered push notification per NFR10.

**Given** a push delivery fails (subscription expired, browser offline)
**When** the web-push library returns an error
**Then** the worker logs the failure and the job retries per the BullMQ retry policy
**And** stale subscriptions (410 Gone) are removed from the database.

#### Story 4.4: Notification Feedback

As a user,
I want to rate triggered notifications as useful or not useful,
So that the system can learn which alert patterns provide the most value.

**Acceptance Criteria:**

**Given** the alarm_feedback table exists with columns: id, user_id, alarm_id, notification_id, rating (useful/not_useful), created_at
**When** a user receives a push notification
**Then** the user can rate it as "useful" (thumbs up) or "not useful" (thumbs down) per FR31.

**Given** a user rates a notification
**When** the rating is submitted (POST /alarms/:id/feedback)
**Then** the system records the feedback with the alarm_id, user_id, and rating per FR32.

**Given** a feedback submission
**When** the backend processes it
**Then** user_id is derived from server-side auth context, not from the request body per NFR12.

**Given** a user attempts to submit feedback for another user's alarm
**When** the backend validates ownership
**Then** the system returns 404 per NFR13.

**Given** a user submits feedback
**When** the same user submits feedback again for the same notification
**Then** the system updates the existing feedback record (upsert behavior).
