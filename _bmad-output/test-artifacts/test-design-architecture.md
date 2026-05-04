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
  - docs/designs/market-domain-model.md
  - docs/designs/market-alarm-domain.md
  - docs/designs/market-identity-access-domain.md
  - docs/designs/market-message-domain.md
  - docs/designs/market-frontend-design.md
---

# Test Design for Architecture: Market

**Purpose:** Architectural concerns, testability gaps, and NFR requirements. Serves as a contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-05-04
**Author:** TEA Master Test Architect
**Status:** Architecture Review Pending
**Project:** market
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md`
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** Full-stack alarm trading platform — authentication, NL alarm creation, alarm management, real-time alert engine with push notifications.

**Architecture:**

- Hono + Node.js backend with Drizzle ORM / PostgreSQL
- React + Zustand + assistant-ui frontend
- In-process rule engine with BullMQ + Redis trigger queue
- SSE streaming for chat, Web Push for notifications

**Risk Summary:**

- **Total risks:** 16
- **CRITICAL (9):** 1 — rule engine edge-triggered evaluation
- **HIGH (6):** 6 — SSE/BullMQ pipeline, latency, AI parsing, data isolation
- **Test effort:** ~60 tests (~75–123 hours)

---

## Quick Guide

### BLOCKERS - Team Must Decide

1. **T-1: No test data seeding APIs** — Tests need factory-based data injection via API or script. Build Drizzle seed factories + `test-setup.ts` helper (Backend Dev)
2. **T-3: Rule engine tick source not injectable** — Unit tests cannot control tick timing. Abstract tick source into injectable interface so tests can feed controlled tick sequences (Backend Dev)
3. **T-5: Better-Auth mockability** — Google OAuth flow requires external provider. Provide auth middleware mock or test-mode bypass for API integration tests (Backend Dev)

### HIGH PRIORITY - Team Should Validate

1. **R-01: Rule engine edge-trigger correctness** — Must have exhaustive unit tests for every state transition before integration testing begins (Backend Dev, pre-Epic 4)
2. **R-07: Cross-user data isolation** — Multi-user test harness needed; verify 404 on non-owned resources (Backend Dev, pre-Epic 1)
3. **T-6: BullMQ async pipeline observability** — Add BullMQ event listeners for test assertions on job completion/failure (Backend Dev, Epic 4)

### INFO ONLY - Solutions Provided

1. **Test strategy:** Integration-heavy (48%) with unit tests for pure logic and E2E for critical journeys only
2. **Tooling:** Playwright (E2E) + Vitest via Vite+ (Unit/Integration) + Docker Compose test environment
3. **Execution:** PR gate <10min, Nightly <30min, Weekly full regression <60min
4. **Coverage:** 60 test scenarios across 4 epics, P0-P3 risk-based prioritization
5. **Quality gates:** P0 = 100% pass, P1 >= 95%, coverage >= 80%

---

## Risk Assessment

**Total risks:** 16 (7 high-priority score >= 6, 5 medium, 4 low)

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description                                              | P   | I   | Score | Mitigation                                                               | Owner       |
| ------- | -------- | -------------------------------------------------------- | --- | --- | ----- | ------------------------------------------------------------------------ | ----------- |
| R-01    | TECH     | Edge-triggered rule engine duplicates or misses triggers | 3   | 3   | **9** | Unit test every state transition; integration test with controlled ticks | Backend Dev |
| R-02    | TECH     | SSE event ordering breaks under concurrent messages      | 2   | 3   | **6** | Unit test SSE transforms; integration test parallel streams              | Backend Dev |
| R-03    | TECH     | BullMQ notification job loss or silent retry exhaustion  | 2   | 3   | **6** | Test retry paths with forced failures; add job status polling            | Backend Dev |
| R-04    | PERF     | Event-to-notification latency exceeds 2s p99             | 2   | 3   | **6** | Benchmark tick→trigger→push pipeline; monitor tickLatencyMs              | Backend Dev |
| R-05    | PERF     | AI first-token latency exceeds 2s (external model)       | 3   | 2   | **6** | Mock AI for non-AI tests; latency benchmark with real GLM-5              | Backend Dev |
| R-06    | BUS      | NL parsing produces incorrect alarm drafts               | 3   | 2   | **6** | Test AlarmParser with known I/O pairs; test all 8 metrics                | Backend Dev |
| R-07    | SEC      | Cross-user data isolation fails                          | 2   | 3   | **6** | Two-user API tests; verify 404 on non-owned resources                    | Backend Dev |

### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description                              | P   | I   | Score | Mitigation                                        | Owner       |
| ------- | -------- | ---------------------------------------- | --- | --- | ----- | ------------------------------------------------- | ----------- |
| R-08    | OPS      | No CI/CD pipeline                        | 2   | 2   | 4     | V1: local `vp check && vp test` gate              | DevOps      |
| R-09    | OPS      | No test data seeding APIs                | 2   | 2   | 4     | Build Drizzle factory functions                   | QA          |
| R-10    | DATA     | Soft delete inconsistency in rule engine | 2   | 2   | 4     | Verify `deleted_at IS NULL` filter in queries     | Backend Dev |
| R-11    | DATA     | Condition group JSONB validation gaps    | 2   | 2   | 4     | Zod schema at API boundary; test all metric types | Backend Dev |
| R-12    | BUS      | Notification content accuracy errors     | 2   | 2   | 4     | Test push payload with varied alarm configs       | Backend Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description                           | P   | I   | Score | Action                                     |
| ------- | -------- | ------------------------------------- | --- | --- | ----- | ------------------------------------------ |
| R-13    | SEC      | Client-supplied user_id bypass        | 1   | 3   | 3     | Monitor — Better-Auth middleware mitigates |
| R-14    | SEC      | AI draft leaks to alarm domain        | 1   | 2   | 2     | Monitor — confirmation gate mitigates      |
| R-15    | PERF     | Bundle exceeds 300KB gzip             | 1   | 2   | 2     | Monitor — `vp build` output check          |
| R-16    | TECH     | Zustand store pollution between tests | 1   | 2   | 2     | Monitor — reset in beforeEach              |

---

## Testability Concerns and Architectural Gaps

### ACTIONABLE CONCERNS

#### Blockers to Fast Feedback

| Concern                                 | Impact                                        | What Architecture Must Provide                                               | Owner       |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| No state seeding APIs                   | Cannot parallelize tests; slow setup          | Build Drizzle factory functions + test-setup.ts helper                       | Backend Dev |
| Rule engine tick source not injectable  | Cannot unit test evaluation deterministically | Abstract tick source into injectable interface                               | Backend Dev |
| Better-Auth not mockable in test mode   | OAuth flow blocks API integration tests       | Add auth middleware mock or test-mode bypass                                 | Backend Dev |
| SSE stream hard to assert               | Cannot unit test event protocol               | Test SSE transform functions at unit level; integration with real connection | Backend Dev |
| Web Push requires external service      | Cannot test push delivery locally             | Mock web-push library; test payload construction at unit level               | Backend Dev |
| BullMQ async pipeline has no test hooks | Cannot observe job completion in tests        | Add BullMQ event listeners; use `recurse` polling pattern                    | Backend Dev |

### Testability Assessment Summary

#### What Works Well

- AlarmParser abstract interface fully mockable (model swappable without architecture changes)
- REST API covers 100% of business logic (headless testing possible)
- Per-module typed error codes enable deterministic assertions
- Zod validation at API boundary provides clear invalid input testing
- Docker Compose with mock-datasource gives local environment parity
- Drizzle schema-as-code allows reproducible database state
- Flat condition groups (8 metrics, AND/OR only) bound the test input space

#### Accepted Trade-offs

- No CI/CD pipeline for V1 — acceptable for solo developer (local `vp check && vp test` gate)
- No distributed tracing — acceptable for single-server deployment
- No API rate limiting — acceptable for <10 beta users

---

## Risk Mitigation Plans

### R-01: Edge-triggered rule engine (Score: 9 CRITICAL)

**Mitigation Strategy:**

1. Abstract tick source into injectable interface
2. Unit test all state transitions: false->true (trigger), true->true (no-op), true->false->true (re-trigger)
3. Unit test cooldown boundary (1s before/after expiry)
4. Unit test per-alarm independence (multiple alarms per symbol)
5. Integration test full tick->evaluate->trigger->queue pipeline

**Owner:** Backend Dev | **Timeline:** Pre-Epic 4 | **Verification:** All 9 rule engine unit tests pass

### R-07: Cross-user data isolation (Score: 6 HIGH)

**Mitigation Strategy:**

1. Create two-user test harness with separate auth sessions
2. API test: User A cannot GET/PATCH/DELETE User B's alarms, sessions, feedback
3. API test: Non-owned resources return 404 (not 403)
4. Verify `userId` filter applied on all service-layer queries

**Owner:** Backend Dev | **Timeline:** Pre-Epic 1 | **Verification:** Multi-user isolation tests pass

### R-02/R-03: Async pipeline reliability (Score: 6 HIGH)

**Mitigation Strategy:**

1. Unit test SSE event transform functions (7 event types)
2. Integration test SSE connection with parallel message streams
3. Test BullMQ retry paths with forced failures
4. Add BullMQ event listeners for test observability
5. Test notification retry exhaustion and error logging

**Owner:** Backend Dev | **Timeline:** Epic 4 | **Verification:** SSE and BullMQ integration tests pass

---

## Assumptions and Dependencies

### Assumptions

1. V1 is single-server Docker Compose (no distributed testing needed)
2. Better-Auth session management is reliable (no custom session testing)
3. GLM-5 AI model API has acceptable uptime (mock for non-AI tests)
4. PostgreSQL JSONB indexes perform adequately for condition_group queries

### Dependencies

1. Docker Compose test environment operational — Required pre-Epic 1
2. mock-datasource WebSocket server available — Required pre-Epic 4
3. Test data factories and auth fixtures built — Required pre-Epic 1

---

**Next Steps for Architecture Team:**

1. Review Quick Guide and prioritize blockers (T-1, T-3, T-5)
2. Assign owners and timelines for high-priority risks (R-01, R-07, R-02/R-03)
3. Validate assumptions and dependencies
4. Refer to companion QA doc (`test-design-qa.md`) for test execution details
