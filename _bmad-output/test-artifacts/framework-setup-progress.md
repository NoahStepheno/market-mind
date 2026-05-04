---
stepsCompleted:
  [
    "step-01-preflight",
    "step-02-select-framework",
    "step-03-scaffold-framework",
    "step-04-docs-and-scripts",
    "step-05-validate-and-summary",
  ]
lastStep: "step-05-validate-and-summary"
lastSaved: "2026-05-04"
---

# Test Framework Setup — Progress

## Step 1: Preflight Checks

### Stack Detection

- **Detected stack**: `fullstack`
- **Monorepo**: bun workspaces with 3 apps/packages
- **Frontend** (`apps/frontend`): React + Vite + TailwindCSS + shadcn + Zustand + react-router-dom
- **Backend** (`apps/backend`): Hono + Drizzle ORM + PostgreSQL + Better Auth + Pino logging
- **Utils** (`packages/utils`): Shared TypeScript package
- **Toolchain**: Vite+ (`vp` CLI), bun@1.3.13

### Prerequisites Validation

- [x] `package.json` exists at root and in subprojects
- [x] No existing E2E framework config (no playwright.config._, cypress.config._, cypress.json)
- [x] No conflicting backend test framework config
- [x] Vite config files present in all subprojects
- [x] Architecture docs available: `DESIGN.md`, `_bmad-output/planning-artifacts/architecture.md`

### Existing Test State

- 1 unit test file: `packages/utils/tests/index.test.ts`
- Backend has `vp test` script configured
- Frontend has no test scripts yet

### Context Docs

- `apps/frontend/docs/DESIGN-apple.md` — UI design system
- `docs/designs/market-domain-model.md` — domain model design
- Product language: Chinese

## Step 2: Framework Selection

### Decision

- **E2E / Browser**: Playwright
  - Multi-browser support (Chromium, Firefox, WebKit)
  - API + UI integration testing for fullstack monorepo
  - High CI parallelism, auto-wait, network interception
  - Strong Vite+ ecosystem compatibility

- **Backend / Unit**: Vitest (via `vp test`)
  - Backend is TypeScript (Hono), shares Vitest toolchain with frontend
  - Vite+ bundles Vitest natively — no separate install
  - Backend already has `vp test` script configured
  - Unified test runner reduces maintenance overhead

## Step 3: Scaffold Framework

### Directory Structure Created

```
apps/frontend/
├── playwright.config.ts
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── home.spec.ts
│   │   └── api-health.spec.ts
│   └── support/
│       ├── merged-fixtures.ts
│       ├── custom-fixtures.ts
│       ├── global-setup.ts
│       ├── auth/
│       │   └── auth-provider.ts
│       ├── factories/
│       │   ├── user-factory.ts
│       │   └── alarm-factory.ts
│       ├── helpers/
│       │   ├── api-client.ts
│       │   ├── selectors.ts
│       │   └── wait-utils.ts
│       └── page-objects/
```

### Dependencies Installed

- @playwright/test@1.59.1
- @seontechnologies/playwright-utils@4.3.0
- @faker-js/faker@10.4.0

### Configuration

- Playwright config with Chromium project, auto web server
- Timeouts: 60s test, 15s action, 30s navigation
- Artifacts: trace, screenshot, video on failure
- .env.example with TEST_ENV, BASE_URL, API_URL
- .gitignore updated with test artifact patterns

### Execution Mode: agent-team (2 workers parallel)

## Step 4: Documentation & Scripts

### Documentation

- Created `apps/frontend/tests/README.md` with setup, running, architecture, best practices, and CI notes

### Package Scripts Added (apps/frontend/package.json)

- `test:e2e`: `playwright test`
- `test:e2e:ui`: `playwright test --ui`
- `test:e2e:debug`: `playwright test --debug`

## Step 5: Validate & Summary

### Validation Results

- [x] Playwright discovers all 6 tests in 3 files (chromium project)
- [x] No import/compilation errors in merged-fixtures
- [x] Auth provider correctly implements AuthProvider interface
- [x] Global setup properly registers provider and initializes auth
- [x] All directory structure matches conventions
- [x] No hardcoded credentials in files
- [x] .env.example uses placeholders
- [x] .gitignore covers test artifacts

### Files Created (16 total)

| File                                       | Purpose                            |
| ------------------------------------------ | ---------------------------------- |
| `playwright.config.ts`                     | Playwright configuration           |
| `tests/e2e/auth.spec.ts`                   | Authentication E2E tests (3 tests) |
| `tests/e2e/home.spec.ts`                   | Home page E2E tests (2 tests)      |
| `tests/e2e/api-health.spec.ts`             | API health check (1 test)          |
| `tests/support/merged-fixtures.ts`         | Combined test fixtures             |
| `tests/support/custom-fixtures.ts`         | Project-specific fixtures          |
| `tests/support/global-setup.ts`            | Auth initialization                |
| `tests/support/auth/auth-provider.ts`      | Better Auth JWT provider           |
| `tests/support/factories/user-factory.ts`  | User data factory                  |
| `tests/support/factories/alarm-factory.ts` | Alarm data factory                 |
| `tests/support/helpers/api-client.ts`      | API operation wrappers             |
| `tests/support/helpers/selectors.ts`       | data-testid selectors              |
| `tests/support/helpers/wait-utils.ts`      | Common wait patterns               |
| `tests/README.md`                          | Test suite documentation           |
| `.env.example`                             | Environment template               |
| `.gitignore`                               | Updated with test artifacts        |

### Knowledge Fragments Applied

- overview.md — Playwright Utils fixture architecture
- fixtures-composition.md — mergeTests pattern
- data-factories.md — faker-based factories with overrides
- auth-session.md — AuthProvider interface for Better Auth

### Next Steps for User

1. Copy `.env.example` to `.env` and fill in credentials
2. Run `npx playwright install chromium` to install browser
3. Run `vp run test:e2e` to verify setup
4. Add `data-testid` attributes to frontend components as needed
