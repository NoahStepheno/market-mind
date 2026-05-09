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

## Deferred from: code review of 2-1-chat-session-management-chat-page (2026-05-05)

- 首次加载时 createAndSelectSession + selectSession 产生冗余 API 调用 — 新会话刚创建后立刻又调用 selectSession 触发 loadMessages（空结果）。性能问题非 bug。`chat.tsx:20-28`

## Deferred from: code review of 2-1-chat-page-bugfix (2026-05-05)

- Hardcoded Chinese strings not internationalized — all UI text in JSX is raw Chinese. Pre-existing pattern from story 2-1.
- IME composition edge case on Android/iOS keyboards — `compositionstart` may fire after first `onChange`, causing mid-composition state corruption. Platform-specific, low priority.
- `selectSession` fires redundantly when creating new session — pre-existing store logic, causes redundant network request and brief empty flash.
- Non-text message content (ui/tool_call/tool_result) silently swallowed — both old and new code filter to text-only. Pre-existing from story 2-1.
- `streamSse` drops malformed SSE data and final buffer without trailing newline — pre-existing in `chat-api.ts`, not changed by this diff.
- `createAndSelectSession` does not set `messagesStatus` — pre-existing store logic inconsistency.
- CORS fallback allows any origin when `CORS_ALLOWED_ORIGINS` is empty — pre-existing, slightly worsened by `.env.example` deletion.
- Race condition on concurrent `selectSession` calls — no abort/cancellation for in-flight requests. Pre-existing.

## Deferred from: code review of 2-2-preset-alarm-templates-input-composer (2026-05-05)

- useMemo stale closure over messages — pre-existing from Story 2.1, not introduced by this change. [chat.tsx:91-97]
- API-loaded messages invisible to runtime — pre-existing architectural issue from Story 2.1; runtime created with empty initialMessages before API resolves. [chat.tsx:91-97]
- Template card flicker on page load — pre-existing useEffect race from Story 2.1; ChatThread mounts with empty messages before API resolves. [chat.tsx:26-49]
- renderToString tests only cover static rendering — project test pattern, not specific to this change. Click-to-composer interaction flow is untested. [template-card.test.tsx, template-cards.test.tsx]
- Unsubstituted `{symbol}` and `{value}` placeholders in nlText — by design; user fills these before submitting. [template-cards.tsx:9,15,21]
- No text overflow handling on card text spans — minor, current content fits at all breakpoints. [template-card.tsx:23-25]
- `addLocalMessage` is dead code in chat store — pre-existing from Story 2.1. [store/chat.ts:88-90]

## Deferred from: code review of 2-3-ai-natural-language-parsing-streaming-response (2026-05-06)

- 模板卡片在sendMessage延迟期间可见 — Story 2-2 UX polish，sendMessage完成后模板才消失 [chat.tsx:125-128]
- use-cycling-placeholder无interval验证 — Story 2-2代码，0或负值interval仅受浏览器clamp保护 [use-cycling-placeholder.ts:18-24]
- 空提示闪烁(zustand/runtime同步间隙) — 已知的竞态条件，API消息加载与runtime初始化之间短暂闪现 [chat.tsx:141-146]
- `sessionId`/`contextBudget` 为死参数 — `ParserInput` 中定义但 `glm-provider.ts` 和 `prompt-builder.ts` 均未消费 [parser-interface.ts, glm-provider.ts]
- 无glmProvider.parse()管道集成测试 — `ai-stream.test.ts` 仅测试 `parseGlmResponse()`，未测试SSE流管道集成 [stream.test.ts]

## Deferred from: code review of 2-3-ai-natural-language-parsing-streaming-response (2026-05-06 — Round 2)

- NFR3流式延迟因V1阻塞设计受影响 (AC #3) — `await getGlmProvider().parse()` 提前获取完整GLM-5响应后才发送SSE。真正的渐进流式推迟到V2。 [stream.ts]
- AC #8点击最近模板自动填入未实现 (AC #8) — deferred to Story 2.4。
- AC #9自动重连逻辑缺失 (AC #9) — 前端显示"连接中断"消息，但无retry/reconnect。推迟到V2。 [market-adapter.ts, chat-api.ts]
- `CHAT_AI_ERROR` 错误码定义但从未引用 — `aiErrorCodes` 定义了4个码但glm-provider采用优雅降级，stream.ts使用CHAT_STREAM_ERROR。 [errors.ts]
- `context-policy.ts` / `buildChatContext()` 被弃用 — 与spec指示"USE THIS"矛盾。新 `buildPrompt()` 无token预算强制。V1由固定few-shot+max_tokens隐式控制。 [routes.ts, prompt-builder.ts]
- `contextBudget`/`sessionId` 为死参数 — ParserInput中定义但glm-provider和prompt-builder均未消费。 [parser-interface.ts, glm-provider.ts]
- `listMessagesForSession` hardcoded limit:10 — 长对话中失去更早的上下文。 [routes.ts]
- 模板点击DOM操作依赖原生setter绕过React — Story 2-2代码，非本次变更。已确认@assistant-ui/react v0.x支持ref转发。 [chat.tsx]
- `packages/utils/package.json` 子路径导出被移除 — 已确认安全（桶式导出覆盖），但spec列为"do NOT modify"。 [packages/utils/package.json]
- `stream.test.ts` 中 `context-policy.ts` mock为死代码 — routes.ts不再导入context-policy。 [stream.test.ts:22-24]
- `routes.test.ts` 缺少 `listMessagesForSession` mock — routes.ts导入但测试未mock，若未来在此添加stream测试会失败。 [routes.test.ts:27-29]
- 缺少完整的SSE pipeline集成测试 — `ai-stream.test.ts` 仅测试 `parseGlmResponse()` 隔离，未测试端到端流。 [ai-stream.test.ts]
- ai-stream.test.ts测试名误导 — "out-of-range cooldown is corrected by schema default" 实际为rejection而非correction。 [ai-stream.test.ts:49-54]
- Error路径message_end status与成功路径相同("done") — V1有意简化，前端无法区分成功/失败。 [stream.ts:265-274]
- `parseGlmResponse` 贪婪正则 `/\{[\s\S]*\}/` — 后备匹配，优先尝试 ```json代码块提取。 [glm-provider.ts:31]
- `getGlmProvider()` 工厂函数为不必要间接层 — 无功能影响，每次调用重新读取env甚至有益于key轮换。 [stream.ts:34-36]

## Deferred from: code review of 2-3-ai-natural-language-parsing-streaming-response (2026-05-06 — Round 3)

- 缺少 stream.ts 错误处理清理路径的测试覆盖 — catch 块包含4个新分支（conditional DB persist、conditional block_end、error event、message_end）但均无测试覆盖。 [stream.ts:249-310]
- 前端 adapter 缺少 `block_start` 事件处理 — 已推迟到 Story 2.4（UI 组件渲染）。 [market-adapter.ts]
- unsupported_response 无前端 UI 组件渲染 — 已推迟到 Story 2.4。mapper 将其展平为纯文本。

## Deferred from: code review of 2-2-preset-alarm-templates-input-composer (2026-05-06 — Round 2)

**Note:** The diff contained Story 2.3 error-resilience fixes. These deferred items apply to that code.

- else 分支 return 跳过 message_end SSE 事件 — pre-existing，通用回退分支直接 return 不发送 message_end [stream.ts:218-222]
- AI 生成文本无大小限制 — pre-existing，块循环按 CHUNK_SIZE=8 无限发送 delta 事件，无最大字符检查 [stream.ts:104-122]
- JSON.stringify 在 flatMap 回调中无异常捕获 — pre-existing，draft.conditionGroup 可能包含循环引用导致整个消息列表渲染崩溃 [chat-message-mapper.ts:20]
- 不支持正则表达式无锚点 — `/不支持|不可用|无法识别|无法解析|无法处理/` 可能匹配正常响应中的子串。实际场景发生概率低 [stream.ts:176]
- 硬编码 CHAT_STREAM_ERROR 错误代码 — pre-existing，无论根因如何均发送相同错误代码，前端无法实现差异化恢复 [stream.ts:291]
- 空 textExplanation 发送空 delta — pre-existing，解析器返回空字符串时块循环至少发送一个空 delta 事件 [stream.ts:104-110]

## Deferred from: code review of 2-2-preset-alarm-templates-input-composer (2026-05-06 — Round 3)

**Note:** Cross-story review of Story 2.3 error-resilience fixes.

- persistedOk 在 `!updated` 分支中存在边缘情况 — 如果 writeEvent 在 `!updated` 分支内抛出，catch 块会不必要地尝试回退持久化。极罕见的边缘情况 [stream.ts:227-239]
- 错误恢复中硬编码的 `"b2"` block_id — catch 块使用硬编码字符串而非 uiBlockId 变量。如果块 ID 命名改变，将导致维护风险 [stream.ts:297]
- `streamSse` 从不释放 ReadableStream reader 锁 — chat-api.ts 中无 reader.releaseLock() 或 reader.cancel() 调用路径。浏览器通常处理此问题，但 Streams 规范不保证 [chat-api.ts:92]
- `crypto.randomUUID()` 特性检测在 HTTP localhost 上回退到低熵 ID — 快速顺序调用可能产生冲突 ID。受浏览器安全策略限制 [market-adapter.ts:42-43]
- 无测试覆盖 `streamSse` 在任何事件产生前抛出 — 外部 try/catch 路径正确处理但未经测试 [market-adapter.test.ts]
- `symbol` 与 `symbolName` 命名不一致 — hasValidDraft 检查 draft.symbol，而 block_patch 提取 draft.symbolName。在当前解析器输出下不会出错 [stream.ts:139, market-adapter.ts:62]
- 空字符串 `symbol: ""` 通过 hasValidDraft 守卫 — typeof "" === "string" 为 true。解析器单独验证，实践中不太可能 [stream.ts:139]

## Deferred from: code review of 2-3-ai-natural-language-parsing-streaming-response (2026-05-07 — Round 4)

- metrics/templates 类型断言无 `Array.isArray()` 运行时守卫 — 防御性编程关注点，非本次引入 [market-adapter.ts:78-82, chat-message-mapper.ts:26-28]
- 中文正则启发式匹配脆弱(语言依赖) — 预存检测机制，V2 应改为 AI parser 返回结构化标志位 [stream.ts:87]
- 无 2 秒首字节门控(NFR3) — 属于基础设施/性能监控，非本次变更范围 [stream.ts]
- SSE payload 每次携带完整 SUPPORTED_METRICS/PRESET_TEMPLATES — 静态数据冗余传输，当前数组小不影响性能，后续增长时可改为客户端内置 [stream.ts:185-209]
- 模板占位符 `{symbol}`/`{value}` 原始渲染给用户 — 模板仅作为文本建议展示，变量由用户在输入中自行替换 [market-adapter.ts:88]
- unsupported_response 结构化 UI(网格+卡片)推迟到 Story 2.4 — V1 使用纯文本方案
- 模板点击自动填充交互推迟到 Story 2.4 — V1 使用纯文本方案

## Deferred from: code review of 2-3-ai-natural-language-parsing-streaming-response (2026-05-07 — Round 6)

- 中文正则启发式匹配脆弱 — pre-existing，Round 4/5 已记录 [stream.ts:87]
- `AbortError` 仅匹配 `DOMException` — pre-existing，浏览器环境足够 [market-adapter.ts:34]
- `streamSse` 丢弃尾部不完整 SSE 行 — pre-existing，不在本次 diff 范围 [chat-api.ts:97-121]
- `streamSse` 无读取超时 — pre-existing，不在本次 diff 范围 [chat-api.ts:98]
- `sendMessage` 不受 abortSignal 覆盖 — pre-existing [market-adapter.ts:31, chat-api.ts:60-68]
- catch handler DB 写入失败后消息永久卡在 streaming — 极端边缘情况 [stream.ts:325-336]
- Block ID 重连碰撞 — V1 无重连机制 [stream.ts:103,146,186,235]
- 模板仅渲染 nlText/title，缺少 icon/description — V1 文本方案，Story 2.4 处理 [market-adapter.ts:89]
