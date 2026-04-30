# 身份与访问 — 微信（内授权 / 外扫码）与 Google 登录（Backend）

**目的**：在 `docs/designs/market-identity-access-domain.md` 的域边界与原则之上，描述 **market-backend** 侧如何支撑：PC 端、**微信内置浏览器内网页授权**，以及与现有 **Google OAuth** 并存时的数据模型、路由与安全约定。  
**当前决策**：微信环境外的微信扫码登录（开放平台网站应用）因暂无可用测试账号，当前版本暂缓实施。

**范围**：认证协议、回调、用户/账号落库、与现有 `accessToken` / `refreshToken` 签发路径对齐；**不**展开业务 REST 的细粒度权限矩阵（域设计 V1「薄权限」）。

**与当前代码的关系**：业务鉴权已采用 Bearer JWT + `refreshTokens` 表（`requireAuth`）；Google 走 `GET/POST /api/v1/auth/google/*`。本方案将微信两条链路接到同一 **`issueTokenPair` 语义**（与 `apps/backend/src/modules/auth/service.ts` 一致），避免并行会话体系。

---

## 1. 域原则对齐

| 域原则               | 本方案落地                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 主体单一真源         | `users.id` 为业务主键；微信 / Google 均通过 `accounts` 多行挂到同一 `user`                                             |
| 服务端注入归属       | 登录完成后仅服务端签发 JWT；业务 API 的 `user_id` 来自 `verifyAccessToken`                                             |
| 不重复造并行登录 API | 微信与 Google 仍挂载在统一前缀 `/api/v1/auth/*`；与域文档「不单独定义并行登录 REST」一致（扩展子路径而非第二套用户表） |

---

## 2. 场景矩阵（PC 与微信）

| 客户端环境                        | 推荐登录方式                       | 微信产品形态（需提前在公众平台 / 开放平台配置） |
| --------------------------------- | ---------------------------------- | ----------------------------------------------- |
| PC 浏览器，UA 含 `MicroMessenger` | **网页授权**（OAuth2，与 H5 相同） | 公众号网页授权，或已绑定公众号的开放平台站点    |
| PC 浏览器，**非**微信内置环境     | **微信扫码登录（暂缓）**           | 暂无可用测试账号，后续恢复                      |
| PC 浏览器，**非**微信内置环境     | **Google OAuth**（已有）           | Google Cloud OAuth 2.0                          |

说明：**微信 PC 客户端内置浏览器**通常同样带 `MicroMessenger`，与「微信内」走同一套网页授权即可，无需单独协议分支。

---

## 3. 微信侧两条技术链路

### 3.1 微信内：网页授权（OAuth2）

参考微信官方文档：[网页授权](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html)。

1. 后端提供 `GET /api/v1/auth/wechat/mp/start`（名称可调整，下同）：校验 `state`（签名校验或加密 cookie，与现有 `signOAuthState` 同等级），302 到  
   `https://open.weixin.qq.com/connect/oauth2/authorize?appid=...&redirect_uri=...&response_type=code&scope=snsapi_userinfo|snsapi_base&state=...#wechat_redirect`。
2. 微信回调 `GET /api/v1/auth/wechat/mp/callback`：用 `code` 换 `access_token` + `openid`（及可选 `unionid`、`nickname`、`headimgurl` 等）。
3. **`upsertUserFromWechat`**：在 `accounts` 写入 `provider = 'wechat_mp'`（或统一 `wechat`），`providerAccountId` **优先使用 `unionid`**（开放平台绑定后稳定跨应用），否则退化为 `openid`；与 Google 一样关联到 `users` 行。
4. 调用现有 **`issueTokenPair`**，再通过 **短期一次性 `exchange code`** 重定向到 `FRONTEND_AUTH_CALLBACK_URL`（与 Google callback 相同模式，可复用 `createOauthExchangeCode` 或抽象为通用方法），前端 `POST /api/v1/auth/google/exchange-code` 可改名为 **`POST /api/v1/auth/oauth/exchange-code`** 以承载多 IdP（实现阶段再改名，避免破坏兼容时可保留旧路径别名）。

### 3.2 微信外：网站应用扫码登录（snsapi_login，暂缓）

当前版本暂不落地该链路，仅保留设计占位。暂缓原因：暂无可用测试账号，无法完成端到端联调与验收。  
恢复实施时，按原方案接入 `qrconnect`、`/api/v1/auth/wechat/web/callback`，并继续以 `unionid` 为首选账号归并键。

---

## 4. 数据模型与账号合并

### 4.1 `accounts` 表

沿用现有 `accounts`（`provider` + `providerAccountId` 唯一）：

| provider 建议值 | 含义                         | `providerAccountId`           |
| --------------- | ---------------------------- | ----------------------------- |
| `google`        | 已有                         | Google `sub`                  |
| `wechat_mp`     | 公众号网页授权               | `unionid` 优先，否则 `openid` |
| `wechat_web`    | 开放平台网站应用扫码（暂缓） | `unionid` 优先，否则 `openid` |

同一 `unionid` 应对应 **同一 `users` 行**；若先 Google 后微信，需按产品策略 **账号绑定**（邮箱匹配 / 显式「绑定微信」流程）— V1 可简化为：**仅 unionid / openid 自动合并**，邮箱冲突时返回可识别错误码由产品决定。

### 4.2 `users.email` 必填与微信无邮箱

当前 `users.email` 为 `NOT NULL` + `UNIQUE`，且微信通常不提供邮箱。  
**本方案已定稿：V1 采用 A**，即首次微信登录生成占位邮箱，例如 `wx+{unionid或规范化openid}@internal.invalid`，并在后续流程引导用户补全邮箱。

---

## 5. 环境与密钥（运维）

| 变量（示例）                   | 用途                                     |
| ------------------------------ | ---------------------------------------- |
| `WECHAT_MP_APP_ID` / `SECRET`  | 公众号网页授权                           |
| `WECHAT_WEB_APP_ID` / `SECRET` | 开放平台网站应用（扫码，暂缓时可不配置） |
| `BETTER_AUTH_URL`              | 后端对外基址（回调 URL 拼接）            |
| `FRONTEND_AUTH_CALLBACK_URL`   | 登录成功回跳前端（带 exchange）          |
| `GOOGLE_*`                     | 已有 Google 流程                         |

回调 URL 必须在各微信控制台 **网页授权域名 / 授权回调域** 白名单内，且 **HTTPS**。

---

## 6. 安全

- **state**：所有微信 `start`/`qrconnect` 必须带 signed state，回调校验防 CSRF（与 Google `signOAuthState` 一致思路）。
- **一次性 code**：微信 `code` 仅服务端换取 token，禁止回传浏览器长期保存。
- **Exchange code**：维持短 TTL（现有 60s）与单次消费，防止重放。
- **IP / 频率**：对 `callback`、`exchange-code` 做基础限流，防撞库与滥用。

---

## 7. API 形状（建议）

在保持现有 `refresh`、`logout` 不变前提下扩展：

| 方法 | 路径                               | 说明                                                               |
| ---- | ---------------------------------- | ------------------------------------------------------------------ |
| GET  | `/api/v1/auth/wechat/mp/start`     | 微信内 H5/PC 微信浏览器入口 → 302 微信授权页                       |
| GET  | `/api/v1/auth/wechat/mp/callback`  | 公众号 OAuth 回调 → 换 token → 302 前端                            |
| GET  | `/api/v1/auth/wechat/web/callback` | 扫码登录回调（`snsapi_login`，暂缓）                               |
| POST | `/api/v1/auth/oauth/exchange-code` | 统一消费短期 exchange code（可选保留 `google/exchange-code` 别名） |

Google 现有 `google/start`、`google/callback`、`google/exchange-code` **保持不变**即可满足「微信外 Google 登录」。

---

## 8. 非目标（与本方案一并声明）

- 小程序登录 `wx.login` + `code2Session`（与本文 PC Web 场景不同，可另文）。
- 企业微信通讯录 SSO。
- 自建与现有 JWT 体系并行的第二套会话（违背域设计）。

---

## 9. 参考

- 域设计：`docs/designs/market-identity-access-domain.md`
- 现有实现：`apps/backend/src/modules/auth/routes.ts`、`service.ts`、`middleware.ts`
- 微信网页授权、网站应用登录：以 [微信官方文档](https://developers.weixin.qq.com/doc/) 当前版本为准。

### 实施 Todo

- [ ] 申请 / 配置公众号网页授权（扫码登录暂缓，待测试账号可用后恢复）
- [x] 实现 `upsertUserFromWechat` 与 `users.email` 占位策略（或 schema 迁移）
- [x] 增加微信路由与 state 校验，复用 `issueTokenPair` 与 exchange code 回跳
- [ ] 为 exchange-code 提供多 IdP 兼容路径与回归测试（已提供 `/oauth/exchange-code` 兼容路径，回归测试待补）
- [ ] 与前端对齐 `FRONTEND_AUTH_CALLBACK_URL` 查询参数约定（`code` / 错误码）
