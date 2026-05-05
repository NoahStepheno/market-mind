# Story 1.2: Session Logout & Invalidation

Status: done

## Story

As a logged-in user,
I want to log out and invalidate my session,
so that my account remains secure when I stop using Market.

## Acceptance Criteria

1. **Given** a logged-in user on any page **When** the user clicks the logout action **Then** the system calls the logout endpoint **And** the session is invalidated server-side (refresh token revoked) **And** the browser redirects to /login.

2. **Given** a user has logged out **When** the user attempts to access a protected route with the old session token **Then** the system returns 401 Unauthorized **And** the frontend redirects to /login.

3. **Given** a logged-in user with an expired session **When** the user makes an authenticated request **Then** the system returns 401 **And** the frontend clears the local auth state and redirects to /login.

## Tasks / Subtasks

- [x] Task 1: Verify and improve backend logout endpoint (AC: #1, #2)
  - [x] 1.1 Read and verify `apps/backend/src/modules/auth/routes.ts` — `POST /auth/logout` correctly revokes the refresh token via `revokeRefreshToken()`
  - [x] 1.2 Read and verify `apps/backend/src/modules/auth/service.ts` — `revokeRefreshToken()` sets `revokedAt` on the matching token row
  - [x] 1.3 Ensure logout returns proper error response using `AppError` (not bare `HTTPException`) — currently uses `HTTPException` for invalid code in `consumeExchangeCodePayload`; logout endpoint itself returns `{ success: boolean }` which is fine

- [x] Task 2: Add backend logout tests (AC: #1, #2)
  - [x] 2.1 Add tests to `apps/backend/src/modules/auth/service.test.ts` — test `revokeRefreshToken()` for: valid token (revoked successfully), already-revoked token (returns false), non-existent token (returns false)
  - [x] 2.2 Create `apps/backend/src/modules/auth/routes.test.ts` or add to existing — test `POST /auth/logout` endpoint: valid refresh token returns `{ success: true }`, invalid/missing token returns error, revoked token returns `{ success: false }`

- [x] Task 3: Improve frontend 401 session-expiry handling (AC: #2, #3)
  - [x] 3.1 Update `apps/frontend/src/services/api.ts` — ensure the 401 retry flow properly distinguishes between "access token expired" (retry with refresh) and "session invalid" (refresh also fails → clearAuth + redirect). Current implementation already does this via `performRefresh()` calling `clearAuth()` on failure. Verify this works correctly.
  - [x] 3.2 Fix `ApiError.code` type from `number` to `string | number` — backend now returns domain error codes as strings (e.g., `"VALIDATION_ERROR"`) per Story 1.0 error framework changes. The `ApiErrorResponse` type in `types/auth.ts` is stale.
  - [x] 3.3 Update `apps/frontend/src/types/auth.ts` — change `ApiErrorResponse.code` from `number` to `string` to match backend error framework

- [x] Task 4: Fix ProtectedRoute selector issue (AC: #2, #3)
  - [x] 4.1 Update `apps/frontend/src/components/protected-route.tsx` — fix `useAuth((s) => s.isAuthenticated())` selector: this calls `isAuthenticated()` on every render, creating a new value each time. Change to `useAuth((s) => !!(s.user && s.refreshToken))` for stable selector reference (deferred issue from Story 1.1 review)

- [x] Task 5: Update home page logout button (AC: #1)
  - [x] 5.1 Update `apps/frontend/src/pages/home.tsx` — change "Log Out" button text to "退出登录" (all product UI must be Chinese per frontend CLAUDE.md)
  - [x] 5.2 Verify the logout flow: `handleLogout` calls `apiLogout(refreshToken)` → `clearAuth()` → `navigate("/login")`. Already implemented, verify it works.

- [x] Task 6: Add frontend auth session tests (AC: #2, #3)
  - [x] 6.1 Create `apps/frontend/src/services/api.test.ts` — test `apiFetch` 401 handling: refresh succeeds (retry with new token), refresh fails (clearAuth + redirect), no refresh token (skip retry)
  - [x] 6.2 Create `apps/frontend/src/components/protected-route.test.tsx` — test ProtectedRoute: authenticated renders children, unauthenticated redirects to /login

- [x] Task 7: Minor cleanup (AC: general quality)
  - [x] 7.1 Verify `store/auth.ts` `clearAuth()` clears all persisted fields — check that zustand persist's `partialize` correctly handles null values (it should, since null is a valid value for the persisted fields)

## Dev Notes

### CRITICAL: This is a BROWNFIELD story — most of the system is already built

The logout functionality is **substantially implemented**. The backend endpoint, frontend API call, auth state clearing, and home page logout button all exist and work. This story is primarily about **verification, test coverage, type fixes, and minor improvements**. Do NOT rewrite existing working code.

### What Already Exists (DO NOT recreate)

**Backend (`apps/backend/src/modules/auth/`):**

- `routes.ts:356-360` — `POST /auth/logout` accepts `{ refreshToken }` body, calls `revokeRefreshToken()`, returns `{ success: boolean }`
- `service.ts:262-283` — `revokeRefreshToken(rawRefreshToken)` hashes the token, looks up the unrevoked row, sets `revokedAt` timestamp, returns boolean
- `middleware.ts` — `requireAuth` middleware extracts Bearer JWT, verifies it, sets `authUser` on context. Returns 401 if invalid/expired.
- `token.ts` — JWT sign/verify, refresh token generation, hashing

**Frontend:**

- `services/api.ts:124-129` — `logout(refreshToken)` calls `POST /api/v1/auth/logout`
- `services/api.ts:85-102` — 401 handling: tries refresh, if fails → `clearAuth()` + redirect to `/login`
- `services/api.ts:19-38` — `performRefresh()` calls refresh endpoint, on failure → `clearAuth()` + redirect
- `store/auth.ts:46-51` — `clearAuth()` sets user/tokens/tokenExpiresAt to null
- `store/auth.ts:54-60` — Zustand persist `partialize` persists only `refreshToken`, `user`, `tokenExpiresAt`
- `components/protected-route.tsx` — `ProtectedRoute` redirects to `/login` if not authenticated
- `pages/home.tsx:11-16` — `handleLogout()` calls `apiLogout()` → `clearAuth()` → navigate to `/login`
- `pages/home.tsx:37-41` — "Log Out" button (needs Chinese text)

### Known Architecture Limitation: Access Token Invalidation

The backend uses stateless JWT access tokens (15-minute TTL). The `POST /auth/logout` endpoint revokes the **refresh token** but does NOT invalidate the **access token**.

**Impact:** After logout, the access token remains technically valid for up to 15 minutes. However:

- The frontend immediately clears the access token from state, so no further requests are made from the logged-out browser
- If someone intercepts the old access token within the TTL window, they could make authenticated requests
- After the TTL expires, the access token becomes invalid and cannot be refreshed (refresh token revoked)

**Decision:** This is acceptable for V1 (<10 users, behind-login SPA). A Redis-based access token blocklist is a Phase 2 enhancement. The AC's intent ("old session token returns 401") is satisfied after the access token TTL expires.

### Auth Flow for This Story

```
User clicks "退出登录"
    ↓
Frontend: logout(refreshToken) → POST /api/v1/auth/logout
    ↓
Backend: revokeRefreshToken() → UPDATE refresh_tokens SET revokedAt = now()
    ↓
Backend: Returns { success: true }
    ↓
Frontend: clearAuth() → sets user/tokens to null
    ↓
Zustand persist → overwrites localStorage with null values
    ↓
Navigate to /login (replace: true)
```

**Post-logout access attempt flow:**

```
Old access token sent → Backend requireAuth → JWT expired? → 401
    ↓
Frontend: 401 → tries refresh → refresh token revoked → 401
    ↓
Frontend: clearAuth() + redirect to /login
```

### File Locations

All auth-related files are in established locations — do not move or restructure:

```
apps/backend/src/modules/auth/
├── routes.ts        # Auth endpoints (including POST /logout)
├── service.ts       # revokeRefreshToken(), rotateRefreshToken()
├── token.ts         # JWT + token utilities
├── middleware.ts     # requireAuth Hono middleware
├── config.ts        # Better-Auth config (unused but keep)
├── service.test.ts  # Existing tests (add revokeRefreshToken tests)
├── token.test.ts    # Existing token tests (12 tests)
└── middleware.test.ts # Existing middleware tests (6 tests)

apps/frontend/src/
├── pages/home.tsx          # Has logout button (fix Chinese text)
├── pages/login.tsx         # Login page (no changes needed)
├── components/protected-route.tsx   # Fix selector (deferred from 1.1)
├── store/auth.ts           # Zustand auth store (verify clearAuth works)
├── services/api.ts         # HTTP client (fix ApiError.code type)
└── types/auth.ts           # Fix ApiErrorResponse.code type
```

### Cross-Dependency with Story 1.3

AC1 mentions "the logout action in the global navigation." The global navigation (sticky top bar with Chat/Alarms/Settings) is Story 1.3's scope. This story focuses on the **logout flow itself** — the backend invalidation, frontend state clearing, and 401 handling. The home page's existing logout button serves as the UI entry point for testing. Story 1.3 will place the logout action in the global navigation.

### Design System Notes

The home page "Log Out" button currently uses inline styles (`bg-apple-ink text-apple-on-dark rounded-apple-sm`). When Story 1.3 builds the global nav, the logout button will be restyled. For this story, just fix the Chinese text.

### Testing Standards

- Tests co-located with source files (`service.test.ts` next to `service.ts`)
- Run `vp test` (not raw vitest)
- Run `vp check` for lint + type checks
- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Backend tests mock Drizzle DB calls via `vi.mock()`
- Frontend tests for api.ts should mock `fetch` global

### References

- [Source: epics.md#Story 1.2] — Acceptance criteria for session logout & invalidation
- [Source: architecture.md#Authentication & Security] — Auth middleware pattern, requireAuth + c.get("authUser").id
- [Source: architecture.md#NFR12] — User identity from server-side auth only
- [Source: architecture.md#Error Handling] — Unified error framework (AppError, not bare HTTPException)
- [Source: architecture.md#API Response Format] — Error response shape `{ message, code }`
- [Source: existing apps/backend/src/modules/auth/routes.ts:356-360] — Current logout endpoint
- [Source: existing apps/backend/src/modules/auth/service.ts:262-283] — revokeRefreshToken implementation
- [Source: existing apps/frontend/src/services/api.ts:85-102] — 401 retry logic
- [Source: existing apps/frontend/src/services/api.ts:124-129] — logout() API call
- [Source: existing apps/frontend/src/store/auth.ts:46-51] — clearAuth() implementation
- [Source: existing apps/frontend/src/pages/home.tsx:11-16] — handleLogout() implementation
- [Source: Story 1.1 dev notes] — Architecture deviation: Better-Auth vs custom JWT
- [Source: Story 1.1 review findings] — Deferred ProtectedRoute selector issue
- [Source: Story 1.0] — Error framework changes (code now string, not number)

### Project Structure Notes

- Backend module structure follows: `routes.ts` + `service.ts` + `middleware.ts` per domain
- Frontend uses kebab-case file names, PascalCase components
- All product UI text should be Chinese (per frontend CLAUDE.md)
- Auth module already exists with established patterns — follow them, don't create new patterns

## Dev Agent Record

### Agent Model Used

Claude GLM-5

### Debug Log References

### Completion Notes List

- ✅ Task 1: Verified backend logout endpoint — `POST /auth/logout` and `revokeRefreshToken()` work correctly, no code changes needed
- ✅ Task 2: Added 6 backend tests — 3 for `revokeRefreshToken()` in service.test.ts, 3 for `POST /auth/logout` endpoint in routes.test.ts
- ✅ Task 3: Fixed `ApiError.code` type to `string | number` and `ApiErrorResponse.code` to `string`; verified 401 retry flow works correctly
- ✅ Task 4: Fixed ProtectedRoute selector from `s.isAuthenticated()` to `!!(s.user && s.refreshToken)` for stable reference
- ✅ Task 5: Changed logout button text from "Log Out" to "退出登录"; verified logout flow
- ✅ Task 6: Added 6 frontend tests — 3 for apiFetch 401 handling, 3 for auth selector logic
- ✅ Task 7: Verified `clearAuth()` correctly sets all fields to null; `partialize` handles null values correctly

### File List

- `apps/backend/src/modules/auth/service.test.ts` — Added revokeRefreshToken tests (valid, revoked, non-existent token)
- `apps/backend/src/modules/auth/routes.test.ts` — Created: POST /auth/logout endpoint tests
- `apps/frontend/src/services/api.ts` — Fixed ApiError.code type to `string | number`
- `apps/frontend/src/types/auth.ts` — Fixed ApiErrorResponse.code type to `string`
- `apps/frontend/src/components/protected-route.tsx` — Fixed selector for stable reference
- `apps/frontend/src/pages/home.tsx` — Changed button text to "退出登录"
- `apps/frontend/src/services/api.test.ts` — Created: apiFetch 401 handling tests
- `apps/frontend/src/components/protected-route.test.tsx` — Created: auth selector tests
- `apps/frontend/vite.config.ts` — Updated to support vitest with test config
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status

### Review Findings

- [x] [Review][Decision→Patch] ProtectedRoute test doesn't test component rendering/redirect behavior [`apps/frontend/src/components/protected-route.test.tsx`] — Fixed: rewrote test to use renderToString with mocked Navigate, verifying component renders children when authenticated and Navigate to /login when not.

- [x] [Review][Patch] `performRefresh` hardcodes numeric `401` as error code instead of reading from response [`apps/frontend/src/services/api.ts:29`] — Fixed: now parses error response body for code before throwing.

- [x] [Review][Patch] `vite.config.ts` missing `environment: "happy-dom"` in test config [`apps/frontend/vite.config.ts:14-16`] — Fixed: added `environment: "happy-dom"` to test config.

- [x] [Review][Patch] "clears auth and redirects" test doesn't verify redirect behavior [`apps/frontend/src/services/api.test.ts`] — Fixed: added `expect(window.location.href).toBe("/login")` assertion.

- [x] [Review][Defer] Shared mutable `mockTx` variable across test suites [`apps/backend/src/modules/auth/service.test.ts`] — deferred, pre-existing pattern
- [x] [Review][Defer] `routes.test.ts` mock type signature incomplete and missing 500 error test [`apps/backend/src/modules/auth/routes.test.ts:8`] — deferred, cosmetic/nice-to-have
- [x] [Review][Defer] `handleLogout` silently catches all errors [`.catch(() => {})`] [`apps/frontend/src/pages/home.tsx:13`] — deferred, pre-existing pattern
- [x] [Review][Defer] No test for 401 retry "only once" behavior [`apps/frontend/src/services/api.test.ts`] — deferred, correct by code inspection
- [x] [Review][Defer] `revokeRefreshToken` SELECT-UPDATE race under concurrent calls [`apps/backend/src/modules/auth/service.ts:264-281`] — deferred, pre-existing, accepted for V1
- [x] [Review][Defer] Access token remains valid for 15 min after logout (AC2 partial gap) — deferred, known V1 limitation per dev notes
