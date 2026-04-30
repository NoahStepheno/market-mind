# 身份与访问 — 微信（内授权 / 外扫码）与 Google 登录（Frontend / PC Web）

**目的**：在 `docs/designs/market-identity-access-domain.md` 原则下，描述 **market-web（PC 浏览器）** 如何根据运行环境选择 **微信网页授权**、**Google 登录**，并与后端 `/api/v1/auth/*` 的会话模型对接。  
**当前决策**：微信环境外的微信扫码登录因暂无可用测试账号，当前版本暂缓。

**范围**：登录页交互、环境探测、重定向与回调页、令牌落库（内存 / storage 策略由现有实现决定）；**不**定义业务 API 鉴权细节（统一 `Authorization: Bearer`）。

**后端对照**：`apps/backend/docs/identity-access-wechat-google-technical.md`。

---

## 1. 环境探测（单一决策点）

在登录页或应用启动路由中，根据 **User-Agent** 判断是否微信内置浏览器：

```ts
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
```

| `isWeChat` | 主登录 CTA                      | 说明                                       |
| ---------- | ------------------------------- | ------------------------------------------ |
| `true`     | **微信登录**（走网页授权）      | 含 PC 微信客户端内置浏览器、手机微信内打开 |
| `false`    | **Google 登录**（微信扫码暂缓） | 普通桌面浏览器 / Safari / Chrome 等        |

可选：对「仅支持扫码」的开放平台配置做特性开关，但 **UA 判断仍是第一道分叉**。

---

## 2. 微信内：整页跳转到后端 `start`

1. 用户点击「微信登录」→ `window.location.href = `${API_BASE}/api/v1/auth/wechat/mp/start``（或由后端先种 CSRF cookie 再 302，以后端实现为准）。
2. 用户在微信内完成授权 → 微信访问后端 `.../wechat/mp/callback` → 后端再 **302** 到 `FRONTEND_AUTH_CALLBACK_URL?code={exchangeCode}`（与现有 Google 成功回跳形状对齐）。
3. 前端 **`/auth/callback`**（或等价路由）：读取 `code`，调用  
   `POST ${API_BASE}/api/v1/auth/oauth/exchange-code`（或暂用 `POST .../google/exchange-code` 直至后端统一改名）  
   换取 `{ accessToken, refreshToken, expiresIn, user }`，写入现有 auth 状态（store / queryClient / cookie 策略与项目一致）。

**注意**：微信内页禁止使用非用户手势的自动弹窗；首次进入登录页可展示说明文案，由用户点击触发跳转。

---

## 3. 微信外：扫码登录（PC，暂缓）

该场景暂不落地实现，登录页在 `!isWeChat` 时先仅提供 Google 登录。  
待测试账号可用后，恢复 `qrconnect` 方案与扫码回跳流程。

---

## 4. Google 登录（微信外）

保持与现有行为一致：

1. `window.location.href = `${API_BASE}/api/v1/auth/google/start``
2. 回跳到 `FRONTEND_AUTH_CALLBACK_URL?code=...`
3. `POST .../exchange-code` 换 token。

登录页在 `!isWeChat` 时先仅展示 **Google** 入口。

---

## 5. 登录页线框（信息架构）

```
┌─────────────────────────────────────────────┐
│  market 登录                             │
│                                             │
│  [若 isWeChat]                              │
│     [ 微信登录 ]  ← 唯一主按钮               │
│                                             │
│  [若 !isWeChat]                             │
│     [ 使用 Google 继续 ]                     │
│     （微信扫码登录暂缓：暂无可用测试账号）    │
│                                             │
│  用户协议 / 隐私政策                          │
└─────────────────────────────────────────────┘
```

文案需符合各应用商店与微信审核对「第三方登录」的披露要求（产品侧最终稿）。

---

## 6. `/auth/callback` 契约

| 查询参数                              | 含义                                    |
| ------------------------------------- | --------------------------------------- |
| `code`                                | 短期 exchange code，POST 给后端换取 JWT |
| `error` / `error_description`（可选） | IdP 或后端拒绝时展示友好错误            |

成功换 token 后：

- 清除 URL 中的敏感 query（`replaceState`），避免分享链接泄漏 **exchange code**（虽短 TTL，仍属好习惯）。
- 跳转 `returnUrl`（若登录前保存）或默认首页。

---

## 7. 与域设计的契约

- **不信任客户端 userId**：所有受保护数据请求仅带 Bearer；用户身份以后端 JWT 为准。
- **与告警 / 聊天域**：登录完成后各域无感，仅消费同一 `user.id`（JWT `sub`）。
- **邮箱策略口径一致**：已采用后端方案 A，微信登录涉及的占位邮箱由后端生成与维护，前端无需推断或构造邮箱值。

---

## 8. 非目标

- 微信外「伪装成微信」绕过扫码（安全上也不应支持）。
- 非 PC 的小程序端登录流程（可另文档）。

---

## 9. 参考

- 域设计：`docs/designs/market-identity-access-domain.md`
- 后端方案：`apps/backend/docs/identity-access-wechat-google-technical.md`
- 前端视觉与组件基线：见 `apps/frontend/docs/DESIGN-apple.md`（登录页具体样式对齐该设计体系）。

### 实施 Todo

- [ ] 登录路由：UA 分支（微信内：微信登录；微信外：Google）
- [ ] 实现或对齐 `/auth/callback` 与 exchange API 路径（随后端改名）
- [ ] 微信扫码登录（暂缓）：待测试账号可用后再接入 `authorizeUrl` / `qrconnect`
- [ ] 错误态与 loading（授权中途关闭窗口等）
- [ ] E2E 或手动用例：Chrome、微信内置浏览器、微信 PC 内置浏览器各一条
