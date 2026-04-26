# MarketMind — 告警域设计方案

**版本**：与 `docs/prds/market-mind-prd.md` V1 对齐  
**范围**：告警域内的数据、边界、评估、通知路由与对外契约；**不包含**聊天域、行情采集、AI 解析实现。

---

## 1. 目标与原则

| 原则                 | 说明                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- |
| 单用户隔离           | 每条告警属于唯一 `user_id`；所有读写经鉴权过滤                                           |
| 确认后落库           | 仅用户确认后的规则进入告警域；不在本域存「草稿」                                         |
| 可运营的通知         | 每条告警可配置 `notify_label`、`notify_tier`，供推送展示与通道策略使用                   |
| 对用户隐藏内部流水号 | 反馈与 API 不暴露 `triggerId`；内部幂等/对账如需 UUID 自行生成，不进产品协议             |
| 软删除               | 用户侧「删除」采用 **`deleted_at`**（可空时间戳），见 §4.3；规则引擎与列表默认排除已删行 |

---

## 2. 域边界

```text
┌─────────────────────────────────────────────────────────────┐
│ 聊天域（本设计不展开）                                              │
│  会话、NL 输入、AI 草稿 → 用户确认「创建告警」                            │
└───────────────────────────────┬─────────────────────────────┘
                                │ 确认后写入
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ 告警域（本文档）                                                  │
│  alarms → 规则引擎 ← 行情/指标                                    │
│         → 触发队列 → 通知模块（同域；按 user + notify_*；落库见总览 §5）      │
│         ← alarm_feedback（可选）                                  │
└─────────────────────────────────────────────────────────────┘
```

| 域     | 持久化职责                                 | 告警域是否承担                     |
| ------ | ------------------------------------------ | ---------------------------------- |
| 聊天域 | 草稿、会话、未确认的解析中间态             | 否；**无 `alarm_drafts` 或等价表** |
| 告警域 | 已确认 `AlarmSpec`、运行态、反馈（若落库） | 是                                 |

---

## 3. 核心概念

- **Alarm（告警实例）**：一条 `alarms` 行，对应 PRD 中一个带 `userId` 的 `AlarmSpec`，并附加 `notify_label`、`notify_tier`。
- **评估键**：按 `symbol` 加载多条告警；每条告警的 `last_match_state` / `last_triggered_at` **按 `alarm_id` 独立**，禁止按标的全局共享。
- **触发消息**：进入队列的最小载荷需能完成「找用户 + 渲染 + 选通道」，见 §6。

---

## 4. 数据模型

### 4.1 表：`alarms`

| 列                          | 类型        | 约束与说明                                                    |
| --------------------------- | ----------- | ------------------------------------------------------------- |
| `id`                        | UUID        | PK；与 API/PRD 中告警 id 一致                                 |
| `user_id`                   | UUID        | NOT NULL，FK → `users.id`，索引；**仅服务端从鉴权上下文写入** |
| `symbol`                    | text        | NOT NULL，索引；标的代码                                      |
| `condition_group`           | JSONB       | `ConditionGroup`（PRD §4.1）                                  |
| `cooldown_seconds`          | int         | NOT NULL，默认 900                                            |
| `enabled`                   | boolean     | NOT NULL，默认 true                                           |
| `notify_label`              | text        | NULL 允许；用户「特殊提示词」，建议 API 长度上限（如 64）     |
| `notify_tier`               | enum        | `standard` \| `emphasis`，NOT NULL，默认 `standard`           |
| `last_triggered_at`         | timestamptz | NULL 允许                                                     |
| `last_match_state`          | boolean     | NOT NULL，默认 false；边沿检测                                |
| `deleted_at`                | timestamptz | NULL = 未删除；非 NULL = 已软删，见 §4.3                      |
| `created_at` / `updated_at` | timestamptz | NOT NULL                                                      |

**索引建议**：`(user_id)`；`(symbol)` 或 `(symbol, enabled)`，按实际查询与数据量调优。加载待评估告警时须叠加 **`deleted_at IS NULL`**。

### 4.3 软删除（`deleted_at`）

- **语义**：`deleted_at IS NULL` 表示告警仍有效；执行用户删除时写入**当前时间**，不物理删行（除非另有合规/运维硬删流程）。
- **查询**：列表、`GET`、按 `symbol` 拉取规则引擎候选集，**默认**均带 `WHERE deleted_at IS NULL`。已删告警可按产品需要返回 404 或单独「回收站」接口（若以后做）。
- **唯一约束**：若存在「每用户每 symbol 仅一条」类约束，对已软删行需 **partial unique index**（仅 `deleted_at IS NULL` 的行唯一），否则用户删后无法再建等价告警。
- **API**：`DELETE /alarms/:id` 实现为设置 `deleted_at`（幂等：已删则 no-op 或仍 204）；恢复（若 V2）可清空 `deleted_at`。

### 4.2 表：`alarm_feedback`（可选，V1 若落库反馈）

| 列           | 类型        | 说明                                     |
| ------------ | ----------- | ---------------------------------------- |
| `id`         | UUID        | PK                                       |
| `alarm_id`   | UUID        | FK → `alarms.id`                         |
| `user_id`    | UUID        | 与 `alarms.user_id` 一致性由写入路径保证 |
| `rating`     | enum        | 有用 / 无用（与 PRD 👍👎 对齐）          |
| `created_at` | timestamptz |                                          |

**对外契约**：客户端提交 `alarm_id` + `rating`；可带**窄语义**的辅助字段（如客户端感知的推送时间窗口），**不要求**也不返回用户可见的「触发流水号」。

---

## 5. 与 PRD 类型对应

PRD `AlarmSpec` 中的 `userId`、`notifyLabel`、`notifyTier` 映射至上表 `user_id`、`notify_label`、`notify_tier`；`conditionGroup` → `condition_group`；`cooldown` → `cooldown_seconds`；运行态字段列化便于引擎更新与并发控制。

---

## 6. 运行时流程

### 6.1 写入路径

1. 聊天域用户确认 → 调用告警域 **`POST /alarms`**（或由 BFF 聚合）。
2. 服务端校验 JSON Schema / 业务规则后插入 `alarms`，`user_id` 来自 token，**忽略**请求体中的任何用户冒充字段。

### 6.2 评估路径

1. 行情管道产出某 `symbol` 的 Tick + 衍生指标。
2. 查询 `alarms`：`symbol` = 当前标的且 `enabled = true` 且 **`deleted_at IS NULL`**。
3. 对每条告警：`evaluateGroup` → 边沿（`last_match_state` false→true）→ 冷却检查 → 通过则更新 `last_triggered_at`、`last_match_state`，并投递队列。

### 6.3 队列消息（最小字段）

| 字段                           | 用途                                                     |
| ------------------------------ | -------------------------------------------------------- |
| `alarm_id`                     | 关联告警与后续反馈                                       |
| `user_id`                      | 查推送目标                                               |
| `symbol`                       | 文案与复盘                                               |
| `notify_label` / `notify_tier` | 标题组合与通道策略（PRD §6.1、§6.4）                     |
| 渲染包                         | 股票名、价、条件摘要等（可由引擎预渲染或通知模块查缓存） |

内部若生成投递 UUID，**仅用于**去重、日志、重试，**不**作为面向用户的 `triggerId` 契约。

### 6.4 通知模块（V1 与告警域同边界）

- **路由**：`user_id` → 设备 token 列表（表结构属身份与访问域，本设计只约定依赖关系）。
- **落库**：触达记录见 `docs/designs/market-mind-domain-model.md` §5 `notifications`。
- **标题**：若 `notify_label` 非空，与股票简称等组合（PRD 示例：`{notify_label} · {股票简称}`）。
- **正文**：PRD 6.1 模板。
- **`notify_tier`**：映射到系统通知渠道优先级、铃声等（PRD 6.4）；V1 不包含代拨第三方电话。

---

## 7. API 形状（告警域）

| 方法   | 路径                                 | 说明                                                     |
| ------ | ------------------------------------ | -------------------------------------------------------- |
| POST   | `/alarms`                            | 创建；body 含条件组、cooldown、notify_label、notify_tier |
| GET    | `/alarms`                            | 列表；仅当前用户                                         |
| GET    | `/alarms/:id`                        | 详情；校验归属                                           |
| PATCH  | `/alarms/:id`                        | 更新条件、启停、通知字段等                               |
| DELETE | `/alarms/:id`                        | **软删除**：设置 `deleted_at`（非物理删）                |
| POST   | `/alarms/:id/feedback`（若单独资源） | 👍👎；body 仅含 rating 等，无触发流水号                  |

模板「一键启用」：服务端为当前用户插入行，`notify_label` 空、`notify_tier = standard`（PRD §七）。

---

## 8. 非目标（V1）

- 告警域不存储聊天草稿、不实现 NL→条件的 AI。
- 不在产品层暴露「第几次触发」的全局可见 ID；统计与误报率可在服务端用内部事件表聚合。
- `emphasis` 不承诺外呼/短信；仅端内强提醒语义。

---

## 9. 参考文档

- 各域划分、聊天域职责、V1 **`notifications` 表**（触达并入告警域）：`docs/designs/market-mind-domain-model.md`
- 产品定义与 `AlarmSpec` 全文：`docs/prds/market-mind-prd.md`
- 实现排期与 checklist：`docs/plans/market-mind-alarms-technical.md`
