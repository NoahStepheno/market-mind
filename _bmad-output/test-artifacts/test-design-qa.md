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
workflowType: "testarch-test-design"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
---

# Test Design for QA: Market

**Purpose:** Test execution recipe for QA team. Defines what to test, how to test it, and what QA needs from other teams.

**Date:** 2026-05-04
**Author:** TEA Master Test Architect
**Status:** Draft
**Project:** market

**Related:** See Architecture doc (`test-design-architecture.md`) for testability concerns and architectural blockers.

---

## Executive Summary

**Scope:** Full-stack alarm trading platform — 4 epics covering authentication, NL alarm creation, alarm CRUD, and real-time alert engine with push notifications.

**Risk Summary:**

- Total Risks: 16 (7 high-priority score >= 6, 5 medium, 4 low)
- Critical Categories: TECH (rule engine), SEC (data isolation), PERF (latency)

**Coverage Summary:**

- P0 tests: 35 (critical paths, security, rule engine)
- P1 tests: 20 (important features, integration)
- P2 tests: 3 (secondary flows, edge cases)
- P3 tests: 2 (benchmarks)
- **Total:** 60 tests (~75–123 hours with 1 developer)

---

## Not in Scope

| Item                                    | Reasoning                                             | Mitigation                                                                   |
| --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Better-Auth internal session management | Third-party library handles its own session lifecycle | Integration test at API boundary (401 on expired session)                    |
| Drizzle ORM query correctness           | ORM is well-tested upstream                           | Integration test at API boundary with real PostgreSQL                        |
| GLM-5 AI model quality                  | External model, quality varies                        | Test AlarmParser interface with known I/O; test unsupported metric rejection |
| Docker infrastructure reliability       | Infrastructure concern, not application logic         | Health check endpoint + Docker Compose smoke test                            |

---

## Dependencies & Test Blockers

### Backend/Architecture Dependencies

1. **Drizzle seed factories** — Backend Dev — Pre-Epic 1
   - Need factory functions to create test users, alarms, chat sessions via Drizzle ORM
   - Blocks all integration tests that need pre-existing data

2. **Auth middleware mock/test bypass** — Backend Dev — Pre-Epic 1
   - Need way to authenticate API requests without Google OAuth redirect
   - Blocks all API integration tests

3. **Tick source injectable interface** — Backend Dev — Pre-Epic 4
   - Need to feed controlled tick sequences to rule engine in tests
   - Blocks rule engine unit tests (9 tests, CRITICAL risk R-01)

4. **BullMQ test event listeners** — Backend Dev — Epic 4
   - Need to observe job completion/failure in test assertions
   - Blocks notification pipeline integration tests

### QA Infrastructure Setup

1. **Test Data Factories**
   - User factory (faker email, Better-Auth session)
   - Alarm factory (8 metric types, AND/OR condition groups)
   - Chat session factory (with message history)
   - Auto-cleanup fixtures for parallel safety

2. **Test Environments**
   - Local: Docker Compose (api + redis + postgres + mock-datasource)
   - CI: Same Docker Compose via GitHub Actions
   - Playwright: `storageState` for auth session persistence

**Example factory pattern:**

```typescript
import { test } from "vite-plus/test";
import { expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("create alarm via API @P0", async ({ request }) => {
  const alarmData = {
    symbol: faker.helpers.fromRegExp(/[0-9]{6}/),
    conditionGroup: {
      operator: "AND",
      conditions: [{ metric: "price", comparator: "gt", value: 100 }],
    },
    cooldownSeconds: 900,
    notifyTier: "standard",
  };

  const response = await request.post("/api/alarms", { data: alarmData });
  expect(response.status()).toBe(201);

  const { alarm } = await response.json();
  expect(alarm.symbol).toBe(alarmData.symbol);
  expect(alarm.userId).toBeTruthy();
});
```

---

## Risk Assessment

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description                                | Score | QA Test Coverage                                                  |
| ------- | -------- | ------------------------------------------ | ----- | ----------------------------------------------------------------- |
| R-01    | TECH     | Rule engine edge-trigger duplicates/misses | **9** | 9 unit tests + 3 integration tests covering all state transitions |
| R-02    | TECH     | SSE event ordering breaks                  | **6** | 1 unit test (transforms) + 1 integration test (full stream)       |
| R-03    | TECH     | BullMQ job loss / retry exhaustion         | **6** | 3 integration tests (job creation, retry, failure logging)        |
| R-04    | PERF     | Notification latency >2s p99               | **6** | 1 benchmark test (full pipeline timing)                           |
| R-05    | PERF     | AI first-token >2s                         | **6** | 1 integration test with mock parser                               |
| R-06    | BUS      | NL parsing incorrect drafts                | **6** | 3 unit tests (known I/O, unsupported metrics, field parsing)      |
| R-07    | SEC      | Cross-user data access                     | **6** | 3 integration tests (two-user harness, 404 on non-owned)          |

### Medium/Low-Priority Risks

| Risk ID | Category | Description                     | Score | QA Test Coverage                                                |
| ------- | -------- | ------------------------------- | ----- | --------------------------------------------------------------- |
| R-10    | DATA     | Soft delete inconsistency       | 4     | 2 integration tests (exclusion from list, create-delete-create) |
| R-11    | DATA     | Condition group validation gaps | 4     | 2 unit tests (all metrics, invalid metric rejection)            |
| R-12    | BUS      | Notification content errors     | 4     | 1 unit test (payload construction)                              |
| R-08    | OPS      | No CI/CD                        | 4     | Manual `vp check && vp test` gate                               |
| R-13    | SEC      | Client user_id bypass           | 3     | 1 integration test (body userId ignored)                        |
| R-14    | SEC      | AI draft leaks                  | 2     | 1 integration test (no confirmation = no alarm)                 |
| R-15    | PERF     | Bundle >300KB                   | 2     | Build size check                                                |
| R-16    | TECH     | Zustand pollution               | 2     | Store reset in beforeEach                                       |

---

## Entry Criteria

- [ ] Docker Compose test environment operational
- [ ] Auth middleware mock/test bypass available
- [ ] Drizzle seed factories built
- [ ] Playwright configured with storageState for auth sessions
- [ ] Mock-datasource WebSocket server running

## Exit Criteria

- [ ] All P0 tests passing (35/35)
- [ ] All P1 tests passing or failures triaged (20/20)
- [ ] No open critical/high-severity bugs
- [ ] CRITICAL risk R-01 has passing mitigation tests
- [ ] Bundle size <300KB gzip

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level** (what to focus on if time-constrained), NOT execution timing. See "Execution Strategy" for when tests run.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround + Affects majority of users

**Total P0:** 35 tests

| Test ID      | Requirement                                          | Test Level  | Risk Link  | Notes                 |
| ------------ | ---------------------------------------------------- | ----------- | ---------- | --------------------- |
| 1.1-UNIT-001 | Auth middleware extracts userId, ignores body userId | Unit        | R-07, R-13 | Security fundamental  |
| 1.1-INT-001  | Google OAuth creates user and session                | Integration | R-07       | FR1                   |
| 1.1-INT-002  | Unauthenticated request returns 401                  | Integration | R-07       | NFR12                 |
| 1.1-E2E-001  | Full Google OAuth login → dashboard                  | E2E         | R-07       | Critical user journey |
| 1.2-INT-001  | Logout invalidates session                           | Integration | R-07       | FR2                   |
| 1.2-E2E-001  | Logout → redirect to login                           | E2E         | R-07       | FR2                   |
| 1.3-INT-001  | Cross-user isolation (alarms, sessions, feedback)    | Integration | R-07       | NFR13                 |
| 2.3-UNIT-001 | AlarmParser correct output for known inputs          | Unit        | R-06       | FR6, NFR17            |
| 2.3-UNIT-002 | AlarmParser rejects unsupported metrics              | Unit        | R-06       | FR11                  |
| 2.4-UNIT-001 | Structured draft fields parse from AI response       | Unit        | R-06       | FR8                   |
| 2.3-INT-001  | NL message → SSE stream complete event sequence      | Integration | R-02       | FR7                   |
| 2.5-INT-001  | Confirm draft → POST /alarms → persisted             | Integration | R-14       | FR12, NFR15           |
| 2.5-INT-002  | Unconfirmed draft never persists                     | Integration | R-14       | NFR15                 |
| 2.5-E2E-001  | Full NL alarm creation flow                          | E2E         | R-06, R-14 | FR6-FR13              |
| 3.1-UNIT-001 | Condition group validates all 8 metrics x AND/OR     | Unit        | R-11       | FR19                  |
| 3.1-UNIT-002 | Condition group rejects unknown metrics              | Unit        | R-11       | FR19                  |
| 3.1-INT-001  | POST /alarms with server-side userId                 | Integration | R-07       | FR12, FR13            |
| 3.1-INT-002  | GET /alarms returns only user's alarms               | Integration | R-07       | FR14                  |
| 3.1-INT-004  | GET /alarms/:id returns 404 for non-owned            | Integration | R-07       | NFR13                 |
| 3.2-INT-001  | PATCH /alarms/:id updates fields                     | Integration | —          | FR16                  |
| 3.2-INT-002  | PATCH toggle enabled/disabled                        | Integration | —          | FR17                  |
| 3.2-INT-003  | DELETE soft delete sets deleted_at                   | Integration | R-10       | FR18                  |
| 3.2-INT-004  | Deleted alarm excluded from list and rule engine     | Integration | R-10       | FR18                  |
| 4.2-UNIT-001 | Edge trigger: false→true produces event              | Unit        | R-01       | FR23, NFR9            |
| 4.2-UNIT-002 | No-trigger: true→true no event                       | Unit        | R-01       | FR23, NFR9            |
| 4.2-UNIT-003 | Re-trigger: true→false→true                          | Unit        | R-01       | FR23                  |
| 4.2-UNIT-004 | Cooldown blocks trigger within period                | Unit        | R-01       | FR24                  |
| 4.2-UNIT-005 | Cooldown allows trigger after expiry                 | Unit        | R-01       | FR24                  |
| 4.2-UNIT-006 | Evaluate all 8 metric types                          | Unit        | R-01       | FR19, FR22            |
| 4.2-UNIT-007 | AND group: all conditions must be true               | Unit        | R-01       | FR19                  |
| 4.2-UNIT-008 | OR group: any condition triggers                     | Unit        | R-01       | FR19                  |
| 4.2-UNIT-009 | Multiple alarms per symbol independent               | Unit        | R-01       | FR22                  |
| 4.2-INT-001  | Tick → evaluate → BullMQ job created                 | Integration | R-01, R-03 | FR22, FR23            |
| 4.2-INT-002  | Duplicate trigger prevention end-to-end              | Integration | R-01       | NFR9                  |
| 4.3-UNIT-001 | Push payload includes all required fields            | Unit        | R-12       | FR25, FR26, FR29      |
| 4.3-INT-001  | BullMQ worker delivers push notification             | Integration | R-03       | FR27                  |

---

### P1 (High)

**Criteria:** Important features + Common workflows + Medium risk

**Total P1:** 20 tests

| Test ID      | Requirement                                 | Test Level  | Risk Link | Notes      |
| ------------ | ------------------------------------------- | ----------- | --------- | ---------- |
| 1.3-INT-002  | Non-owned resource returns 404 not 403      | Integration | R-07      | NFR13      |
| 1.1-E2E-002  | Session persists across tab navigation      | E2E         | —         | FR1        |
| 2.1-INT-001  | Create chat session                         | Integration | —         | FR4        |
| 2.3-UNIT-003 | SSE event transform functions correct       | Unit        | R-02      | FR7        |
| 2.3-INT-002  | AI first-token latency <2s with mock        | Integration | R-05      | NFR3       |
| 2.4-COMP-001 | Alarm editor renders and handles edits      | Component   | —         | FR9        |
| 2.1-INT-003  | Message history with pagination             | Integration | —         | FR10       |
| 2.2-INT-001  | Activate preset template                    | Integration | —         | FR20, FR21 |
| 3.1-INT-003  | GET /alarms/:id full detail                 | Integration | —         | FR15       |
| 3.2-INT-005  | Create-delete-create cycle                  | Integration | R-10      | FR18       |
| 3.1-E2E-001  | Alarm list page renders, navigate to detail | E2E         | —         | FR14, FR15 |
| 3.2-E2E-001  | Edit alarm → save → reflected               | E2E         | —         | FR16       |
| 3.2-E2E-002  | Toggle enable/disable immediate update      | E2E         | —         | FR17       |
| 3.2-E2E-003  | Delete alarm → removed from list            | E2E         | —         | FR18       |
| 4.3-INT-002  | Push delivery retry on failure              | Integration | R-03      | NFR10      |
| 4.3-INT-003  | Push failure after retries logged           | Integration | R-03      | NFR10      |
| 4.3-E2E-001  | Alarm triggers → browser push (background)  | E2E         | R-04      | FR27, FR28 |
| 4.4-INT-001  | Submit feedback useful/not useful           | Integration | —         | FR31, FR32 |
| 4.1-INT-001  | SSE reconnection within 5s                  | Integration | R-02      | NFR11      |
| 4.2-INT-003  | Deleted/disabled alarm excluded from engine | Integration | R-10      | FR17, FR18 |

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk + Edge cases

**Total P2:** 3 tests

| Test ID     | Requirement                               | Test Level  | Risk Link | Notes |
| ----------- | ----------------------------------------- | ----------- | --------- | ----- |
| 1.1-E2E-003 | Google OAuth error shows friendly message | E2E         | —         | FR1   |
| 2.1-INT-002 | List chat sessions with ownership filter  | Integration | R-07      | FR5   |
| 4.3-E2E-002 | Push sound differentiated by tier         | E2E         | —         | FR30  |

---

### P3 (Low)

**Criteria:** Nice-to-have + Benchmarks

**Total P3:** 2 tests

| Test ID     | Requirement                             | Test Level  | Notes          |
| ----------- | --------------------------------------- | ----------- | -------------- |
| 4.1-INT-002 | Tick evaluation cycle <500ms per symbol | Integration | NFR6 benchmark |
| 4.1-INT-003 | Full pipeline tick→push <2s p99         | Integration | NFR1 benchmark |

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless there's significant infrastructure overhead. Playwright parallelization handles 100s of tests in ~10-15 min.

### Every PR: Playwright + Vitest Tests (~10 min)

**All functional tests** (from any priority level):

- All unit tests (Vitest via `vp test`)
- All integration tests (Playwright `request` context)
- All E2E tests (Playwright browser)
- P3 benchmark tests included (fast, no external dependencies)
- Total: ~60 tests, parallelized

**Why run in PRs:** Fast feedback, no expensive infrastructure, Docker Compose is local.

### Nightly: Full Regression (~30 min)

- Same test suite with burn-in (3 runs, detect flaky tests)
- Report: pass rate by priority, flaky test list, coverage metrics

### Pre-Release: Manual Exploratory

- DevOps validation (Docker Compose deploy, health check)
- Bundle size verification (`vp build` output)
- Manual UI walkthrough for visual regressions

**Playwright Tags for Selective Execution:**

```bash
# Run only P0 tests (fastest feedback, ~3 min)
npx playwright test --grep @P0

# Run P0 + P1 tests (core functionality, ~8 min)
npx playwright test --grep "@P0|@P1"

# Run only security-related tests
npx playwright test --grep @Security

# Run full regression
npx playwright test
```

---

## QA Effort Estimate

| Priority       | Count  | Effort Range      | Notes                                                                                   |
| -------------- | ------ | ----------------- | --------------------------------------------------------------------------------------- |
| P0             | 35     | ~40–60 hours      | Rule engine (9 tests) highest complexity; shared auth fixtures reduce per-test overhead |
| P1             | 20     | ~20–35 hours      | SSE/BullMQ integration tests need async patterns                                        |
| P2             | 3      | ~3–8 hours        | Simple smoke tests                                                                      |
| P3             | 2      | ~2–5 hours        | Benchmarks need controlled data sets                                                    |
| Infrastructure | —      | ~10–15 hours      | Docker Compose config, factories, Playwright fixtures, auth storageState                |
| **Total**      | **60** | **~75–123 hours** | **1 developer, spread across implementation sprints**                                   |

---

## Implementation Planning Handoff

| Work Item                          | Owner       | Target     | Dependencies                  |
| ---------------------------------- | ----------- | ---------- | ----------------------------- |
| Drizzle seed factories             | Backend Dev | Pre-Epic 1 | Schema definitions ready      |
| Auth middleware test bypass        | Backend Dev | Pre-Epic 1 | Better-Auth integrated        |
| Playwright fixtures + storageState | QA          | Pre-Epic 1 | Auth bypass ready             |
| Tick source injectable interface   | Backend Dev | Pre-Epic 4 | Rule engine module scaffolded |
| BullMQ test event listeners        | Backend Dev | Epic 4     | BullMQ setup complete         |
| Rule engine unit tests (9)         | Backend Dev | Epic 4     | Tick interface ready          |
| Multi-user isolation harness       | QA          | Pre-Epic 1 | Auth factories ready          |

---

## Appendix A: Test Tagging Convention

```typescript
// Example: Rule engine edge-trigger test
test("4.2-UNIT-001: edge trigger false→true @P0 @RuleEngine", () => {
  const result = evaluateAlarm(alarm, tick, { lastMatchState: false });
  expect(result.triggered).toBe(true);
  expect(result.newMatchState).toBe(true);
});

// Example: Cross-user isolation test
test("1.3-INT-001: user cannot access other user alarms @P0 @Security", async ({ request }) => {
  // Setup: create alarm as User A
  const alarm = await createUserAlarm(userA, { symbol: "600000" });

  // Act: try to access as User B
  const response = await request.get(`/api/alarms/${alarm.id}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });

  expect(response.status()).toBe(404);
});
```

---

## Appendix B: Knowledge Base References

- **Risk Governance**: `risk-governance.md` — Risk scoring methodology (P x I)
- **Test Priorities Matrix**: `test-priorities-matrix.md` — P0-P3 criteria and decision tree
- **Test Levels Framework**: `test-levels-framework.md` — Unit/Integration/E2E selection guide
- **Test Quality**: `test-quality.md` — Definition of Done (no hard waits, <300 lines, <1.5 min)

---

**Generated by:** BMad TEA Agent
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
