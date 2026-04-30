# Plan: Frontend Google + WeChat OAuth Login

## Context

The frontend app at `apps/frontend` is an early scaffold with only a Button component and no router/auth/API layer. The backend already has fully working Google and WeChat OAuth endpoints. This plan implements the complete login flow per `docs/identity-access-wechat-google-technical.md` with Apple design tokens from `docs/DESIGN-apple.md`.

## Files to Create/Modify (13 files)

| #   | File                                 | Action                                   |
| --- | ------------------------------------ | ---------------------------------------- |
| 1   | `src/types/auth.ts`                  | Create — shared TS types                 |
| 2   | `src/lib/wechat.ts`                  | Create — UA detection                    |
| 3   | `src/store/auth.ts`                  | Create — Zustand auth store with persist |
| 4   | `src/services/api.ts`                | Create — fetch wrapper + token refresh   |
| 5   | `src/globals.css`                    | Edit — add Apple design tokens           |
| 6   | `tailwind.config.cjs`                | Edit — extend with Apple tokens          |
| 7   | `src/components/protected-route.tsx` | Create — auth guard                      |
| 8   | `src/components/auth-button.tsx`     | Create — Google/WeChat buttons           |
| 9   | `src/pages/login.tsx`                | Create — login page                      |
| 10  | `src/pages/callback.tsx`             | Create — OAuth callback handler          |
| 11  | `src/pages/home.tsx`                 | Create — basic post-login page           |
| 12  | `src/App.tsx`                        | Edit — route definitions                 |
| 13  | `src/main.tsx`                       | Edit — add BrowserRouter                 |

## Step 1: Install Dependencies

```bash
vp add react-router-dom
```

## Step 2: Design Tokens

### `src/globals.css` — Add Apple CSS custom properties

Add to existing `:root` block:

```css
--apple-primary: #0066cc;
--apple-primary-focus: #0071e3;
--apple-primary-on-dark: #2997ff;
--apple-ink: #1d1d1f;
--apple-parchment: #f5f5f7;
--apple-ink-muted: #7a7a7a;
--apple-ink-muted-80: #333333;
--apple-hairline: #e0e0e0;
```

Add font-family utilities for Apple typography stack (SF Pro Display/Text → system-ui fallback).

### `tailwind.config.cjs` — Extend theme

Add colors, border-radius, spacing tokens from Apple design doc as utility classes.

## Step 3: Core Infrastructure

### `src/types/auth.ts`

```ts
User { id, email, name, avatarUrl }
AuthTokens { accessToken, refreshToken, expiresIn }
AuthExchangeResponse = AuthTokens & { user }
ApiErrorResponse { code, message }
```

### `src/lib/wechat.ts`

```ts
isWeChatBrowser(): boolean  // /MicroMessenger/i.test(navigator.userAgent)
```

### `src/store/auth.ts` — Zustand store

- State: `user`, `accessToken`, `refreshToken`, `tokenExpiresAt`, `isAuthenticated`
- Actions: `setAuth(user, tokens)`, `setTokens(tokens)`, `clearAuth()`
- Persist middleware: `localStorage`, key `"auth-storage"`, persist `refreshToken` + `user` + `tokenExpiresAt`

### `src/services/api.ts` — Fetch wrapper

- `apiFetch<T>(path, options)` — injects Bearer token, handles 401 with refresh
- `exchangeCode(code)` → POST `/api/v1/auth/oauth/exchange-code`
- `refreshAuth(refreshToken)` → POST `/api/v1/auth/refresh`
- `getCurrentUser()` → GET `/api/v1/me`
- `logout(refreshToken)` → POST `/api/v1/auth/logout`
- `getGoogleStartUrl()` → `${VITE_API_URL}/api/v1/auth/google/start`
- `getWechatMpStartUrl()` → `${VITE_API_URL}/api/v1/auth/wechat/mp/start`
- Token refresh: proactive (60s before expiry) + reactive (on 401), deduplicated across concurrent calls

## Step 4: Routing

### `src/main.tsx`

Wrap `<App />` with `<BrowserRouter>`.

### `src/App.tsx`

```
/login        → LoginPage
/auth/callback → CallbackPage
/home         → ProtectedRoute → HomePage
/             → redirect to /home
*             → redirect to /home
```

## Step 5: Components & Pages

### `src/components/protected-route.tsx`

- Check `isAuthenticated` from store
- If false: `<Navigate to="/login" state={{ from: location.pathname }} />`

### `src/components/auth-button.tsx`

- Base `LoginButton` component (pill shape, Apple tokens, `active:scale-95`)
- `GoogleLoginButton` — Google icon + "Continue with Google"
- `WeChatLoginButton` — WeChat icon + "WeChat Login"
- Full-page redirect on click (`window.location.href`)

### `src/pages/login.tsx`

- Full viewport, centered card, Parchment background
- "MarketMind" headline in Apple display typography
- UA detection: WeChat → WeChat button only; non-WeChat → Google button
- Store `returnUrl` in `sessionStorage` before redirect

### `src/pages/callback.tsx`

- Extract `code` from URL params
- Call `exchangeCode(code)` → store tokens → navigate to home
- `replaceState` to strip code from URL
- Handle: loading state, error state, expired code

### `src/pages/home.tsx`

- Parchment background, welcome message
- User info display (name, avatar)
- Logout button

## Key API Contracts (from backend)

| Endpoint                           | Method | Request            | Response                                         |
| ---------------------------------- | ------ | ------------------ | ------------------------------------------------ |
| `/api/v1/auth/google/start`        | GET    | —                  | 302 → Google                                     |
| `/api/v1/auth/wechat/mp/start`     | GET    | —                  | 302 → WeChat                                     |
| `/api/v1/auth/oauth/exchange-code` | POST   | `{ code }`         | `{ accessToken, refreshToken, expiresIn, user }` |
| `/api/v1/auth/refresh`             | POST   | `{ refreshToken }` | `{ accessToken, refreshToken, expiresIn }`       |
| `/api/v1/auth/logout`              | POST   | `{ refreshToken }` | `{ success: true }`                              |
| `/api/v1/me`                       | GET    | Bearer header      | `{ user }`                                       |

## Responsive Design

- Mobile (<640px): full-width button, 28px headline, tighter padding
- Desktop (>=640px): max-width 400px card, 34px headline

## Verification

1. `vp install` — install react-router-dom
2. `vp run dev` — start dev server
3. Navigate to `/login` — verify page renders with Google button
4. Click Google button — verify redirect to backend `/api/v1/auth/google/start`
5. With backend running, complete Google OAuth flow → verify callback page exchanges code → verify redirect to `/home`
6. Verify `/home` shows user info and is protected (unauthenticated users redirect to `/login`)
7. Test responsive: resize browser to mobile width, verify layout adapts
8. Test logout: click logout → verify redirect to `/login` and tokens cleared
