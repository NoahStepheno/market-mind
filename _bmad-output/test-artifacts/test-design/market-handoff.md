---
title: "TEA Test Design - BMAD Handoff Document"
version: "1.0"
workflowType: "testarch-test-design-handoff"
inputDocuments:
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design-qa.md
sourceWorkflow: "testarch-test-design"
generatedBy: "TEA Master Test Architect"
generatedAt: "2026-05-04"
projectName: "market"
---

# TEA - BMAD Integration Handoff

## Purpose

This document bridges TEA's test design outputs with BMAD's epic/story decomposition workflow (`create-epics-and-stories`). It provides structured integration guidance so that quality requirements, risk assessments, and test strategies flow into implementation planning.

## TEA Artifacts Inventory

| Artifact                 | Path                                                      | BMAD Integration Point                                |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| Test Design Architecture | `_bmad-output/test-artifacts/test-design-architecture.md` | Pre-implementation blockers, testability requirements |
| Test Design QA           | `_bmad-output/test-artifacts/test-design-qa.md`           | Story acceptance criteria, test scenarios             |
| Test Design Progress     | `_bmad-output/test-artifacts/test-design-progress.md`     | Workflow state tracking                               |

## Epic-Level Integration Guidance

### Risk References

| Epic                                | P0/P1 Risks                                                            | Pre-Implementation Requirements                                   |
| ----------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Epic 1: Auth & Foundation           | R-07 (cross-user isolation)                                            | Auth middleware test bypass; multi-user test harness              |
| Epic 2: NL Alarm Creation           | R-06 (AI parsing), R-14 (draft containment)                            | AlarmParser mock; SSE test infrastructure                         |
| Epic 3: Alarm Management            | R-10 (soft delete), R-11 (condition validation)                        | Condition group Zod schema complete                               |
| Epic 4: Alert Engine & Notification | R-01 (rule engine CRITICAL), R-02 (SSE), R-03 (BullMQ), R-04 (latency) | Tick injectable interface; BullMQ test listeners; mock-datasource |

### Quality Gates

| Epic   | Gate Criteria                                              | Blocker if Not Met                                          |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Epic 1 | Multi-user isolation tests pass (R-07)                     | Cannot proceed to Epic 2/3 (data isolation is foundational) |
| Epic 2 | AlarmParser tests pass with known I/O (R-06)               | AI parsing quality blocks alarm creation trust              |
| Epic 3 | Soft delete + condition validation tests pass (R-10, R-11) | Data integrity issues in alarm lifecycle                    |
| Epic 4 | All 9 rule engine unit tests pass (R-01)                   | Cannot ship notification feature with incorrect triggers    |

## Story-Level Integration Guidance

### P0/P1 Test Scenarios to Story Acceptance Criteria

| Story                    | Test IDs                                                    | Must-Pass Acceptance Criteria                                     |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| 1-1: Google OAuth        | 1.1-INT-001, 1.1-INT-002, 1.1-E2E-001                       | User can sign up/login; unauthenticated requests return 401       |
| 1-2: Session Logout      | 1.2-INT-001, 1.2-E2E-001                                    | Logout invalidates session; subsequent requests return 401        |
| 1-3: Auth Navigation     | 1.3-INT-001, 1.3-INT-002                                    | User A cannot access User B resources; non-owned returns 404      |
| 2-3: AI NL Parsing       | 2.3-UNIT-001, 2.3-UNIT-002, 2.3-INT-001                     | Known inputs produce correct drafts; unsupported metrics rejected |
| 2-4: Structured Card     | 2.4-UNIT-001, 2.4-COMP-001                                  | Draft fields parse correctly; editor renders and handles edits    |
| 2-5: Alarm Persistence   | 2.5-INT-001, 2.5-INT-002, 2.5-E2E-001                       | Confirmed draft persists; unconfirmed never persists              |
| 3-1: Alarm List/Detail   | 3.1-UNIT-001, 3.1-INT-001, 3.1-INT-002                      | Condition validation works; CRUD with correct ownership           |
| 3-2: Alarm Edit/Delete   | 3.2-INT-001 through 3.2-INT-005                             | Edit, toggle, soft delete all work; deleted excluded from engine  |
| 4-2: Edge-Triggered Eval | 4.2-UNIT-001 through 4.2-UNIT-009, 4.2-INT-001, 4.2-INT-002 | All state transitions correct; zero duplicates; cooldown enforced |
| 4-3: Push Notification   | 4.3-UNIT-001, 4.3-INT-001 through 4.3-INT-003               | Payload correct; delivery retry works; failures logged            |

### Data-TestId Requirements

| Component                     | Recommended data-testid | Used By     |
| ----------------------------- | ----------------------- | ----------- |
| Login button                  | `login-button`          | 1.1-E2E-001 |
| User avatar/session indicator | `user-session`          | 1.1-E2E-001 |
| Chat input composer           | `chat-composer`         | 2.5-E2E-001 |
| Alarm preview card            | `alarm-preview`         | 2.5-E2E-001 |
| Alarm confirm button          | `alarm-confirm`         | 2.5-E2E-001 |
| Alarm list container          | `alarm-list`            | 3.1-E2E-001 |
| Alarm detail page             | `alarm-detail`          | 3.1-E2E-001 |
| Alarm edit form               | `alarm-edit-form`       | 3.2-E2E-001 |
| Alarm toggle switch           | `alarm-toggle`          | 3.2-E2E-002 |
| Alarm delete button           | `alarm-delete`          | 3.2-E2E-003 |
| Toast notification            | `toast`                 | 3.2-E2E-003 |

## Risk-to-Story Mapping

| Risk ID | Category | P x I | Recommended Story/Epic                  | Test Level         |
| ------- | -------- | ----- | --------------------------------------- | ------------------ |
| R-01    | TECH     | 9     | Epic 4: 4-2 (edge-triggered evaluation) | Unit + Integration |
| R-02    | TECH     | 6     | Epic 2: 2-3 (SSE streaming)             | Unit + Integration |
| R-03    | TECH     | 6     | Epic 4: 4-3 (notification delivery)     | Integration        |
| R-04    | PERF     | 6     | Epic 4: full pipeline benchmark         | Integration (P3)   |
| R-05    | PERF     | 6     | Epic 2: 2-3 (AI integration)            | Integration        |
| R-06    | BUS      | 6     | Epic 2: 2-3 (NL parsing)                | Unit               |
| R-07    | SEC      | 6     | Epic 1: 1-1, 1-3 (auth + isolation)     | Integration        |
| R-10    | DATA     | 4     | Epic 3: 3-2 (soft delete)               | Integration        |
| R-11    | DATA     | 4     | Epic 3: 3-1 (condition validation)      | Unit               |
| R-12    | BUS      | 4     | Epic 4: 4-3 (push payload)              | Unit               |

## Recommended BMAD - TEA Workflow Sequence

1. **TEA Test Design** (completed) -> produced this handoff document
2. **BMAD Dev Story** -> developers implement stories with test-first guidance from this document
3. **TEA ATDD** (`bmad-testarch-atdd`) -> generates acceptance tests per story
4. **TEA Automate** (`bmad-testarch-automate`) -> generates full test suite
5. **TEA Trace** (`bmad-testarch-trace`) -> validates coverage completeness

## Phase Transition Quality Gates

| From Phase           | To Phase             | Gate Criteria                                                    |
| -------------------- | -------------------- | ---------------------------------------------------------------- |
| Test Design          | Story Implementation | All P0 risks have mitigation strategy; test infrastructure ready |
| Story Implementation | ATDD                 | Story acceptance criteria include P0 test scenarios              |
| ATDD                 | Full Automation      | Failing acceptance tests exist for all P0/P1 scenarios           |
| Full Automation      | Release              | Trace matrix shows >= 80% coverage of P0/P1 requirements         |
