---
workflowStatus: "completed"
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: "step-05-generate-output"
nextStep: ""
lastSaved: "2026-05-04"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - docs/designs/market-domain-model.md
  - docs/designs/market-alarm-domain.md
  - docs/designs/market-identity-access-domain.md
  - docs/designs/market-message-domain.md
  - docs/designs/market-frontend-design.md
---

# Test Design Progress — market

## Step 1: Mode Detection & Prerequisites

**Mode:** System-Level

**Reason:** User explicitly chose System-Level mode. Full PRD + Architecture + Epics available — design system-wide test architecture covering all 4 epics.

**Prerequisites Verified:**

- PRD: `_bmad-output/planning-artifacts/prd.md` (32 FRs, 18 NFRs)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (complete architecture decision document)
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Epics: `_bmad-output/planning-artifacts/epics.md` (4 epics, 15+ stories)
- Domain Models: `docs/designs/` (alarm, identity-access, message, frontend, domain-model)

**Scope:**

- Epic 1: User Authentication & Foundation
- Epic 2: Natural Language Alarm Creation
- Epic 3: Alarm Management
- Epic 4: Real-Time Alert Engine & Notification Delivery

## Step 2: Context Loaded

**Detected Stack:** fullstack (React + Hono + Node.js + TypeScript + PostgreSQL + Drizzle ORM + Better Auth + Zustand + Shadcn)

**Test Framework:** Playwright (E2E) + Vitest via Vite+ (Unit/Integration)

**Existing Tests:**

- E2E: `apps/frontend/tests/e2e/` (api-health.spec.ts, auth.spec.ts, home.spec.ts)
- Unit: `apps/backend/src/modules/` (chat/mapper.test.ts, chat/context-policy.test.ts, alarms/evaluate.test.ts)

**Config:**

- tea_use_playwright_utils: true
- tea_use_pactjs_utils: false
- tea_browser_automation: auto
- test_stack_type: auto → fullstack

**Knowledge Fragments Loaded:**

- adr-quality-readiness-checklist.md (29-criteria NFR testability framework)
- test-levels-framework.md (Unit/Integration/E2E decision matrix)
- risk-governance.md (P×I scoring, gate decisions, traceability)
- test-quality.md (DoD: deterministic, isolated, <300 lines, <1.5min)

## Step 3: Testability Review & Risk Assessment

### 3.1 Testability Review

#### 🚨 Testability Concerns (Actionable)

| #   | Concern                                                                                                                                                                                    | Domain       | Evidence                                                                                                        | Mitigation                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| T-1 | **No state seeding APIs** — tests must insert data directly via DB or API calls, making setup slow and brittle                                                                             | All          | Architecture doc mentions no `/api/test-data` endpoints; Docker Compose scaffold planned but no seeding utility | Build factory-based API seeding helpers; add `db:seed:test` script for test environments                      |
| T-2 | **Real-time SSE streaming hard to assert** — event sequence (message_start → block_start → block_delta → block_end → message_end) requires live connection, making unit testing impossible | Chat         | SSE protocol defined with 7 event types; assistant-ui adapter transforms backend events                         | Test SSE event protocol at unit level (transform functions); integration tests with real SSE connection       |
| T-3 | **Rule engine timing sensitivity** — edge-triggered evaluation (`last_match_state` false→true) with per-alarm cooldown requires precise tick timing to test deterministically              | Alarm        | NFR6: tick eval <500ms; NFR9: zero duplicate triggers; cooldown enforcement                                     | Abstract tick source into injectable interface; use controlled tick sequences in unit tests                   |
| T-4 | **Web Push external dependency** — FCM/APNs delivery cannot be tested locally without real push service credentials and browser context                                                    | Notification | NFR10: 99% delivery rate; FR28: background tab delivery; VAPID + web-push library                               | Test push payload construction at unit level; integration tests with mock push service; E2E with real browser |
| T-5 | **Better-Auth integration testability** — Google OAuth flow requires external provider; session management tied to Better-Auth internals                                                   | Auth         | `requireAuth` middleware extracts from Better-Auth context; Google OAuth redirect flow                          | Mock Better-Auth at middleware level for API tests; Playwright `storageState` for E2E session persistence     |
| T-6 | **BullMQ async pipeline observability** — trigger→queue→notification→push is a multi-hop async pipeline; failures may be silent                                                            | Notification | BullMQ with 3 retries + exponential backoff; no explicit dead-letter handling documented                        | Add BullMQ event listeners for test observability; `recurse` polling pattern for notification assertion       |

#### ✅ Testability Strengths

| Strength                                                                    | Evidence                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **AlarmParser abstract interface** — AI model fully mockable                | `AlarmParser` interface with `(userInput, context) → ParsedDraft`; GLM-5 is one implementation                   |
| **REST API covers all business logic** — 100% headless testable             | All CRUD + chat + notification operations via REST endpoints; no UI-only logic                                   |
| **Structured error codes** — deterministic error assertion                  | Per-module typed error codes (`ALARM_NOT_FOUND`, `CHAT_SESSION_NOT_FOUND`); unified `{ message, code }` response |
| **Zod validation at API boundary** — clear invalid input testing            | Every request body validated with Zod schema; testable with valid/invalid payloads                               |
| **Docker Compose local parity** — consistent test environment               | api + redis + postgres + mock-datasource services; single `docker-compose up`                                    |
| **Drizzle schema-as-code** — database state reproducible                    | `drizzle-kit generate + migrate`; test DB can be reset between runs                                              |
| **Flat condition groups** — no nested logic reduces combinatorial explosion | Only flat AND/OR with 8 fixed metrics; bounded test input space                                                  |
| **Co-located unit test convention** — `mapper.test.ts` next to `mapper.ts`  | Backend module structure already includes test file pattern                                                      |

### 3.2 Architecturally Significant Requirements (ASRs)

| ASR                                                  | NFR Ref | Risk                                                 | Classification                                                |
| ---------------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Edge-triggered alarm evaluation with zero duplicates | NFR9    | Incorrect trigger state → false/missed alerts        | **ACTIONABLE** — must have dedicated unit + integration tests |
| Event-to-notification latency <2s p99                | NFR1    | Slow pipeline → stale alerts for trading decisions   | **ACTIONABLE** — needs latency benchmark tests                |
| SSE stream recovery within 5s                        | NFR11   | Dropped events → incomplete chat messages            | **ACTIONABLE** — test reconnection with message continuity    |
| 99.9% uptime during trading hours                    | NFR8    | Single-server Docker Compose is SPOF                 | **FYI** — acceptable for V1 solo deployment                   |
| User identity enforcement (server-side only)         | NFR12   | Client-supplied user_id could bypass auth            | **ACTIONABLE** — security-focused API tests                   |
| AI output containment (no unconfirmed drafts)        | NFR15   | Draft leaking to alarm domain                        | **FYI** — confirmation gate in chat→alarm boundary            |
| Notification delivery rate ≥99%                      | NFR10   | Push delivery failures silent to user                | **ACTIONABLE** — track delivery status, test retry paths      |
| Tick evaluation cycle <500ms                         | NFR6    | Slow evaluation → missed triggers during high volume | **ACTIONABLE** — performance benchmark for rule engine        |

### 3.3 Risk Assessment Matrix

| ID   | Category | Risk                                                                      | P   | I   | Score          | Mitigation                                                                                                                                          | Owner        |
| ---- | -------- | ------------------------------------------------------------------------- | --- | --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R-01 | TECH     | Edge-triggered rule engine produces duplicate or missed triggers          | 3   | 3   | **9 CRITICAL** | Unit test every state transition (false→true, true→true, true→false→true); integration test with controlled tick sequences; cooldown boundary tests | Backend Dev  |
| R-02 | TECH     | SSE event ordering incorrect under concurrent messages                    | 2   | 3   | **6 HIGH**     | Unit test SSE event transform functions; integration test with parallel message streams; assert event sequence completeness                         | Backend Dev  |
| R-03 | TECH     | BullMQ notification job loss or silent retry exhaustion                   | 2   | 3   | **6 HIGH**     | Test retry paths with forced failures; verify dead-letter handling; add job status polling helper for tests                                         | Backend Dev  |
| R-04 | PERF     | Event-to-notification latency exceeds 2s under load                       | 2   | 3   | **6 HIGH**     | Benchmark test: tick→trigger→queue→push end-to-end; identify bottleneck stage; monitor `tickLatencyMs` in logs                                      | Backend Dev  |
| R-05 | PERF     | AI first-token latency exceeds 2s (external model dependency)             | 3   | 2   | **6 HIGH**     | Mock AI for all non-AI tests; latency benchmark with real GLM-5; circuit breaker if model slow                                                      | Backend Dev  |
| R-06 | BUS      | NL parsing produces incorrect/incomplete alarm drafts (AI hallucination)  | 3   | 2   | **6 HIGH**     | Test AlarmParser with known input/output pairs; test unsupported metric rejection (FR11); validate all 8 metrics                                    | Backend Dev  |
| R-07 | SEC      | User data isolation fails (cross-user access to alarms/sessions)          | 2   | 3   | **6 HIGH**     | API tests with two users: User A cannot access User B's resources; verify 404 on non-owned resources; verify `userId` filter on all queries         | Backend Dev  |
| R-08 | OPS      | No CI/CD pipeline — manual deploy risks shipping broken code              | 2   | 2   | **4 MEDIUM**   | V1: local `vp check && vp test` gate; Phase 2: GitHub Actions with `setup-vp`                                                                       | DevOps       |
| R-09 | OPS      | No test data seeding APIs — test setup is slow and error-prone            | 2   | 2   | **4 MEDIUM**   | Build factory functions for Drizzle seed; add `test-setup.ts` helper                                                                                | QA           |
| R-10 | DATA     | Soft delete inconsistency (deleted alarms still evaluated by rule engine) | 2   | 2   | **4 MEDIUM**   | Verify `deleted_at IS NULL` filter in rule engine query; test create-delete-create cycle; partial unique index test                                 | Backend Dev  |
| R-11 | DATA     | Condition group JSONB validation gaps (malformed conditions pass through) | 2   | 2   | **4 MEDIUM**   | Zod schema validates at API boundary; test all 8 metric types × AND/OR operators; test invalid metric names rejected                                | Backend Dev  |
| R-12 | BUS      | Notification content accuracy (wrong symbol, condition summary)           | 2   | 2   | **4 MEDIUM**   | Test push payload construction with varied alarm configs; verify notify_label and notify_tier in payload                                            | Backend Dev  |
| R-13 | SEC      | Client-supplied user_id bypasses server-side auth context                 | 1   | 3   | **3 LOW**      | Better-Auth `requireAuth` middleware injects `user_id` from session; test that POST/PATCH with body `userId` is ignored                             | Backend Dev  |
| R-14 | SEC      | AI output containment fails (unconfirmed draft persists as alarm)         | 1   | 2   | **2 LOW**      | Confirmation gate enforced in chat→alarm API boundary; test that no-alarm-confirmation path never creates persisted alarm                           | Backend Dev  |
| R-15 | PERF     | Initial bundle exceeds 300KB gzip (NFR7)                                  | 1   | 2   | **2 LOW**      | Bundle size check in CI; monitor with `vp build` output                                                                                             | Frontend Dev |
| R-16 | TECH     | Zustand store state pollution between tests                               | 1   | 2   | **2 LOW**      | Reset stores in `beforeEach`; isolated test contexts                                                                                                | Frontend Dev |

### 3.4 Risk Summary

**CRITICAL (score 9):** 1 risk

- R-01: Rule engine edge-triggered evaluation — the most complex algorithmic component. Must be exhaustively unit tested before integration.

**HIGH (score 6):** 6 risks

- R-02, R-03: SSE and BullMQ pipeline reliability — async real-time paths need deterministic test patterns
- R-04, R-05: Latency targets depend on external systems (AI model, tick volume) — benchmark testing essential
- R-06: AI parsing quality — business-critical correctness for user trust
- R-07: User data isolation — security fundamental for multi-user system

**MEDIUM (score 4):** 5 risks

- Operational readiness (no CI/CD, no seeding) and data integrity (soft delete, condition validation)

**LOW (score 1-3):** 4 risks

- Mitigated by architectural decisions already in place (Better-Auth middleware, confirmation gate)

**Top Priority Mitigations:**

1. R-01 (CRITICAL): Build comprehensive rule engine unit test suite with controlled tick injection
2. R-07 (HIGH): Create multi-user API isolation test harness
3. R-04 (HIGH): Add latency benchmark test for full notification pipeline
4. R-02/R-03 (HIGH): Test SSE and BullMQ paths with failure injection

## Step 4: Coverage Plan & Execution Strategy

### 4.1 Coverage Matrix

#### Epic 1: User Authentication & Foundation

| Test ID      | Scenario                                                                       | Level       | Priority | Risks Mitigated | FRs/NFRs   |
| ------------ | ------------------------------------------------------------------------------ | ----------- | -------- | --------------- | ---------- |
| 1.1-UNIT-001 | `requireAuth` middleware extracts `userId` from session, ignores body `userId` | Unit        | P0       | R-07, R-13      | FR3, NFR12 |
| 1.1-INT-001  | Google OAuth sign-up creates user and session                                  | Integration | P0       | R-07            | FR1        |
| 1.1-INT-002  | Unauthenticated request to protected route returns 401                         | Integration | P0       | R-07            | NFR12      |
| 1.1-E2E-001  | Full Google OAuth login flow → authenticated dashboard                         | E2E         | P0       | R-07            | FR1        |
| 1.2-INT-001  | Logout invalidates session, subsequent requests return 401                     | Integration | P0       | R-07            | FR2        |
| 1.2-E2E-001  | Logout → session invalidated → redirect to login                               | E2E         | P0       | R-07            | FR2        |
| 1.3-INT-001  | Two users cannot access each other's alarms/sessions/feedback                  | Integration | P0       | R-07            | NFR13      |
| 1.3-INT-002  | Non-owned resource returns 404 (not 403) to avoid info leakage                 | Integration | P1       | R-07            | NFR13      |
| 1.1-E2E-002  | Session persists across browser tab navigation                                 | E2E         | P1       | —               | FR1        |
| 1.1-E2E-003  | Google OAuth redirect error shows user-friendly message                        | E2E         | P2       | —               | FR1        |

#### Epic 2: Natural Language Alarm Creation

| Test ID      | Scenario                                                                                                                | Level       | Priority | Risks Mitigated | FRs/NFRs          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | --------------- | ----------------- |
| 2.1-INT-001  | Create chat session, verify session metadata                                                                            | Integration | P1       | —               | FR4               |
| 2.1-INT-002  | List user's chat sessions with ownership filter                                                                         | Integration | P2       | R-07            | FR5               |
| 2.3-UNIT-001 | AlarmParser returns correct ParsedDraft for known inputs                                                                | Unit        | P0       | R-06            | FR6, NFR17        |
| 2.3-UNIT-002 | AlarmParser rejects unsupported metrics with text explanation                                                           | Unit        | P0       | R-06            | FR11              |
| 2.3-UNIT-003 | SSE event transform functions produce correct event sequence                                                            | Unit        | P1       | R-02            | FR7               |
| 2.3-INT-001  | NL message → SSE stream → complete event sequence (message_start → block_start → block_delta → block_end → message_end) | Integration | P0       | R-02            | FR7               |
| 2.3-INT-002  | AI first-token latency with mock parser < 2s                                                                            | Integration | P1       | R-05            | NFR3              |
| 2.4-UNIT-001 | Structured alarm draft fields parse correctly from AI response                                                          | Unit        | P0       | R-06            | FR8               |
| 2.4-COMP-001 | Alarm editor block renders draft fields and handles user edits                                                          | Component   | P1       | —               | FR9               |
| 2.5-INT-001  | Confirm structured draft → POST /alarms → alarm persisted with user's `userId`                                          | Integration | P0       | R-14            | FR12, FR13, NFR15 |
| 2.5-INT-002  | Unconfirmed draft never creates persisted alarm                                                                         | Integration | P0       | R-14            | NFR15             |
| 2.5-E2E-001  | Full NL alarm creation: type message → see draft → edit → confirm → alarm persisted                                     | E2E         | P0       | R-06, R-14      | FR6-FR13          |
| 2.1-INT-003  | Load message history with pagination for existing session                                                               | Integration | P1       | —               | FR10              |
| 2.2-INT-001  | Activate preset template → creates alarm with template defaults                                                         | Integration | P1       | —               | FR20, FR21        |

#### Epic 3: Alarm Management

| Test ID      | Scenario                                                                         | Level       | Priority | Risks Mitigated | FRs/NFRs    |
| ------------ | -------------------------------------------------------------------------------- | ----------- | -------- | --------------- | ----------- |
| 3.1-UNIT-001 | Condition group Zod schema validates all 8 metrics × AND/OR                      | Unit        | P0       | R-11            | FR19        |
| 3.1-UNIT-002 | Condition group rejects unknown metric names                                     | Unit        | P0       | R-11            | FR19        |
| 3.1-INT-001  | POST /alarms creates alarm with server-side `userId`                             | Integration | P0       | R-07, R-13      | FR12, FR13  |
| 3.1-INT-002  | GET /alarms returns only current user's alarms                                   | Integration | P0       | R-07            | FR14, NFR13 |
| 3.1-INT-003  | GET /alarms/:id returns full detail for owned alarm                              | Integration | P1       | —               | FR15        |
| 3.1-INT-004  | GET /alarms/:id returns 404 for non-owned alarm                                  | Integration | P0       | R-07            | NFR13       |
| 3.2-INT-001  | PATCH /alarms/:id updates conditions/cooldown/notify fields                      | Integration | P0       | —               | FR16        |
| 3.2-INT-002  | PATCH /alarms/:id toggle enabled/disabled                                        | Integration | P0       | —               | FR17        |
| 3.2-INT-003  | DELETE /alarms/:id sets `deleted_at` (soft delete)                               | Integration | P0       | R-10            | FR18        |
| 3.2-INT-004  | Deleted alarm excluded from list and rule engine query                           | Integration | P0       | R-10            | FR18, NFR13 |
| 3.2-INT-005  | Create-delete-create cycle: can recreate alarm for same symbol after soft delete | Integration | P1       | R-10            | FR18        |
| 3.1-E2E-001  | Alarm list page renders with key attributes, navigate to detail                  | E2E         | P1       | —               | FR14, FR15  |
| 3.2-E2E-001  | Edit alarm → save → updated values reflected                                     | E2E         | P1       | —               | FR16        |
| 3.2-E2E-002  | Toggle enable/disable → immediate UI update                                      | E2E         | P1       | —               | FR17        |
| 3.2-E2E-003  | Delete alarm → removed from list, toast confirmation                             | E2E         | P1       | —               | FR18        |

#### Epic 4: Real-Time Alert Engine & Notification Delivery

| Test ID      | Scenario                                                                   | Level       | Priority | Risks Mitigated | FRs/NFRs         |
| ------------ | -------------------------------------------------------------------------- | ----------- | -------- | --------------- | ---------------- |
| 4.2-UNIT-001 | Edge trigger: false→true produces trigger event                            | Unit        | P0       | R-01            | FR23, NFR9       |
| 4.2-UNIT-002 | No-trigger: true→true does not produce trigger                             | Unit        | P0       | R-01            | FR23, NFR9       |
| 4.2-UNIT-003 | Re-trigger: true→false→true produces second trigger                        | Unit        | P0       | R-01            | FR23             |
| 4.2-UNIT-004 | Cooldown blocks trigger within cooldown period                             | Unit        | P0       | R-01            | FR24             |
| 4.2-UNIT-005 | Cooldown allows trigger after period expires                               | Unit        | P0       | R-01            | FR24             |
| 4.2-UNIT-006 | Evaluate all 8 metric types correctly                                      | Unit        | P0       | R-01            | FR19, FR22       |
| 4.2-UNIT-007 | AND condition group: all conditions must be true                           | Unit        | P0       | R-01            | FR19             |
| 4.2-UNIT-008 | OR condition group: any condition true triggers                            | Unit        | P0       | R-01            | FR19             |
| 4.2-UNIT-009 | Multiple alarms per symbol evaluated independently                         | Unit        | P0       | R-01            | FR22             |
| 4.2-INT-001  | Tick → evaluate → BullMQ job created with correct payload                  | Integration | P0       | R-01, R-03      | FR22, FR23       |
| 4.2-INT-002  | Duplicate trigger prevention end-to-end (no two jobs for same edge)        | Integration | P0       | R-01            | NFR9             |
| 4.3-UNIT-001 | Push payload includes symbol, condition summary, notify_label, notify_tier | Unit        | P0       | R-12            | FR25, FR26, FR29 |
| 4.3-INT-001  | BullMQ worker processes trigger → delivers push notification               | Integration | P0       | R-03            | FR27             |
| 4.3-INT-002  | Push delivery retry on transient failure (3 attempts)                      | Integration | P1       | R-03            | NFR10            |
| 4.3-INT-003  | Push delivery failure after retries → logged with alarm metadata           | Integration | P1       | R-03            | NFR10            |
| 4.3-E2E-001  | Alarm triggers → browser receives push notification (background tab)       | E2E         | P1       | R-04            | FR27, FR28       |
| 4.3-E2E-002  | Push notification plays audible sound (standard vs emphasis tier)          | E2E         | P2       | —               | FR30             |
| 4.4-INT-001  | Submit feedback (useful/not useful) for triggered alarm                    | Integration | P1       | —               | FR31, FR32       |
| 4.4-INT-002  | Feedback recorded per alarm + user for quality analysis                    | Integration | P2       | —               | FR32             |
| 4.1-INT-001  | SSE reconnection within 5s with message continuity                         | Integration | P1       | R-02            | NFR11            |
| 4.2-INT-003  | Deleted/disabled alarm excluded from rule engine evaluation                | Integration | P1       | R-10            | FR17, FR18       |
| 4.1-INT-002  | Rule engine tick evaluation cycle <500ms per symbol                        | Integration | P3       | R-04            | NFR6             |
| 4.1-INT-003  | Full pipeline latency: tick → trigger → push <2s p99                       | Integration | P3       | R-04            | NFR1             |

### 4.2 Coverage Summary

| Epic                                    | P0     | P1     | P2    | P3    | Total  |
| --------------------------------------- | ------ | ------ | ----- | ----- | ------ |
| **Epic 1: Auth & Foundation**           | 7      | 2      | 1     | 0     | 10     |
| **Epic 2: NL Alarm Creation**           | 6      | 6      | 1     | 0     | 13     |
| **Epic 3: Alarm Management**            | 8      | 5      | 0     | 0     | 13     |
| **Epic 4: Alert Engine & Notification** | 14     | 7      | 1     | 2     | 24     |
| **Total**                               | **35** | **20** | **3** | **2** | **60** |

### 4.3 Test Level Distribution

| Level       | Count | %   |
| ----------- | ----- | --- |
| Unit        | 17    | 28% |
| Integration | 29    | 48% |
| E2E         | 11    | 18% |
| Component   | 1     | 2%  |
| Benchmark   | 2     | 3%  |

**Rationale:** Integration-heavy distribution reflects the system's nature — most complexity lives in API contracts, database interactions, and async pipelines (SSE, BullMQ). Unit tests focus on pure logic (rule engine evaluation, condition parsing, SSE transforms). E2E tests cover only critical user journeys.

### 4.4 Execution Strategy

| Suite            | Tests                                            | When            | Duration Target | Environment                                               |
| ---------------- | ------------------------------------------------ | --------------- | --------------- | --------------------------------------------------------- |
| **PR Gate**      | All P0 + P1 Unit + Integration                   | Every commit/PR | <10 min         | Docker Compose (api + redis + postgres + mock-datasource) |
| **PR E2E Smoke** | P0 E2E only (auth, alarm CRUD, trigger pipeline) | Every PR        | <5 min          | Docker Compose + Playwright                               |
| **Nightly**      | All P0 + P1 (full suite including E2E)           | Daily           | <30 min         | Docker Compose + Playwright                               |
| **Weekly**       | Full regression (P0-P3 including benchmarks)     | Weekly          | <60 min         | Docker Compose + Playwright                               |
| **Pre-Release**  | Full regression + manual exploratory             | Before deploy   | <90 min         | Staging                                                   |

### 4.5 Resource Estimates

| Priority           | Test Count | Estimated Effort  | Notes                                                                                                  |
| ------------------ | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| P0                 | 35         | ~40–60 hours      | Rule engine unit tests (9) are highest complexity; API integration tests leverage shared auth fixtures |
| P1                 | 20         | ~20–35 hours      | SSE streaming and BullMQ integration tests need async test patterns                                    |
| P2                 | 3          | ~3–8 hours        | Simple smoke tests                                                                                     |
| P3                 | 2          | ~2–5 hours        | Benchmark tests need controlled data sets                                                              |
| **Infrastructure** | —          | ~10–15 hours      | Docker Compose test config, factory functions, Playwright fixtures, auth session management            |
| **Total**          | **60**     | **~75–123 hours** | Spread across implementation sprints, not a single block                                               |

### 4.6 Quality Gates

| Gate            | Threshold                                      | Action if Failed                       |
| --------------- | ---------------------------------------------- | -------------------------------------- |
| P0 pass rate    | 100%                                           | Block merge/deploy                     |
| P1 pass rate    | ≥95%                                           | Warn; block if security-related (R-07) |
| P2 pass rate    | ≥80%                                           | Log for review                         |
| Risk mitigation | All CRITICAL and HIGH risks have passing tests | Block release                          |
| Coverage target | ≥80% of FRs covered by at least one test       | Review gaps before release             |
| Bundle size     | <300KB gzip                                    | Block deploy                           |
| No flaky tests  | 0 flaky in last 10 PR runs                     | Investigate and fix before merge       |
