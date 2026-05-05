# Story 1.3: Authenticated Navigation & Design System Foundation

Status: done

## Story

As a returning user,
I want the system to automatically recognize me and show the main application shell,
so that I can navigate between Chat, Alarms, and Settings without re-authenticating.

## Acceptance Criteria

1. **Given** all DESIGN.md tokens (13 colors, 12 typography scales, 4 radius levels, 8 spacing levels) **When** the TailwindCSS configuration is built **Then** all tokens are mapped under `theme.extend` with semantic names (`bg-canvas`, `text-ink`, `rounded-pill`, etc.) **And** no component uses hardcoded color, size, or radius values per UX-DR1.

2. **Given** a logged-in user **When** any page loads **Then** a sticky top navigation bar is displayed: 44px height, pure black background, fine-print 12px text **And** the bar shows Chat, Alarms, and Settings entries **And** the active entry uses white text, inactive uses muted gray **And** no badges, counters, or notification icons are shown per UX-DR11.

3. **Given** a logged-in user on a desktop (≥1024px) **When** viewing the global navigation **Then** the nav appears as a horizontal sticky top bar.

4. **Given** a logged-in user on mobile (<768px) **When** viewing the global navigation **Then** the nav transitions to a bottom tab bar with Chat, Alarms, Settings entries per UX-DR12.

5. **Given** the auth zustand store is configured **When** a logged-in user opens the app **Then** the store loads session data from Better-Auth **And** all protected routes render without redirect **And** `apiFetch()` auto-attaches Bearer token to every API call.

6. **Given** a user visits / (root) **When** the user is authenticated **Then** the app redirects to /chat.

7. **Given** a user visits any protected route (/chat, /alarms, /settings) **When** the user is not authenticated **Then** the app redirects to /login.

## Tasks / Subtasks

- [x] Task 1: Complete DESIGN.md token mapping in TailwindCSS (AC: #1)
  - [x] 1.1 Add missing color CSS variables to `globals.css`: `--apple-surface-pearl: #fafafc`, `--apple-surface-tile-2: #2a2a2c`, `--apple-surface-tile-3: #252527`, `--apple-surface-black: #000000`, `--apple-chip-translucent: #d2d2d7`
  - [x] 1.2 Add missing `apple.*` color entries in `tailwind.config.js` to match: `surface-pearl`, `surface-tile-2`, `surface-tile-3`, `surface-black`, `chip-translucent`
  - [x] 1.3 Add typography scale to `tailwind.config.js` under `theme.extend.fontSize` — map all 12 typography tokens from DESIGN.md (hero-display through fine-print) as `[fontSize, { lineHeight, letterSpacing, fontWeight }]` tuples so they can be used as `text-hero-display`, `text-body`, etc.
  - [x] 1.4 Add font family tokens to `tailwind.config.js` under `theme.extend.fontFamily`: `apple-display: ["SF Pro Display", "system-ui", "-apple-system", "sans-serif"]`, `apple-text: ["SF Pro Text", "system-ui", "-apple-system", "sans-serif"]`

- [x] Task 2: Build GlobalNavigation component (AC: #2, #3, #4)
  - [x] 2.1 Create `apps/frontend/src/components/global-navigation.tsx` — a single component that renders as sticky top bar on desktop and bottom tab bar on mobile
  - [x] 2.2 Desktop (≥1024px): `<header>` with `bg-[#000000] h-11 sticky top-0 z-50`, content: "market" logo/wordmark left, nav items (Chat / Alarms / Settings) centered or right, logout + avatar right
  - [x] 2.3 Mobile (<768px): `<nav>` with `bg-[#000000] fixed bottom-0 inset-x-0 h-11 z-50`, 3 tab items with icons, active state white text, inactive muted gray
  - [x] 2.4 Nav items use `{typography.fine-print}` (12px/400/1.0/-0.12px) — use `text-apple-fine-print` from new typography scale
  - [x] 2.5 Active nav item: white text (`text-white`). Inactive: muted gray (`text-apple-body-muted`). No badges, counters, or notification icons.
  - [x] 2.6 Use `useLocation()` from react-router-dom to determine active route. Map: `/chat*` → Chat active, `/alarms*` → Alarms active, `/settings*` → Settings active
  - [x] 2.7 Add logout button in desktop nav: reuse existing "退出登录" text, use `button-dark-utility` component spec (bg-ink, text-on-dark, rounded-sm, 8px×15px padding)
  - [x] 2.8 Include user avatar thumbnail in desktop nav (from `useAuth((s) => s.user?.avatarUrl)`)
  - [x] 2.9 Responsive breakpoint: use TailwindCSS `md:` (768px) for bottom-tab display and `lg:` (1024px) for full top-bar display. At 768–1023px show top bar (tablet uses top bar per UX-DR12)

- [x] Task 3: Create AppLayout wrapper component (AC: #2)
  - [x] 3.1 Create `apps/frontend/src/components/app-layout.tsx` — wraps authenticated page content with GlobalNavigation + main content area
  - [x] 3.2 Layout structure: `<div className="min-h-screen bg-apple-parchment font-apple-text">` → `<GlobalNavigation />` → `<main>` with appropriate padding (top padding for top bar on desktop, bottom padding for tab bar on mobile)
  - [x] 3.3 Move the logout button from `home.tsx` header into `GlobalNavigation` (the home page header becomes obsolete)

- [x] Task 4: Update routing and page structure (AC: #5, #6, #7)
  - [x] 4.1 Update `App.tsx` — remove the `/chat → /home` temporary redirect. Add `/chat`, `/alarms`, `/settings` routes wrapped in `<ProtectedRoute>` and `<AppLayout>`
  - [x] 4.2 Create placeholder pages: `apps/frontend/src/pages/chat.tsx` (empty centered content), `apps/frontend/src/pages/alarms.tsx`, `apps/frontend/src/pages/settings.tsx` — minimal placeholders with correct page title
  - [x] 4.3 Update root route: `/` → `<Navigate to="/chat" replace />` (remove `/home` redirect)
  - [x] 4.4 Keep `/home` route temporarily but redirect to `/chat` for backward compatibility
  - [x] 4.5 Update `home.tsx` to redirect to `/chat` or remove it if fully replaced by AppLayout

- [x] Task 5: Verify auth store and API client (AC: #5)
  - [x] 5.1 Verify `store/auth.ts` loads session from persisted localStorage on app start (zustand persist middleware already handles this)
  - [x] 5.2 Verify `apiFetch()` auto-attaches Bearer token via `getValidAccessToken()` — already implemented, confirm no regression
  - [x] 5.3 Verify `ProtectedRoute` redirects unauthenticated users to `/login` — already implemented in `protected-route.tsx`

- [x] Task 6: Tests (AC: #1, #2, #3, #4)
  - [x] 6.1 Create `apps/frontend/src/components/global-navigation.test.tsx` — test: renders nav items, active item has white text, logout button visible
  - [x] 6.2 Create `apps/frontend/src/components/app-layout.test.tsx` — test: renders GlobalNavigation + children, applies correct padding

- [x] Task 7: Remove home page logout button (AC: #2, cleanup)
  - [x] 7.1 The logout button currently in `home.tsx` header moves to `GlobalNavigation`. Update `home.tsx` to remove its header (AppLayout provides it) or redirect to `/chat`

## Dev Notes

### CRITICAL: This is a BROWNFIELD story — design tokens are partially configured

The TailwindCSS configuration already has **most** color tokens, spacing tokens, and border-radius tokens. The main gaps are:

1. 5 missing color tokens (surface-pearl, surface-tile-2, surface-tile-3, surface-black, chip-translucent)
2. No typography scale utilities (fontSize with lineHeight + letterSpacing + fontWeight tuples)
3. No formal fontFamily tokens in TailwindCSS config

The auth system, ProtectedRoute, and apiFetch are already working from Stories 1.1 and 1.2. This story verifies them, doesn't rebuild them.

### What Already Exists (DO NOT recreate)

**Auth system (Stories 1.1, 1.2):**

- `store/auth.ts` — Zustand with persist, `isAuthenticated()`, `clearAuth()`, `setAuth()`, `setTokens()`. Selector fixed to `!!(s.user && s.refreshToken)` for stable reference.
- `services/api.ts` — `apiFetch()` with auto Bearer token, 401 retry with refresh, concurrent refresh dedup
- `components/protected-route.tsx` — redirects to `/login` if not authenticated
- `types/auth.ts` — User, AuthTokens, AuthExchangeResponse types

**Existing design tokens in `globals.css`:**

- 12 Apple color CSS variables defined in `:root` (primary, ink, canvas, parchment, hairline, etc.)
- `.font-apple-display` and `.font-apple-text` classes (CSS layer)
- shadcn CSS variables (--background, --foreground, etc.)

**Existing tailwind.config.js mappings:**

- `colors.apple.*` — 13 entries (primary, primary-focus, primary-on-dark, ink, body-on-dark, body-muted, ink-muted-80, ink-muted-48, canvas, parchment, surface-tile-1, hairline, divider-soft, on-primary, on-dark)
- `borderRadius.apple-*` — xs, sm, md, lg, pill
- `spacing.apple-*` — xxs through section
- `plugins: [require("tailwindcss-animate")]`

**Existing pages:**

- `pages/login.tsx` — login page (no changes needed)
- `pages/callback.tsx` — OAuth callback (no changes needed)
- `pages/home.tsx` — temporary landing page with header containing logout button + "Welcome" text

**Existing routing in `App.tsx`:**

- `/login` — LoginPage
- `/auth/callback` — CallbackPage
- `/home` — ProtectedRoute → HomePage
- `/chat` — redirects to `/home` (temporary)
- `/` — redirects to `/home`
- `*` — redirects to `/home`

### Token Gap Analysis: DESIGN.md vs Current TailwindCSS Config

**Colors MISSING from globals.css and tailwind config (must add):**

| DESIGN.md Token    | Hex       | Tailwind Class              |
| ------------------ | --------- | --------------------------- |
| `surface-pearl`    | `#fafafc` | `bg-apple-surface-pearl`    |
| `surface-tile-2`   | `#2a2a2c` | `bg-apple-surface-tile-2`   |
| `surface-tile-3`   | `#252527` | `bg-apple-surface-tile-3`   |
| `surface-black`    | `#000000` | `bg-apple-surface-black`    |
| `chip-translucent` | `#d2d2d7` | `bg-apple-chip-translucent` |

**Typography scale — NOT in TailwindCSS config (must add):**

Add under `theme.extend.fontSize` as `[fontSize, { lineHeight, letterSpacing, fontWeight }]` tuples:

| Token Name       | Tailwind Class        | Size | Weight | LineHeight | LetterSpacing |
| ---------------- | --------------------- | ---- | ------ | ---------- | ------------- |
| `hero-display`   | `text-hero-display`   | 56px | 600    | 1.07       | -0.028em      |
| `display-lg`     | `text-display-lg`     | 40px | 600    | 1.1        | 0             |
| `display-md`     | `text-display-md`     | 34px | 600    | 1.47       | -0.0374em     |
| `lead`           | `text-lead`           | 28px | 400    | 1.14       | 0.0196em      |
| `tagline`        | `text-tagline`        | 21px | 600    | 1.19       | 0.0231em      |
| `body-strong`    | `text-body-strong`    | 17px | 600    | 1.24       | -0.0374em     |
| `body`           | `text-body`           | 17px | 400    | 1.47       | -0.0374em     |
| `caption`        | `text-caption`        | 14px | 400    | 1.43       | -0.0224em     |
| `fine-print`     | `text-fine-print`     | 12px | 400    | 1.0        | -0.012em      |
| `button-primary` | `text-button-primary` | 17px | 400    | 1.0        | -0.0374em     |
| `button-utility` | `text-button-utility` | 14px | 400    | 1.29       | -0.0224em     |

**Font families — NOT in TailwindCSS config (must add):**

Add under `theme.extend.fontFamily`:

```
"apple-display": ['"SF Pro Display"', "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
"apple-text": ['"SF Pro Text"', "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
```

### Global Navigation Design Specification

Per UX-DR11 and DESIGN.md `{component.global-nav}`:

**Desktop top bar (≥768px):**

```
┌─────────────────────────────────────────────────────────────┐
│ market    Chat   Alarms   Settings    [avatar] 退出登录     │
│  (#000 bg, h-11, text: fine-print 12px, sticky top-0)      │
└─────────────────────────────────────────────────────────────┘
```

- Background: `#000000` (surface-black)
- Height: 44px (`h-11`)
- Sticky: `sticky top-0 z-50`
- Logo/wordmark: "market" in `text-white font-apple-display` at tagline size
- Nav items: "Chat", "Alarms", "Settings" in `text-fine-print` (12px/400/1.0/-0.12px)
- Active item: `text-white`. Inactive: `text-apple-body-muted` (#cccccc)
- Logout button: `button-dark-utility` spec — `bg-apple-ink text-apple-on-dark rounded-apple-sm px-[15px] py-2 text-button-utility active:scale-95`
- Avatar: 32px round, right-aligned
- Content max-width: ~980px centered with `mx-auto`

**Mobile bottom tab bar (<768px):**

```
┌─────────────────────────────────┐
│   💬        🔔        ⚙️        │
│  Chat     Alarms    Settings    │
│  (#000 bg, h-11, fixed bottom)  │
└─────────────────────────────────┘
```

- Same background, height, typography
- 3 equal-width tab items with small text labels
- Active: `text-white`. Inactive: `text-apple-body-muted`
- Fixed to bottom: `fixed bottom-0 inset-x-0 z-50`
- Main content needs `pb-11` on mobile to prevent content hiding behind tab bar

**Responsive behavior:**

- `hidden md:flex` for top bar
- `md:hidden` for bottom tab bar
- At 768–1023px (tablet): top bar still shown (UX-DR12 says nav transitions at <768px only)

### Auth Flow Verification

The auth flow from previous stories is working. Verify, do not rebuild:

```
App loads → zustand persist hydrates from localStorage
    → user + refreshToken present → isAuthenticated = true
    → ProtectedRoute renders children
    → apiFetch auto-attaches Bearer token via getValidAccessToken()

App loads → no stored auth → ProtectedRoute redirects to /login
```

**Key:** `ProtectedRoute` uses `!!(s.user && s.refreshToken)` as selector (fixed in Story 1.2). This is a stable reference. Do NOT change back to `s.isAuthenticated()`.

### Route Architecture After This Story

```
/login              → LoginPage (public)
/auth/callback      → CallbackPage (public)
/                   → Navigate to /chat
/chat               → ProtectedRoute → AppLayout → ChatPage (placeholder)
/alarms             → ProtectedRoute → AppLayout → AlarmsPage (placeholder)
/settings           → ProtectedRoute → AppLayout → SettingsPage (placeholder)
/home               → Navigate to /chat (backward compat)
*                   → Navigate to /chat
```

### File Locations

**Files to CREATE:**

```
apps/frontend/src/components/global-navigation.tsx   # Global nav component
apps/frontend/src/components/app-layout.tsx          # Authenticated layout wrapper
apps/frontend/src/pages/chat.tsx                     # /chat placeholder page
apps/frontend/src/pages/alarms.tsx                   # /alarms placeholder page
apps/frontend/src/pages/settings.tsx                 # /settings placeholder page
apps/frontend/src/components/global-navigation.test.tsx  # Nav tests
apps/frontend/src/components/app-layout.test.tsx         # Layout tests
```

**Files to UPDATE:**

```
apps/frontend/src/globals.css        # Add 5 missing CSS color variables
tailwind.config.js                   # Add typography scale, fontFamily, 5 colors
apps/frontend/src/App.tsx            # Update routing, add AppLayout
apps/frontend/src/pages/home.tsx     # Remove header (AppLayout provides nav) or redirect to /chat
```

**Files to VERIFY (do NOT modify):**

```
apps/frontend/src/store/auth.ts           # Zustand auth store (already working)
apps/frontend/src/services/api.ts         # apiFetch with Bearer token (already working)
apps/frontend/src/components/protected-route.tsx  # Auth guard (already working)
apps/frontend/src/pages/login.tsx         # Login page (no changes)
apps/frontend/src/pages/callback.tsx      # OAuth callback (no changes)
```

### Design System Rules (from DESIGN.md)

- **One accent rule:** Only Action Blue (`#0066cc`) for interactive elements. No second accent color.
- **No shadows on chrome:** Zero shadows on buttons, cards, nav. The single shadow is for product imagery only.
- **No weight 500:** Typography ladder is 300 / 400 / 600. No 500 weight.
- **Body at 17px:** Never reduce to 16px.
- **Pill radius for actions only:** `rounded-pill` (9999px) reserved for primary actions and search input.
- **Global nav pure black:** `#000000` is reserved for nav background only.
- **All product UI text in Chinese:** Nav items, buttons, labels — all Chinese.
- **Press state:** `transform: scale(0.95)` on all buttons.

### Cross-Dependency with Epic 2

Story 2.1 (Chat Session Management & /chat Page) will build the actual `/chat` page content. This story creates the route and a placeholder. The placeholder should be minimal — a centered "聊天" heading or similar — not a designed page.

### Previous Story Learnings

**From Story 1.1 (Google OAuth):**

- Better-Auth is configured but unused — custom JWT flow is the actual implementation. Do NOT attempt Better-Auth migration.
- Post-login redirect changed from `/home` to `/chat` — `/chat` currently redirects to `/home` as placeholder.
- Button styling must follow DESIGN.md component specs precisely (Action Blue pill for primary, bg-ink for dark utility).
- All product UI text must be Chinese per frontend CLAUDE.md.

**From Story 1.2 (Session Logout):**

- ProtectedRoute selector fixed to `!!(s.user && s.refreshToken)` for stable reference — do NOT revert to `s.isAuthenticated()`.
- `ApiError.code` type is `string | number` (backend returns domain error codes as strings).
- `clearAuth()` correctly sets all fields to null; zustand persist's `partialize` handles null values.
- Home page logout button text is "退出登录" — move this to GlobalNavigation.
- The home page header has logout button + avatar — this becomes the GlobalNavigation.
- `handleLogout` silently catches errors with `.catch(() => {})` — accepted for V1, preserve this pattern.

**From Story 1.0 (Project Scaffold):**

- Run `vp check` and `vp test` before finishing (not raw vitest).
- Import test utilities from `vite-plus/test`, NOT from `vitest`.
- Tests co-located with source files (`*.test.tsx` next to `*.tsx`).
- `vite.config.ts` has test config with `environment: "happy-dom"`.

### Testing Standards

- Tests co-located with source files
- Run `vp test` (not raw vitest)
- Run `vp check` for lint + type checks
- Import test utilities from `vite-plus/test` (NOT from `vitest`)
- Frontend tests mock `react-router-dom` hooks (`useLocation`, `useNavigate`) via `vi.mock()`
- Test environment: `happy-dom` (configured in `vite.config.ts`)

### References

- [Source: epics.md#Story 1.3] — Acceptance criteria for navigation & design system foundation
- [Source: architecture.md#Frontend Architecture] — Zustand stores, react-router-dom v7, shadcn/ui, TailwindCSS
- [Source: architecture.md#AR11] — Zustand store pattern (session-store, chat-store, alarms-store)
- [Source: architecture.md#AR12] — Vite+ toolchain constraints
- [Source: architecture.md#AR16] — Naming conventions (kebab-case files, PascalCase components)
- [Source: architecture.md#UX-DR1] — All DESIGN.md tokens mapped to TailwindCSS, zero hardcoded values
- [Source: architecture.md#UX-DR11] — Global nav specification (sticky top bar, 44px height, pure black bg)
- [Source: architecture.md#UX-DR12] — Responsive breakpoints (desktop ≥1024px, mobile <768px bottom tab bar)
- [Source: DESIGN.md#Colors] — 13 color tokens (5 missing from current config)
- [Source: DESIGN.md#Typography] — 12 typography scales (none in current TailwindCSS config)
- [Source: DESIGN.md#rounded] — 5 radius tokens (all present in current config)
- [Source: DESIGN.md#spacing] — 8 spacing tokens (all present in current config)
- [Source: DESIGN.md#Components] — global-nav spec: bg surface-black, h-44px, typography fine-print
- [Source: ux-design-specification.md#Navigation Patterns] — Global nav: sticky top bar, no badges, active white/inactive muted
- [Source: ux-design-specification.md#Responsive Strategy] — Desktop-first, mobile nav to bottom tab at <768px
- [Source: existing globals.css] — Current CSS variables and font-family classes
- [Source: existing tailwind.config.js] — Current TailwindCSS theme extensions
- [Source: existing App.tsx] — Current routing structure
- [Source: existing home.tsx] — Current authenticated page with header (to be replaced by AppLayout)
- [Source: existing store/auth.ts] — Zustand auth store with persist middleware
- [Source: existing services/api.ts] — apiFetch with auto Bearer token
- [Source: existing protected-route.tsx] — Auth guard component
- [Source: Story 1.1 dev notes] — Better-Auth deviation documented, post-login redirect to /chat
- [Source: Story 1.2 dev notes] — ProtectedRoute selector fix, logout button text "退出登录"
- [Source: deferred-work.md] — ProtectedRoute selector was fixed, no remaining issues blocking this story

### Project Structure Notes

- Backend module structure follows: `routes.ts` + `service.ts` + `middleware.ts` per domain
- Frontend uses kebab-case file names, PascalCase components
- All product UI text should be Chinese (per frontend CLAUDE.md)
- Frontend file structure from architecture: `pages/`, `components/ui/`, `components/chat/`, `components/alarms/`, `hooks/`, `services/`, `store/`, `types/`, `lib/`
- New component `global-navigation.tsx` goes in `components/` (shared, not domain-specific)
- New component `app-layout.tsx` goes in `components/` (shared layout wrapper)
- Placeholder pages go in `pages/` directory following established naming convention

## Dev Agent Record

### Agent Model Used

Claude Code (glm-5)

### Debug Log References

- Initial test failures due to `@/` path alias not resolving in vitest; resolved by using relative imports in test files
- `@testing-library/react` `render()` failed with "document is not defined"; switched to `renderToString` to match existing project test pattern

### Completion Notes List

- ✅ Added 5 missing CSS color variables to globals.css (surface-pearl, surface-tile-2, surface-tile-3, surface-black, chip-translucent)
- ✅ Added 11 typography scale tokens to tailwind.config.cjs as fontSize tuples with lineHeight, letterSpacing, fontWeight
- ✅ Added fontFamily tokens (apple-display, apple-text) to tailwind.config.cjs
- ✅ Created GlobalNavigation component with desktop sticky top bar and mobile bottom tab bar using md: breakpoint
- ✅ Created AppLayout wrapper component with GlobalNavigation + main content area with correct padding
- ✅ Updated App.tsx routing: /chat, /alarms, /settings as protected routes with AppLayout; / redirects to /chat; /home redirects to /chat
- ✅ Created placeholder pages (chat.tsx, alarms.tsx, settings.tsx) with Chinese labels
- ✅ Verified auth store, api client, and ProtectedRoute — no changes needed, all working as expected
- ✅ Updated home.tsx to redirect to /chat (logout button moved to GlobalNavigation)
- ✅ All 58 unit tests pass (3 pre-existing E2E test file failures unrelated to this story)
- ✅ vp check passes with no errors

### File List

**Created:**

- apps/frontend/src/components/global-navigation.tsx
- apps/frontend/src/components/app-layout.tsx
- apps/frontend/src/pages/chat.tsx
- apps/frontend/src/pages/alarms.tsx
- apps/frontend/src/pages/settings.tsx
- apps/frontend/src/components/global-navigation.test.tsx
- apps/frontend/src/components/app-layout.test.tsx

**Modified:**

- apps/frontend/src/globals.css
- apps/frontend/tailwind.config.cjs
- apps/frontend/src/App.tsx
- apps/frontend/src/pages/home.tsx

**Verified (no changes):**

- apps/frontend/src/store/auth.ts
- apps/frontend/src/services/api.ts
- apps/frontend/src/components/protected-route.tsx

## Change Log

- 2026-05-05: Story 1-3 implementation complete — design tokens mapped, GlobalNavigation + AppLayout created, routing updated, tests added

### Review Findings

- [x] [Review][Defer] Mobile no logout — PO决定：移动端退出登录将添加到设置页面，留给后续Settings Story实现。`deferred, deferred to Settings page story`
- [x] [Review][Patch] Replace text-white with text-apple-on-dark — PO决定：严格遵循UX-DR1。global-navigation.tsx中所有text-white替换为text-apple-on-dark。`source: auditor` ✅ fixed
- [x] [Review][Dismiss] Desktop nav breakpoint 768px confirmed — PO决定：保持768px，遵循设计规格文档。当前实现正确。`source: auditor`
- [x] [Review][Patch] h-full centering non-functional in placeholder pages — 替换为 `min-h-[calc(100vh-44px)]` 实现真正的垂直居中。`source: blind+edge` ✅ fixed
- [x] [Review][Patch] No aria-current on active nav links — 添加 `aria-current="page"` 到活跃导航链接。`source: edge` ✅ fixed
- [x] [Review][Patch] No focus-visible styling on nav links — 添加 `focus-visible:outline` 样式。`source: edge` ✅ fixed
- [x] [Review][Patch] Double-click logout fires duplicate API calls — 添加 `useRef` 防抖守卫。`source: edge` ✅ fixed
- [x] [Review][Patch] Logout button missing type="button" — 添加 `type="button"`。`source: edge` ✅ fixed
- [x] [Review][Patch] await navigate() is misleading — 移除 `await`，改用 `void` 前缀。`source: blind+edge` ✅ fixed
- [x] [Review][Patch] Redundant padding classes in AppLayout — 简化为 `pt-11 max-md:pb-11`。`source: blind+edge` ✅ fixed
- [x] [Review][Patch] isActive prefix matching creates false positives — 增加检查排除其他已知导航路径的误匹配。`source: blind+edge` ✅ fixed
- [x] [Review][Defer] Auth store hydration flash — Zustand persist hydrates asynchronously. On first render, `user` and `refreshToken` are `null` even with valid credentials in localStorage, causing a brief redirect flash to `/login`. Pre-existing from Story 1.2. `deferred, pre-existing`
- [x] [Review][Defer] No Better-Auth session validation on app load — AC5 says "store loads session data from Better-Auth" but no mechanism validates persisted tokens on app start. Pre-existing behavior, not introduced by this change. `deferred, pre-existing`
- [x] [Review][Defer] iOS safe area not accounted for — Mobile bottom nav uses `fixed bottom-0` without `env(safe-area-inset-bottom)`. On iPhone X+ devices, the nav bar overlaps the home indicator. Not in current scope. `deferred, pre-existing`
- [x] [Review][Defer] HomePage export is dead code — `home.tsx` exports `HomePage` but `App.tsx` no longer imports it. The `/home` route uses plain `<Navigate>`. The file is dead code. `deferred, cleanup`
- [x] [Review][Defer] Suspense wrapper without lazy — `<Suspense>` still wraps `<Routes>` in `App.tsx` but no route uses code splitting. Dead overhead. `deferred, cleanup`
- [x] [Review][Defer] Active vs inactive nav link distinguishability — Active (`#ffffff`) vs inactive (`#cccccc`) on `#000000` background has only 1.6:1 contrast ratio between states. Both pass WCAG AAA individually but the visual distinction is subtle for low-vision users. Design choice, not a bug. `deferred, pre-existing`
