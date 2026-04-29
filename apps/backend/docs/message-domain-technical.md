# 聊天域（Message Domain）— Backend 技术方案

**目的**：基于 `docs/designs/market-mind-message-domain.md`，给出 `apps/backend` 可直接落地的实现方案，覆盖会话与消息持久化、SSE 流式协议、草稿与确认编排、上下文裁剪和测试策略。  
**范围**：仅包含聊天域后端能力；告警创建真执行保持在告警域 `POST /alarms`；不展开模型 prompt 工程细节与通知投递链路。

---

## 1. 目标与落地原则

| 原则           | 后端落地要求                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------- |
| 草稿不进告警域 | 用户点击确认前，任何结构化草稿仅存在 `chat_messages.blocks`（或会话内草稿态）；禁止写 `alarms` |
| 确认单一真源   | 确认创建统一调用告警域 `POST /alarms`，聊天域只记录“创建结果消息”                              |
| 单用户隔离     | 会话、消息、流式连接、历史查询均强制 `user_id` 过滤                                            |
| 协议可演进     | 助手消息采用 `Block[]`（text/ui/tool_call/tool_result），保证前后端一致渲染                    |
| 先可用再增强   | V1 先实现“可恢复的持久化 + 可稳定流式”，V1.5 再加摘要与高级裁剪                                |

---

## 2. 模块与目录规划（apps/backend）

建议新增模块：`src/modules/chat/`

- `routes.ts`：公开路由（sessions/messages/stream）
- `internal-routes.ts`：内部编排路由（可选，如 confirm-alarm 聚合）
- `service.ts`：会话消息写入、上下文组装、分页查询
- `stream.ts`：SSE 事件编排与生命周期管理
- `context-policy.ts`：滑窗、块降级、budget 裁剪
- `types.ts`：`Message`、`Block`、`SseEvent`、DTO 类型
- `repo.ts`：Drizzle 查询封装（sessions/messages）
- `mapper.ts`：DB 行 <-> API DTO 转换
- `metrics.ts`：聊天域指标
- `errors.ts`：聊天域错误码

入口接入：在 `src/index.ts` 注册 `/chat` 路由分组，并复用现有鉴权中间件。

---

## 3. 数据模型（Drizzle 实体）

> 遵守 backend 软删除规范：会话建议也提供 `deleted_at`，查询默认过滤。

### 3.1 chat_sessions

- `id uuid pk`
- `user_id uuid not null`（FK users）
- `title text null`
- `memory_summary text null`（V1 可先预留）
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

索引：

- `(user_id, updated_at desc)`：会话列表
- `(user_id, id)`：鉴权与详情
- 可选 partial：`where deleted_at is null`

### 3.2 chat_messages

- `id uuid pk`
- `session_id uuid not null`（FK chat_sessions）
- `user_id uuid not null`（冗余，便于鉴权和分页）
- `role enum('user','assistant','system') not null`
- `status enum('streaming','done') not null default 'done'`
- `blocks jsonb not null`
- `text_search text null`（V1 可不落，后续搜索用）
- `created_at timestamptz not null default now()`

索引：

- `(session_id, created_at asc)`：消息时间线
- `(user_id, session_id, created_at desc)`：用户态分页

约束：

- 写入消息时校验 `chat_sessions.user_id == chat_messages.user_id`
- 用户消息固定 `status='done'`

---

## 4. 协议定义（后端 DTO）

### 4.1 Message / Block（与领域文档一致）

- `Message = { id, sessionId, role, status, blocks, createdAt }`
- `Block = TextBlock | UIBlock | ToolCallBlock | ToolResultBlock`
- `UIBlock.component` V1 最少支持：
  - `alarm_preview`
  - `alarm_editor`

### 4.2 SSE 事件

V1 固定事件集：

- `message_start`
- `block_start`
- `block_delta`
- `block_end`
- `message_end`
- `error`

V1.5 可加：

- `block_patch`
- `tool_call`
- `tool_result`

事件载荷统一包含：

- `requestId`（追踪）
- `sessionId`
- `messageId`
- `ts`（ISO 时间）
- `data`（按事件细分）

---

## 5. API 设计（聊天域）

### 5.1 会话与历史

- `POST /chat/sessions`
  - 入参：`{ title?: string }`
  - 出参：`{ session }`
- `GET /chat/sessions?cursor=&limit=`
  - 按 `updated_at desc` 分页，仅当前用户
- `GET /chat/sessions/:id/messages?cursor=&limit=`
  - 时间线分页，默认升序返回（客户端可反转渲染）

### 5.2 发消息与流式

- `POST /chat/sessions/:id/messages`
  - 入参：`{ content: string }`
  - 服务端行为：
    1. 写入 `role=user` 消息
    2. 创建 `role=assistant,status=streaming` 占位消息
    3. 返回 `{ assistantMessageId, streamUrl }`

- `GET /chat/sessions/:id/stream?messageId=`
  - SSE 输出该轮助手事件流
  - 完成后将该助手消息更新为 `status=done` + 完整 `blocks`

### 5.3 确认创建（已选方案 B）

- **采用方案 B（BFF 聚合）**：实现 `POST /chat/sessions/:id/confirm-alarm`
  - 聊天域内部转发告警域 `POST /alarms`
  - 成功后在同一请求链路补一条聊天成功消息（包含 `alarm_id`）
  - 任何情况下不得绕过告警域参数校验与服务端 `user_id` 注入
  - 失败时返回分层错误（告警域 4xx 透传为可修正错误，5xx 归类系统错误）

---

## 6. 请求处理与服务编排

### 6.1 用户消息 -> 助手流式

1. 鉴权取 `user_id`
2. 校验 `session_id` 归属
3. 写用户消息（`text block`）
4. 生成助手消息壳（`status=streaming, blocks=[]`）
5. 组装模型上下文（见 §7）
6. 将模型输出映射为 SSE 事件与 `Block` 状态机
7. 正常结束：落库完整 `blocks`，状态置 `done`
8. 异常结束：发 `error` 事件，落库错误系统消息（可选）

### 6.2 块状态机

- `text`：允许多次 `block_delta`，结束合并为单块 `content`
- `ui`：V1 推荐一次性 `block_start` 带全量 `props`
- `tool_call/tool_result`：若接 function calling，事件可降级成文本说明，不影响主流程

### 6.3 幂等与重试

- `POST /chat/sessions/:id/messages` 支持 `Idempotency-Key`（可选）
- SSE 断线：V1 先定义“该轮失败后客户端重发”，不做复杂续传
- 数据落库失败时，优先保证不产生“done 但 blocks 空”的脏状态

---

## 7. 上下文与记忆策略（可实现版本）

### 7.1 V1 固定注入包

每轮模型调用输入由 `context-policy.ts` 产出：

- `system_prompt`（固定约束）
- `user_latest`（本轮用户输入）
- `draft_current`（当前编辑中的 `alarm_editor.props`，必须全文）
- `alarms_context`（可选，来自告警域短摘要，限量）
- `recent_messages`（滑窗，默认最近 6~12 对）

### 7.2 防超长策略

- 全局 `context_budget`（按字符近似，后续替换 token 计数）
- 裁剪优先级：
  1. 保留 `system_prompt`
  2. 保留 `draft_current`（不可占位）
  3. 保留 `user_latest`
  4. 裁剪 `recent_messages`
  5. 对历史冻结 UIBlock 做占位符降级

### 7.3 冻结定义

可被降级的历史块：

- 已确认创建并已记录成功消息的旧草稿块
- 用户明确放弃的旧草稿块

不可降级：

- 当前正在编辑且会继续被引用的草稿块

---

## 8. 安全、鉴权、审计

- 所有 `/chat/*` 路由复用登录态，严禁客户端传 `user_id`
- session/message 查询必须双条件：`id + user_id`
- 记录最小审计字段：`requestId`, `userId`, `sessionId`, `messageId`, `latencyMs`, `result`
- 对模型与转发告警域错误做分级：
  - `4xx`：用户可修正（参数/会话不存在）
  - `5xx`：系统错误（模型、数据库、下游超时）

---

## 9. 可观测性与SLO建议

核心指标：

- `chat_message_create_total`
- `chat_stream_start_total`
- `chat_stream_error_total`
- `chat_stream_duration_ms`
- `chat_context_truncated_total`
- `chat_assistant_blocks_size_bytes`

建议目标（V1）：

- 发消息 API：P95 < 300ms（不含模型生成）
- 首 token 延迟：P95 < 2s
- 流中断率：< 1%

---

## 10. 测试策略

### 10.1 单元测试

- `context-policy.test.ts`：budget 裁剪、块降级规则
- `mapper.test.ts`：DB/DTO 互转稳定性
- `stream.test.ts`：SSE 事件顺序与最终状态

### 10.2 集成测试

- 鉴权隔离：A 用户不能读 B 会话
- 发消息成功链路：user 消息 + assistant done
- 异常链路：模型报错时返回 `error` 且消息状态正确

### 10.3 契约测试

- `UIBlock.props` 与告警域 `POST /alarms` 入参映射一致性
- 事件 schema 与前端解析器兼容

---

## 11. 实施计划 TODO（按执行顺序）

### Phase 0 — 基础准备

- [x] 聊天域模块命名确定为：`modules/chat`
- [ ] 在 `src/index.ts` 预留 `/chat` 路由注册位
- [ ] 定义统一错误码与日志字段（requestId/sessionId/messageId）

### Phase 1 — 数据层

- [ ] 新增 `chat_sessions` Drizzle 实体（含 `deleted_at`）
- [ ] 新增 `chat_messages` Drizzle 实体（`blocks` JSONB）
- [ ] 将新实体接入 `src/entities/schema.ts`
- [ ] 补充 SQL 注释块（遵守 backend migration 约定）
- [ ] 为会话列表与消息时间线建立索引

### Phase 2 — 基础 API

- [ ] 实现 `POST /chat/sessions`
- [ ] 实现 `GET /chat/sessions`（cursor 分页）
- [ ] 实现 `GET /chat/sessions/:id/messages`（cursor 分页）
- [ ] 补齐 Zod 请求/响应 schema 与错误映射

### Phase 3 — 发消息与流式

- [ ] 实现 `POST /chat/sessions/:id/messages`（写 user + assistant streaming 壳）
- [ ] 实现 `GET /chat/sessions/:id/stream` SSE 输出
- [ ] 建立 block 状态机（text/ui）
- [ ] 流完成后持久化 `assistant.status=done` + 完整 `blocks`
- [ ] 失败路径返回 `error` 事件并保证数据一致

### Phase 4 — 上下文策略

- [ ] 落地 `context-policy.ts`（滑窗 + budget）
- [ ] 实现历史冻结 UIBlock 占位降级策略
- [ ] 保证 `draft_current` 永不降级
- [ ]（可选）接入告警域摘要查询 `alarms_context`

### Phase 5 — 确认创建编排

- [x] 确认采用方案 B，并固化接口文档
- [ ] 实现 `POST /chat/sessions/:id/confirm-alarm` 转发到 `POST /alarms`
- [ ] 创建成功后补一条聊天系统消息（含 `alarm_id`）

### Phase 6 — 质量与运维

- [ ] 增加单元测试：context-policy / stream / mapper
- [ ] 增加集成测试：鉴权隔离、成功链路、错误链路
- [ ] 增加契约测试：UIBlock 与 alarms 入参映射
- [ ] 暴露指标并接入监控告警
- [ ] 执行 `vp lint` 与 `vp test`，修复新增问题

### Phase 7 — V1.5（可选增强）

- [ ] `chat_sessions.memory_summary` 生成任务
- [ ] SSE `block_patch/tool_call/tool_result` 扩展
- [ ] 断线续传与游标恢复

---

## 12. 关联文档

- 领域设计：`docs/designs/market-mind-message-domain.md`
- 告警域设计：`docs/designs/market-mind-alarm-domain.md`
- 总览域模型：`docs/designs/market-mind-domain-model.md`
- 告警域技术方案：`apps/backend/docs/alarm-realtime-technical.md`
