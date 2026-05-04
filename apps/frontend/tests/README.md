# Market Frontend Test Suite

## Setup

```bash
# Install dependencies
vp install

# Install Playwright browsers
npx playwright install chromium

# Copy environment file
cp .env.example .env
# Fill in TEST_USER_EMAIL and TEST_USER_PASSWORD
```

## Running Tests

```bash
# Run all E2E tests
vp run test:e2e

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (visible browser)
npx playwright test --headed

# Run a specific test file
npx playwright test tests/e2e/auth.spec.ts

# Debug a test
npx playwright test --debug

# Run API-only tests (no browser)
npx playwright test tests/e2e/api-health.spec.ts
```

## Architecture

```
tests/
├── e2e/                    # End-to-end test files
│   ├── auth.spec.ts        # Authentication tests
│   ├── home.spec.ts        # Home page tests
│   └── api-health.spec.ts  # API health checks (no browser)
├── support/
│   ├── merged-fixtures.ts  # Single merged test object
│   ├── custom-fixtures.ts  # Project-specific fixtures
│   ├── global-setup.ts     # Auth session initialization
│   ├── auth/
│   │   └── auth-provider.ts
│   ├── factories/
│   │   ├── user-factory.ts
│   │   └── alarm-factory.ts
│   ├── helpers/
│   │   ├── api-client.ts   # API operation wrappers
│   │   ├── selectors.ts    # data-testid selectors
│   │   └── wait-utils.ts   # Common wait patterns
│   └── page-objects/       # (future)
```

### Fixtures

All tests import from `merged-fixtures.ts` which combines:

- `@seontechnologies/playwright-utils` fixtures (apiRequest, authSession, recurse, log)
- Custom project fixtures (testUser)

```typescript
import { test, expect } from "../support/merged-fixtures";
```

### Factories

Factories use `@faker-js/faker` for unique, parallel-safe test data:

```typescript
import { createUser } from "../support/factories/user-factory";
const admin = createUser({ role: "admin" });
```

## Best Practices

- Use `data-testid` selectors (see `selectors.ts`), not CSS selectors
- Seed data via API, not through the UI
- Use factory functions with explicit overrides to show test intent
- Each test must be isolated — no dependencies between tests
- Follow Given/When/Then structure in test descriptions

## CI Integration

```bash
# CI runs with retries and single worker
npx playwright test --reporter=list
```

Playwright config automatically adjusts for CI:

- `retries: 2` in CI, `0` locally
- `workers: 1` in CI
- HTML report generated at `playwright-report/`
