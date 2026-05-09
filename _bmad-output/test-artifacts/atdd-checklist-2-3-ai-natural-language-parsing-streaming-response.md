---
stepsCompleted:
  [
    "step-01-preflight-and-context",
    "step-02-generation-mode",
    "step-03-test-strategy",
    "step-04c-aggregate",
    "step-05-validate-and-complete",
  ]
lastStep: "step-05-validate-and-complete"
lastSaved: "2026-05-09"
storyId: "2.3"
storyKey: "2-3-ai-natural-language-parsing-streaming-response"
storyFile: "_bmad-output/implementation-artifacts/2-3-ai-natural-language-parsing-streaming-response.md"
atddChecklistPath: "_bmad-output/test-artifacts/atdd-checklist-2-3-ai-natural-language-parsing-streaming-response.md"
generatedTestFiles:
  - "apps/frontend/tests/api/chat-ai-streaming.spec.ts"
  - "apps/frontend/tests/e2e/chat-ai-streaming.spec.ts"
inputDocuments:
  - "_bmad-output/implementation-artifacts/2-3-ai-natural-language-parsing-streaming-response.md"
  - "apps/frontend/playwright.config.ts"
  - ".claude/skills/bmad-testarch-atdd/resources/tea-index.csv"
  - ".claude/skills/bmad-testarch-atdd/resources/knowledge/data-factories.md"
  - ".claude/skills/bmad-testarch-atdd/resources/knowledge/test-quality.md"
  - ".claude/skills/bmad-testarch-atdd/resources/knowledge/test-healing-patterns.md"
  - ".claude/skills/bmad-testarch-atdd/resources/knowledge/selector-resilience.md"
  - ".claude/skills/bmad-testarch-atdd/resources/knowledge/test-levels-framework.md"
---

# ATDD Checklist — Story 2.3: AI Natural Language Parsing & Streaming Response

## TDD Red Phase (Current)

All test scaffolds generated with `test.skip()`. No placeholder assertions.

## Story Summary

**Story ID**: 2.3
**Status**: review (already implemented)
**Primary Test Level**: E2E + API

As a user, I want to type a natural language description and receive an AI-parsed structured response in real time, so that I can see my trading intent translated into actionable alarm conditions within seconds.

## Acceptance Criteria Coverage

| AC  | Description                                     | E2E Tests        | API Tests        | Status                   |
| --- | ----------------------------------------------- | ---------------- | ---------------- | ------------------------ |
| #1  | AlarmParser abstract interface, GLM-5 swappable | —                | —                | Backend unit tests exist |
| #2  | ConditionGroup Zod validation (8 metrics)       | —                | —                | Backend unit tests exist |
| #3  | NL message → SSE streaming <2s                  | E2E-001          | API-001, API-002 | Scaffolded               |
| #4  | SSE event protocol (7 event types)              | E2E-003          | API-002          | Scaffolded               |
| #5  | Frontend SSE adapter progressive render         | E2E-003          | —                | Scaffolded               |
| #6  | Unsupported metric → text explanation           | E2E-004, E2E-005 | API-004          | Scaffolded               |
| #7  | Unsupported response UIBlock (deferred)         | —                | —                | Story 2.4                |
| #8  | Template click auto-fill (deferred)             | —                | —                | Story 2.4                |
| #9  | SSE disconnect auto-reconnect (deferred)        | E2E-006          | —                | Scaffolded (V1 partial)  |

## Red-Phase Test Scaffolds Created

### API Tests: `tests/api/chat-ai-streaming.spec.ts` (5 tests)

| Test ID     | Priority | Description                                        |
| ----------- | -------- | -------------------------------------------------- |
| 2.3-API-001 | P0       | Create assistant placeholder and return stream URL |
| 2.3-API-002 | P0       | SSE events in correct protocol sequence            |
| 2.3-API-003 | P1       | Alarm draft in SSE for supported metric            |
| 2.3-API-004 | P1       | Text-only response for unsupported metric          |
| 2.3-API-005 | P2       | 400 error for missing X-Message-Id header          |

### E2E Tests: `tests/e2e/chat-ai-streaming.spec.ts` (6 tests, 1 duplicate count from describe)

| Test ID     | Priority | Description                                            |
| ----------- | -------- | ------------------------------------------------------ |
| 2.3-E2E-001 | P0       | User submits NL message and sees streaming AI response |
| 2.3-E2E-002 | P0       | Draft alarm preview for valid NL request               |
| 2.3-E2E-003 | P0       | Assistant response renders progressively via SSE       |
| 2.3-E2E-004 | P1       | Unsupported metric shows Chinese text explanation      |
| 2.3-E2E-005 | P1       | Unsupported response includes available metrics info   |
| 2.3-E2E-006 | P2       | SSE disconnect displays connection lost message        |

## Data Factories

Using existing factories:

- `tests/support/factories/user-factory.ts` — user data generation
- `tests/support/factories/alarm-factory.ts` — alarm condition data

No new factories needed for ATDD scaffolds.

## Fixtures

Using existing fixtures:

- `tests/support/merged-fixtures.ts` — merged test fixture with auth
- `tests/support/helpers/selectors.ts` — centralized selectors

## Required data-testid Attributes

| testid                         | Target Element                  | Tests            | Status   |
| ------------------------------ | ------------------------------- | ---------------- | -------- |
| `chat-composer`                | Chat input composer             | E2E-001–006      | Existing |
| `chat-send`                    | Send button                     | E2E-001–006      | Existing |
| `chat-message-assistant`       | Assistant message bubble        | E2E-001, E2E-004 | **New**  |
| `chat-streaming-indicator`     | Streaming in-progress indicator | E2E-003          | **New**  |
| `alarm-draft-card`             | Draft alarm preview card        | E2E-002          | Existing |
| `chat-unsupported-explanation` | Unsupported metric explanation  | E2E-005          | **New**  |
| `chat-connection-error`        | Connection lost message         | E2E-006          | **New**  |

## Implementation Checklist

### Task-by-Task Activation (Green Phase)

For each test, follow this workflow:

1. Remove `test.skip()` from the target test
2. Run: `vp test --filter="chat-ai-streaming"`
3. Verify test FAILS (confirms red phase)
4. Implement the feature code
5. Run test again → verify PASS (green phase)
6. Commit

### Activation Order (Recommended)

1. **API-005** (P2) — Missing header validation (simplest, validates API setup)
2. **API-001** (P0) — Message creation endpoint
3. **API-002** (P0) — SSE event protocol
4. **API-003** (P1) — Draft alarm in SSE
5. **API-004** (P1) — Unsupported metric text response
6. **E2E-001** (P0) — Full chat streaming flow
7. **E2E-002** (P0) — Draft alarm preview
8. **E2E-003** (P0) — Progressive rendering
9. **E2E-004** (P1) — Unsupported metric explanation
10. **E2E-005** (P1) — Available metrics display
11. **E2E-006** (P2) — Connection error handling

### data-testid Additions Required

Add these `data-testid` attributes to frontend components:

- `chat-message-assistant` → assistant message bubble in chat thread
- `chat-streaming-indicator` → visible while SSE streaming is active
- `chat-unsupported-explanation` → unsupported metric response container
- `chat-connection-error` → connection lost message container

## Red-Green-Refactor Workflow

```
RED Phase (Current) ✅
├── Test scaffolds generated with test.skip()
├── All tests assert expected behavior
└── Tests will fail when activated before implementation

GREEN Phase (Next)
├── Activate tests one at a time (remove test.skip())
├── Implement feature to make test pass
├── Verify: test goes from FAIL → PASS
└── Commit after each green

REFACTOR Phase (After Green)
├── Review test and implementation code
├── Extract common setup into fixtures
├── Clean up test data and selectors
└── Ensure no regressions
```

## Execution Commands

```bash
# Run all ATDD tests (will show as skipped)
vp test --filter="chat-ai-streaming"

# Run specific test file
npx playwright test tests/api/chat-ai-streaming.spec.ts
npx playwright test tests/e2e/chat-ai-streaming.spec.ts

# Run in headed mode (for debugging)
npx playwright test tests/e2e/chat-ai-streaming.spec.ts --headed

# Debug specific test
npx playwright test tests/e2e/chat-ai-streaming.spec.ts --debug

# Run with specific project
npx playwright test tests/e2e/chat-ai-streaming.spec.ts --project=chromium
```

## Next Steps for DEV Team

1. **Add data-testid attributes** to chat components (see table above)
2. **Update `selectors.ts`** with new testid entries
3. **Activate tests one at a time** following the activation order
4. **Verify RED → GREEN** for each test before moving to next
5. **All tests require authenticated session** — ensure auth fixture works

## Summary

- **Total Tests**: 11 (all with `test.skip()`)
- **API Tests**: 5
- **E2E Tests**: 6
- **Priority Coverage**: P0=5, P1=4, P2=2, P3=0
- **New data-testid**: 4 attributes
- **Knowledge Fragments**: data-factories, test-quality, selector-resilience, test-levels-framework, test-healing-patterns
- **Execution Mode**: Sequential
