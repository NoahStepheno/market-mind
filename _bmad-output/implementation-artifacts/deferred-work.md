# Deferred Work

## Deferred from: code review of 1-0-project-scaffold-shared-infrastructure (2026-05-04)

- Non-integer port coerced to NaN — `Number(process.env.PORT)` produces NaN for non-numeric strings. Pre-existing in `apps/backend/src/index.ts:67`. Same issue in `apps/datasource/src/index.ts:5`.
- Logger side effects at import time — `getLogger()` triggers `mkdirSync` at module load. Pre-existing in `apps/backend/src/common/logging/logger.ts:28`. Can cause test environment crashes.
- c.req.json() invalid JSON returns 500 — Malformed JSON body causes SyntaxError that falls through to generic 500 handler instead of 400. Pre-existing across route handlers.
- Stream endpoint messageId exposure — `messageId` in query params may appear in logs/proxies. Pre-existing in `apps/backend/src/modules/chat/routes.ts:97-106`.
- AppError code field is bare string — No compile-time enforcement that error codes match the defined constants. Design tradeoff, not a bug.

## Deferred from: code review of 1-1-google-oauth-sign-up-login (2026-05-04)

- Concurrent Google OAuth logins for same email can create duplicate users — SELECT then INSERT without locking; one INSERT fails on UNIQUE, returns 500. Pre-existing in `apps/backend/src/modules/auth/service.ts`.
- `verifyOAuthState` error swallowed as unhandled 500 — JWT_SECRET rotation during in-flight OAuth causes opaque 500. Pre-existing in `apps/backend/src/modules/auth/routes.ts:258`.
- WeChat upsert: existingAccount with null existingUser causes crash — falls through to INSERT with duplicate providerAccountId. Pre-existing in `apps/backend/src/modules/auth/service.ts:108-137`.
- `api.ts` double refresh race condition — narrow window between checking and setting `refreshPromise`. Pre-existing in `apps/frontend/src/services/api.ts:46-53`.
- `GoogleIdTokenSchema` does not check `email_verified` claim — unverified email could allow account takeover. Pre-existing in `apps/backend/src/modules/auth/routes.ts:19-24`.
- `oauthLoginCodeStore` not shared across Node.js cluster workers — in-memory Map breaks behind load balancer. Pre-existing, acceptable for V1. `apps/backend/src/modules/auth/routes.ts:61`.
- `FRONTEND_AUTH_CALLBACK_URL` malformed value causes unhandled 500 — `new URL()` throws after tokens issued. Pre-existing in `apps/backend/src/modules/auth/routes.ts:282`.
- `ProtectedRoute` selector creates new function each render — `useAuth((s) => s.isAuthenticated())` pattern. Pre-existing in `apps/frontend/src/components/protected-route.tsx:8`.
- `callback.tsx` `exchangeCode` call has no timeout — slow backend leaves user on spinner indefinitely. Pre-existing in `apps/frontend/src/pages/callback.tsx:23-37`.
- `callback.tsx` error path leaks OAuth error details in URL — `error`/`error_description` query params remain visible. Pre-existing.
- Backend PORT=3001 but frontend `api.ts` defaults to port 3000 — requires `VITE_API_URL` to be set correctly. Pre-existing config mismatch.
- `service.test.ts` shared mutable `mockTx` lacks `beforeEach` reset — each test reassigns but no explicit isolation. Low risk.
- E2E selectors use `:has-text()` instead of `data-testid` — text-based selectors are more fragile than test IDs. Style preference.
- E2E tests removed all error/failure path coverage — old tests had invalid credential and error message tests; new tests are happy-path only. V1 scope.
- `oauthLoginCodeStore` grows unboundedly if only consumption occurs — cleanup only runs during creation calls. Pre-existing.

## Deferred from: code review of 1-2-session-logout-invalidation (2026-05-05)

- Shared mutable `mockTx` variable across test suites in `service.test.ts` — pre-existing pattern from `upsertUserFromGoogle` tests, not introduced by this story
- `routes.test.ts` mock type signature `vi.fn<() => Promise<boolean>>()` should include `(token: string)` parameter; missing 500 error test — cosmetic, no runtime impact
- `handleLogout` in `home.tsx:13` uses `.catch(() => {})` silently swallowing all logout API errors — pre-existing pattern, correct UX but no logging/monitoring hook
- No test verifying `apiFetch` 401 retry "only once" behavior — correct by code inspection, nice-to-have test
- `revokeRefreshToken` SELECT-UPDATE race condition under concurrent calls — pre-existing code, UPDATE WHERE clause provides safety, accepted for V1 scale (<10 users)
- Access token remains valid for 15 minutes after logout (AC2 partial gap) — known V1 limitation, Redis blocklist planned for V2

## Deferred from: code review of story 1-3 (2026-05-05)

- Auth store hydration flash — Zustand persist hydrates asynchronously, causing brief redirect to /login on first render. Pre-existing from Story 1.2.
- No Better-Auth session validation on app load — No mechanism validates persisted tokens on app start. AC5 says "verify, not rebuild."
- iOS safe area not accounted for — Mobile bottom nav overlaps iPhone home indicator. Not in current scope.
- HomePage export is dead code — home.tsx exports HomePage but nothing imports it. Cleanup item.
- Suspense wrapper without lazy — App.tsx wraps Routes in Suspense but no lazy loading exists. Dead overhead.
- Active vs inactive nav link distinguishability — 1.6:1 contrast between states on black background. Design choice.
- Mobile logout — PO决定添加到设置页面，留给后续Settings Story实现。不阻塞当前Story。
