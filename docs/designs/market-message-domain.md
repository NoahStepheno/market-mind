# market — 聊天域设计方案

**版本**：与 `docs/prds/market-prd.md` V1 对齐  
**范围**：会话、消息、流式传输、结构化草稿与确认前 UI 的**持久化与协议**；**上下文与记忆**（多告警、长会话下的组 prompt 策略，见 §10）；**不包含**告警规则引擎、触发队列、通知落库（见告警域）。NL→结构化解析的**模型与 prompt 工程**可在实现层展开，本设计约定**输入输出形状、域边界与记忆分层**。

---

## 1. 目标与原则

| 原则             | 说明                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 草稿不进告警域   | AI 产出的结构化中间态**仅**存在于聊天域（消息块或等价 JSON）；用户未点「确认创建」前，**不**写入 `alarms`（与 PRD、告警域一致）。                       |
| 确认时刻单一真源 | 用户确认后，**以告警域 `POST /alarms` 成功为准**建立告警实例；聊天侧可记一条摘要消息，**不**要求镜像完整 `AlarmSpec`（除非产品明确要求对比历史）。      |
| 单用户隔离       | 会话与消息均归属 `user_id`；列表、流式连接、拉历史均经鉴权过滤。                                                                                        |
| 可渲染协议       | 助手\_turn 推荐 **Message = Block[]**：文本可流式，结构化预览用声明式 **UIBlock**（组件名 + props），便于端上组件注册表渲染（与实现草稿中的思路一致）。 |
| V1 工具边界清晰  | 「创建告警」的**权威执行**在告警域 API；聊天域内的 `tool_call` / 用户点击仅表达**意图与编排**，不替代服务端校验与 `user_id` 注入。                      |

---

## 2. 域边界

```text
┌─────────────────────────────────────────────────────────────┐
│ 聊天域（本文档）                                                  │
│  sessions / messages（含 user prompt、assistant blocks）          │
│  NL 输入 →（可选）流式 assistant → UIBlock「告警预览/编辑」           │
│  用户调整条件、冷却、notify_label、notify_tier → 点击「确认创建」        │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP POST /alarms（body = 确认 UI 最终结构）
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ 告警域                                                           │
│  alarms、评估、notifications …（见 market-alarm-domain.md） │
└─────────────────────────────────────────────────────────────┘
```

| 数据               | 聊天域                  | 告警域            |
| ------------------ | ----------------------- | ----------------- |
| 未确认的结构化条件 | 是（消息块 / 草稿字段） | 否                |
| 已确认 `AlarmSpec` | 否（可存一句摘要）      | 是（`alarms` 行） |

---

## 3. 核心概念

- **Session（会话）**：用户与 market 的一条连续对话容器；V1 可「单会话多轮」或「每开一个创建流新建会话」，产品决定；工程上需 `user_id` + `session_id`。
- **Message（消息）**：会话内有序的一条记录；**用户消息**以自然语言为主；**助手消息**由 **Block 列表**组成（见 §5）。
- **草稿（Draft）**：语义上等于 PRD §3.2 的 AI 解析输出 + 用户在确认 UI 上的修改；**持久化位置**二选一或组合：（1）嵌在助手消息的 `UIBlock`（如 `alarm_editor`）的 `props` 快照；（2）会话级 `draft` JSON 列，与「当前正在编辑的一轮」绑定。V1 推荐 **以助手消息内的 UIBlock props 为展示真源**，提交创建时用**当前表单状态**组装 `POST /alarms` body，避免双写不一致。
- **确认（Confirm）**：前端（或 BFF）调用告警域 **`POST /alarms`**；成功后可追加一条助手或系统样式消息：「已创建提醒」+ 可选 `alarm_id` 链接至详情。

---

## 4. 与 PRD 流程的对应

PRD 主流程：

```text
用户输入一句话 → AI 解析（草稿）→ 用户确认条件（UI 结构化）→ AlarmSpec → …
```

| 阶段                           | 聊天域职责                                                   | 告警域职责                         |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------- |
| 用户一句话                     | 写入一条 `role=user` 消息                                    | 无                                 |
| AI 解析                        | 流式输出文本说明 + **结构化 props**（UIBlock / 或内嵌 JSON） | 无                                 |
| 用户改条件 / 冷却 / notify\_\* | 客户端状态机 + 必要时 `PATCH` 草稿或替换块 props             | 无                                 |
| 确认创建                       | 组装 PRD `AlarmSpec` 形状 body，**不调**聊天域「落告警」接口 | `POST /alarms` 校验并插入 `alarms` |

`conditionGroup`、`cooldown`、`notifyLabel`、`notifyTier` 等字段含义与类型以 PRD §4.1 与 `market-alarm-domain.md` §4 为准；聊天域**生成同形 JSON** 作为创建请求体即可。

---

## 5. 消息与 Block 协议（前后端统一）

V1 推荐将助手可见内容建模为：

```ts
type MessageStatus = "streaming" | "done";

type Message = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  status: MessageStatus;
  blocks: Block[];
  createdAt: string; // ISO 8601
};

type Block = TextBlock | UIBlock | ToolCallBlock | ToolResultBlock;
```

### 5.1 TextBlock（流式文本）

```ts
type TextBlock = {
  id: string;
  type: "text";
  content: string; // 完整内容（落库快照）
  status?: "streaming" | "done";
};
```

流式传输时服务端可只发 **delta**，客户端合并进 `content`；**落库**建议存合并后的全文 + `status: "done"`。

### 5.2 UIBlock（声明式 UI）

```ts
type UIBlock = {
  id: string;
  type: "ui";
  component: string; // 如 "alarm_preview" | "alarm_editor"
  props: Record<string, unknown>; // 与 PRD 中间态 / 确认 UI 对齐的结构化字段
};
```

**V1 组件约定**（可随产品迭代扩展注册表）：

| `component`     | 用途                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| `alarm_preview` | 只读展示解析结果，引导用户进入编辑                                                          |
| `alarm_editor`  | 与 PRD §3.3 对齐：标的、条件卡片、AND/OR、cooldown、`notify_label`、`notify_tier`、确认按钮 |

`props` 形状应与 PRD 条件卡片、`ConditionGroup`、`Operator`、`Metric` 一致，避免聊天域再发明一套字段名；与告警域 API body 的映射在 BFF 或客户端做一次序列化即可。

### 5.3 ToolCallBlock / ToolResultBlock（可选，编排用）

```ts
type ToolCallBlock = {
  id: string;
  type: "tool_call";
  name: string; // 如 "propose_alarm_draft"
  args: Record<string, unknown>;
  status: "pending" | "running" | "done";
};

type ToolResultBlock = {
  id: string;
  type: "tool_result";
  toolCallId: string;
  result: Record<string, unknown>;
};
```

**V1 纪律**：

- 允许 LLM 通过 **function calling** 输出「建议草稿」（如 `propose_alarm_draft`），结果进入 **UIBlock** 或 `ToolResultBlock`，**不**直接等同于已创建告警。
- **`create_alarm` 命名若出现**：应理解为「客户端或服务端在用户点击确认后调用的**业务动作**」，其**硬执行**仍须走告警域 `POST /alarms`（含服务端校验、`user_id` 从 token 注入）。禁止仅依赖模型侧 tool 落库告警。

---

## 6. 流式传输（SSE 事件）

推荐 **SSE**（`text/event-stream`）承载「从用户发送 prompt 到助手消息完成」的一轮流。

### 6.1 事件枚举

```ts
type StreamEventType =
  | "message_start"
  | "block_start"
  | "block_delta"
  | "block_end"
  | "block_patch" // 可选：局部更新 UIBlock props
  | "message_end"
  | "tool_call"
  | "tool_result"
  | "error";
```

### 6.2 载荷形状（逻辑 JSON）

每条 SSE `data:` 内为 JSON，至少含 `event` 与 `data`：

```json
{
  "event": "block_delta",
  "data": { "messageId": "m1", "blockId": "b1", "delta": "片段" }
}
```

**典型顺序**：`message_start` →（若干）`block_start` / `block_delta` / `block_end` → … → `message_end`。

**UIBlock**：可 **`block_start` 一次性带齐 `component` + `props`**，随后 `block_end`；大 props 时也可先 `block_start` 再 `block_patch`。

### 6.3 与落库的关系

- 流式过程中：服务端可在内存累积块状态，**结束时**写入一条 `role=assistant` 的 `messages` 行（`blocks` JSONB 完整快照，`status=done`）。
- 若需断线续传：可实现按 `messageId` / `blockId` 的游标重连（V2）；V1 可简化为断线即该轮失败提示重试。

---

## 7. 数据模型（聊天域持久化）

以下为 **V1 建议表**；具体列名可与 ORM 风格统一（snake_case）。

### 7.1 `chat_sessions`

| 列                          | 类型        | 说明                           |
| --------------------------- | ----------- | ------------------------------ |
| `id`                        | UUID        | PK                             |
| `user_id`                   | UUID        | NOT NULL，FK → `users.id`      |
| `title`                     | text        | 可选；可由首条用户消息截断生成 |
| `created_at` / `updated_at` | timestamptz | NOT NULL                       |

索引：`(user_id, updated_at DESC)` 便于会话列表。

### 7.2 `chat_messages`

| 列            | 类型        | 说明                                                         |
| ------------- | ----------- | ------------------------------------------------------------ |
| `id`          | UUID        | PK                                                           |
| `session_id`  | UUID        | NOT NULL，FK → `chat_sessions.id`                            |
| `user_id`     | UUID        | NOT NULL；与 session 所有者一致性由写入路径保证              |
| `role`        | enum        | `user` \| `assistant` \| `system`                            |
| `status`      | enum        | `streaming` \| `done`；用户消息通常恒为 `done`               |
| `blocks`      | JSONB       | **用户消息**：可存单块 `{ type:"text", content }` 或等价结构 |
| `text_search` | text        | 可选生成列：从 blocks 抽取纯文本，便于搜索                   |
| `created_at`  | timestamptz | NOT NULL                                                     |

索引：`(session_id, created_at)`。

**不在本表存放**：`alarms` 行、触发流水号、通知投递状态。

---

## 8. API 形状（聊天域）

与告警域 API 分列；跨域编排可由 BFF 聚合。

| 方法 | 路径                                   | 说明                                                                                |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| POST | `/chat/sessions`                       | 创建会话                                                                            |
| GET  | `/chat/sessions`                       | 当前用户的会话列表                                                                  |
| GET  | `/chat/sessions/:id/messages`          | 分页拉历史消息（含 `blocks`）                                                       |
| POST | `/chat/sessions/:id/messages`          | 用户发送一条 prompt；响应可返回 `assistantMessageId` + **SSE URL** 或同连接升级说明 |
| GET  | `/chat/sessions/:id/stream?messageId=` | 或 WebSocket 子协议；**SSE 推送** §6 事件                                           |

**创建告警**：**不属于**聊天域 REST 的「资源创建」语义归属；客户端在确认 UI 完成后调用 **`POST /alarms`**（告警域）。若 BFF 暴露 `POST /chat/.../confirm-alarm`，其实现应内部转发为 `POST /alarms`，且不绕过告警域校验。

---

## 9. 域间数据交互（小结）

| 步骤         | 方向                | 载荷                                                                                                    |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------- |
| 用户发 NL    | 客户端 → 聊天域     | 用户消息文本                                                                                            |
| 助手流式回复 | 聊天域 → 客户端     | SSE：`TextBlock` delta + `UIBlock`（草稿 / 编辑器 props）                                               |
| 用户改 UI    | 客户端本地          | 不强制每键同步服务端；若需多端一致可扩展 `PATCH` 草稿接口                                               |
| 确认创建     | 客户端 → **告警域** | PRD `AlarmSpec` 兼容 JSON；`user_id` 仅服务端注入                                                       |
| 创建成功回写 | 告警域 → 客户端     | `alarm` id 等；客户端可选 **POST** 一条聊天「系统/助手」消息展示成功文案（第二条请求，或 BFF 事务组合） |

---

## 10. 上下文与记忆模块（多告警、防超长）

### 10.1 问题界定

同一 `session` 内用户可能**多轮**描述、**多次**生成草稿并确认创建多条 `alarms`。若每次请求都把**完整历史消息**（含多段长 `TextBlock`、大 `UIBlock.props`）原样塞进模型上下文，会迅速触碰 **token 上限**，且对 V1 主任务（把**当前这句话**落成**当前草稿**）信噪比低。

**设计立场**：V1 的「记忆」应**以结构化状态与告警域真源为主**，以**截断与摘要为辅**；完整聊天记录保留给 **UI 回看**，不必等价于 **LLM 可见上下文**。

---

### 10.2 三层记忆（职责分离）

| 层级           | 存放位置                             | 给 LLM 的用途                                                                       | 给用户 / 产品的用途    |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------- |
| **工作记忆**   | 不单独落库；每次请求由服务端**现组** | 系统提示 + 少量轮次 + **当前草稿 JSON** + **用户本句** + 可选「相关已存在告警」摘录 | 决定当轮解析质量       |
| **会话记忆**   | `chat_messages`（全文 `blocks`）     | **不默认全量注入**；经 §10.4 策略裁剪后再进 prompt                                  | 会话时间线、合规与调试 |
| **会话外事实** | 告警域 `alarms`、（未来）用户偏好表  | 通过 **API 拉取小 payload** 注入，而非让模型从聊天里「回忆」规则                    | 已创建规则的真源       |

**关键推论**：用户在同一 session 里建第 N 条告警时，模型**不需要**重读第 1…N-1 轮的完整助手块；需要知道「已有哪些规则」时，应 **`GET /alarms`**（按 `symbol` 或分页）得到**短列表或单行摘要**，而不是复述历史对话。

---

### 10.3 工作记忆：推荐固定注入包（概念形状）

每次调用 NL→结构化（或润色草稿）时，服务端组装的**最小高价值包**建议包含：

1. **任务说明**（短系统提示）：market V1 只做告警草稿、字段受 PRD 约束等。
2. **`user_latest`**：当前用户输入原文（若多轮澄清，可只带**最近 1～3 条**用户消息）。
3. **`draft_current`**：**当前编辑器状态**（与 `alarm_editor` / 提交体同形 JSON）。来源可以是 DB 最后一条未确认草稿、会话级 `draft` 列、或本轮流式未完成前的内存态；**以与 UI 一致的那份为准**。
4. **`alarms_context`（可选）**：由告警域查询得到的**结构化摘录**，例如「同一 `symbol` 下已有告警：id + 一行中文条件摘要」；条数上限（如 ≤10）+ 总字符上限。用于「别重复建」「用户说再严一点」等指代消解。
5. **`session_digest`（可选）**：见 §10.5；无则省略。

**不**建议默认注入：整段历史里每一轮的完整 `UIBlock.props` 副本、已确认创建的多段长说明文。

#### 10.3.1 未确认告警草稿：**禁止**用占位符替代

- **尚未**经用户点击「确认创建」、仍可能被继续 NL 修改的告警草稿，其结构化内容对模型是**工作真源**：若用占位符替换，模型**拿不到**当前条件/标的/组合方式，后续轮次会胡编或与 UI 脱节。
- 组 prompt 时必须保证 **`draft_current`（或与 UI 一致的完整 JSON）** 以**全文**进入本次请求（可受 `context_budget` 保护的是**其它**段落，不是当前草稿本体——若单条草稿本身过大，应靠 PRD 字段上限与产品约束，而非静默截断）。
- **块降级（§10.4）仅适用于**：已**冻结**的历史轮次——例如已确认创建后由短消息替代的那轮、或用户已明确放弃/切换任务且产品定义「不再编辑」的旧 `UIBlock`。**不要**对「当前正在编辑的这一份」做占位替换。

---

### 10.4 防超长策略（可组合）

| 策略                     | 做法                                                                                                                                                                                           | 适用                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **滑动窗口**             | 只取最近 **K 个 message 对**（如 K=6～12）参与「对话感」；更早的**不进** prompt                                                                                                                | 通用基线                                                                  |
| **块降级（喂模型时）**   | 仅针对**非当前**、已冻结的历史助手消息里的 `UIBlock`，在组 prompt 时替换为**一行占位**：`[告警草稿卡片 message_id=… 已省略；当前草稿见 draft_current]`；**当前未确认草稿**见 §10.3.1，不得替换 | 历史中多次大块 props、且已有独立的 `draft_current` 承载「正在编的那一份」 |
| **确认后压缩**           | 每次 `POST /alarms` 成功后，**插入一条极短**的 `assistant` 或 `system` 风格消息（落库）：「已创建：{symbol} {条件一句}（alarm_id=…）」；后续 window 用该条代替之前那整轮长块                   | 同 session 多告警                                                         |
| **会话分叉（产品策略）** | 创建成功后**引导新开 session**，或服务端自动 `POST /chat/sessions` 绑定「下一告警」                                                                                                            | 强隔离、最简单控 token                                                    |
| **按意图选路**           | 「新描述」轮次：**user_latest + draft_current** 即可；「参照已有告警改」：**alarm_id** + `GET /alarms/:id` 注入，而非翻旧聊天                                                                  | 指代明确时                                                                |

实现上建议维护 **`context_budget`（字符或 token 估算）**：先扣系统提示与 schema，再扣 `draft_current` 与 `alarms_context`，最后才把剩余预算给「最近用户句 + 滑动窗口」。

---

### 10.5 会话摘要（可选，V1.5 / V2）

当会话**极长**且仍需跨多轮指代（「把上一条那个茅台的改成…」）时，可增加：

- **`chat_sessions.memory_summary`（text）**，或独立表 `chat_session_summaries`（`session_id`、`summary`、`updated_at`）；
- 在**创建成功**、或每 M 条消息后，由**异步任务**用廉价模型或规则把**窗口外**历史压成短摘要（标的、已建告警 id 列表、用户偏好短语）；
- 组 prompt 时注入 `session_digest`，与滑动窗口**去重**（摘要已覆盖的内容不再逐条贴原文）。

V1 **可不建**摘要表；**滑动窗口 + 块降级 + alarms API 摘录**通常足够。

---

### 10.6 与流式、落库的关系

- **流式当轮**：仍可全量推 SSE；**落库**保持完整 `blocks`，便于客户端渲染与审计。
- **组下一轮流式请求**：走 §10.3～§10.4，**读库后裁剪**，不读「原始全量进模型」。

#### 10.6.1 占位符与模型侧 prompt 缓存

- **不要因占位而改写 `chat_messages` 落库内容**：块降级只发生在**组装发往 LLM 的字符串（或 message 数组）**时；DB 仍存完整 `blocks`。这样既不破坏 UI/审计，也与「是否命中缓存」无直接耦合——缓存看的是**请求体里的文本**，不是表里的行。
- **厂商 prompt 缓存（如前缀 KV cache）**一般要求：参与缓存的那段 **prompt 前缀在多次请求间按字节（或按 provider 规则）一致**。若同一历史轮次在请求 A 用「全文 UIBlock」，请求 B 改成「占位符」，前缀发生变化，**相对「始终同一编码方式」而言会更容易 miss**；反之，若从第一次起就对**已冻结**的旧轮次**固定**用同一模板占位（例如仅含 `message_id` + 一行不变摘要），前缀更短、更稳定，**有利于**对「早期轮次」段落的缓存命中。
- **新用户一轮必然追加后缀**，整段对话不可能整包命中；缓存收益主要在 **system + 较早且不再变的轮次**。避免在占位串里夹带**每请求变化**的噪声（时间戳、随机 UUID、当日 token 计数等），否则会系统性打穿缓存。
- **结论**：占位符策略本身不强制「损害缓存」；损害来自 **同一语义位置在不同请求里编码不一致** 或 **把会变的元数据打进前缀**。实现上把「历史消息 → 模型可见文本」做成**纯函数**：`(message_row, policy_version) → string`，对已 `done` 的消息行输出稳定即可。

---

### 10.7 非目标（记忆子模块）

- 不在 V1 做通用「个人知识库」RAG 或全量聊天 embedding 检索（除非产品明确要跨会话回忆）。
- 不把 `alarms` 全表或完整 `condition_group` 长期贴在 system 里；**按需、有上限**查询。

---

## 11. 非目标（V1）

- 不在聊天域实现规则评估、冷却、边沿触发。
- 不将 `notifications` / `alarm_feedback` 挂在会话消息上作为唯一存储（反馈仍走告警域契约，见 PRD §6.2）。
- 不强制多模态（图片/语音）；协议上 Block 可演进扩展，V1 以文本 + `alarm_*` UI 为主。
- 不在产品协议中暴露「触发流水号」；与告警域、总览文档一致。

---

## 12. 参考文档

- 产品主流程与数据结构：`docs/prds/market-prd.md`
- 告警表结构、软删除、`POST /alarms`、队列载荷：`docs/designs/market-alarm-domain.md`
- 三域划分、`notifications` 归属：`docs/designs/market-domain-model.md`
- 身份与鉴权：`docs/designs/market-identity-access-domain.md`
