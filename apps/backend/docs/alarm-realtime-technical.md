# 告警域实时评估与投递 — Backend 技术方案

**目的**：在 `docs/designs/market-mind-alarm-domain.md` 的域模型与流程（§6.2–§6.4）之上，给出 **market-backend** 侧可落地的实时链路：行情/指标更新 → 按标的加载告警 → 边沿与冷却 → 异步通知与落库。

**范围**：本方案描述后端与队列消费者的职责边界、数据流、并发与幂等策略；**不**展开聊天域、NL 解析、行情采集实现细节。与总览中 `notifications` 约定一致，见 `docs/designs/market-mind-domain-model.md` §5。

---

## 1. 实时语义与目标

| 维度         | V1 目标                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **评估延迟** | 单标的 Tick/Bar 到达后，在可配置预算内（建议 P95 &lt; 2s，后续按 SLA 收紧）完成「候选告警评估 + 通过冷却的触发决策」                                                                 |
| **触达延迟** | 触发决策后，经 outbox → **进程内内存队列** 再调推送/APNs/FCM；**不**在 HTTP 请求线程内同步调用第三方                                                                                 |
| **一致性**   | `last_match_state`、`last_triggered_at` 与「至多一次对用户可见的重复推送」之间可接受 **at-least-once（outbox 重放 + 内存）+ 幂等落库/投递**；禁止按 `symbol` 共享运行态（域设计 §3） |
| **隔离**     | 所有持久化与队列载荷带 `user_id`；评估与消费路径不信任客户端传入的用户标识                                                                                                           |

「实时」在此指 **近实时管道**，而非要求 Web 长连接内秒级同步每一条行情；端上强提醒仍以推送通道为主（PRD / 域设计）。

---

## 2. 总体架构

```text
                    ┌─────────────────────┐
  行情/指标服务      │  Tick / Bar / 指标   │
  (market-database   │  { symbol, ts, … }  │
   或上游流)        └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Ingest 适配层       │  规范化 symbol、时间戳、价格/指标快照
                    │  (HTTP 内网 / 订阅)   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Symbol 评估作业     │  每 symbol 串行或分片并行（见 §4）
                    │  AlarmEvaluator      │
                    └──────────┬──────────┘
                               │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        ┌──────────┐                  ┌──────────────┐
        │ Postgres │                  │  outbox 表   │
        │ alarms   │                  │  + Relay     │
        │ 行级更新  │                  │  → 内存队列   │
        └──────────┘                  └──────┬───────┘
                                           │
                                           ▼
                    ┌─────────────────────┐
                    │  Notify Worker       │  消费内存队列；写 notifications、调推送
                    │  (同进程或独立子任务)   │
                    └─────────────────────┘
```

**与现有 apps/backend 的关系**：当前仓库为 Hono + Drizzle + `postgres`（`src/common/db/client.ts`）。HTTP API（`/alarms` 等）与 **评估/消费** 宜拆为可独立扩缩的进程角色（同代码库、不同 entry 或 `vp run` 任务），避免长连接或重计算拖垮 API 延迟。

---

## 3. 数据流（对齐域 §6.2–§6.3）

### 3.1 输入事件

统一内部事件形状（示例字段，可与 market-database 契约对齐）：

- `symbol`：与 `alarms.symbol` 一致规范化后的代码
- `occurred_at`：事件时间（用于冷却比较，**服务端时钟**与行情时间二选一需文档化；建议优先 **行情时间**，缺失时回退 `now()`）
- `payload`：评估所需最小快照（最新价、OHLC、或预计算指标），足以执行 `condition_group` 而不必再查远程行情

### 3.2 加载候选告警

```sql
-- 语义等价（索引见域设计 §4.1）
SELECT * FROM alarms
WHERE symbol = $1
  AND enabled = true
  AND deleted_at IS NULL;
```

**按 `alarm_id` 独立运行态**：评估循环内禁止把 `last_match_state` 缓存在「仅按 symbol」的共享结构里；若进程内缓存告警行，键必须为 `alarm_id`（或整行版本号）。

### 3.2.1 V1：`condition_group` 形状与上限

- **单层逻辑**：整组 **仅一层**——一个组合符 **`AND` 或 `OR`（二选一）** 连接若干 **叶子条件**；**不**支持嵌套子组（无 `(A AND B) OR (C AND D)` 这类多层结构；若 PRD 类型更泛，服务端仍按「拍平为一层」校验，超出则拒绝写入）。
- **多条件**：叶子条件可有 **多个**，由用户/客户端在创建 `POST /alarms`、更新 `PATCH` 时配置。
- **个数上限**：**默认每条告警最多 5 个叶子条件**（默认 **`> 5` 不允许**）。若需放宽，仅通过 **服务端配置**（如环境变量）调整可接受的最大叶子数，并在 Schema/文档中写明 **绝对硬顶**，避免单条告警拖垮评估。创建/更新与评估器入口均须校验。

### 3.3 评估与边沿 + 冷却

1. 对每条告警计算 `condition_group`（符合 §3.2.1）→ 当前布尔 `match_now`。
2. **边沿**：仅当 `!last_match_state && match_now` 视为「新一次满足」。
3. **冷却**：若 `last_triggered_at` 非空且 `occurred_at - last_triggered_at < cooldown_seconds`，则**不**入队、**不**更新 `last_triggered_at`；仍**将 `last_match_state` 更新为当前 `match_now`**，与条件是否满足保持一致，避免冷却结束或条件抖动后出现重复边沿。
4. 通过则：**事务内** 更新 `last_triggered_at`、`last_match_state`，并写入 **触发 outbox**（见 §5）。

### 3.4 队列最小载荷（域 §6.3）

与域文档一致，至少包含：`alarm_id`、`user_id`、`symbol`、`notify_label`、`notify_tier`、渲染包（简称、价、条件摘要等）。  
内部 `delivery_id`（UUID）或 `dedupe_key` **不出**现在面向用户的 API 中；用于 `notifications.dedupe_key` 与日志。

---

## 4. 并发与扩展

### 4.1 Symbol 分片

- **同一 `symbol` 的事件** 应 **串行处理**（单消费者分区键 = `symbol`），避免两条 Tick 交错读写同一批 `alarms` 导致 `last_match_state` 乱序。
- 不同 `symbol` 可并行（多 worker + **按 symbol 分的内存队列**或单进程分时片）。

### 4.2 单行更新与竞争

高并发下同一告警可能被快速连续 Tick 命中：

- **推荐**：`UPDATE alarms SET … WHERE id = $id AND enabled = true AND deleted_at IS NULL AND (last_triggered_at IS NULL OR $occurred_at >= last_triggered_at + cooldown * interval '1 second') … RETURNING *` 由 **一行是否被更新** 判定是否产生触发；或将「触发决策 + 状态更新」放在 **单条 SQL CTE** 或 **乐观锁**（`updated_at` / `version`）内。
- 避免「先 SELECT 再 UPDATE」无锁跨步导致的双触发。

### 4.3 读路径缓存

**V1 不做**：评估路径只读 Postgres，依赖 `(symbol, enabled, deleted_at)` 等索引；不按 `symbol` 引入 Redis 或进程外缓存。若上线后该查询成为瓶颈，再在后续版本评估 **短 TTL + 写路径失效** 等方案。

---

## 5. 触发消息的可靠投递

**V1 裁定**：采用 **Transactional Outbox**，使用 **专用表 `alarm_trigger_outbox`**（**不**复用 `notifications` 行代替 outbox）。触达落库仍以域模型中的 **`notifications`** 为准；outbox 仅承载「从告警触发到进入通知流水线」的可靠 handoff。

### 5.1 Transactional Outbox

**是什么（通俗）**：业务里常有两步——**改数据库**（例如更新告警状态）和**告诉下游去做副作用**（例如发推送）。若先改库再在**另一套系统**里登记任务，进程可能在中间崩溃，结果是 **库已改、下游永远没收到**；若先登记再改库，则可能是 **下游已动、库没改**。**Transactional Outbox** 的做法是：在 **同一个数据库事务** 里，除了 `UPDATE alarms`，再 **`INSERT` 一行到本库的 `alarm_trigger_outbox` 表**（只写 Postgres，和业务写库一起提交或回滚）。之后由 **Relay** 用 `FOR UPDATE SKIP LOCKED` 轮询 outbox，把载荷推进 **进程内内存队列**（bounded channel / 环形缓冲等），由 **Notify Worker** 异步消费。**完结（V1 推荐）**：在 Notify **幂等写入 `notifications` 成功**（`INSERT` 成功或 `ON CONFLICT DO NOTHING` 视为已处理）后，将对应 outbox 行标为 **已完成**，避免无限重放；此前未完结行在进程重启后仍可由 Relay 再次投递（配合 `dedupe_key` 幂等）。**V1 不引入** Kafka、SQS、RabbitMQ、Redis Stream 等外部消息中间件。

在 **同一数据库事务** 中：

1. `UPDATE alarms`（运行态 + 触发时刻）；
2. `INSERT INTO alarm_trigger_outbox`：完整队列载荷、`dedupe_key`，以及便于 Relay 筛选的状态列（如 `created_at`、待处理 / 已完成标记，具体列名在迁移中定义）。

**Relay + 内存**：单进程或同应用内多协程时，Relay 循环 `SELECT … FOR UPDATE SKIP LOCKED`（仅 **未完成** 行）→ `publish` 到内存队列；**勿**在仅入内存时就把 outbox 标为终态（与 §5.1 完结条件一致，避免崩溃丢在途却误以为已投递）。Notify 侧背压时内存队列满，Relay 应阻塞或暂停拉取，避免无声丢事件。多副本部署时，**未完结 outbox 行**仍是真源；各实例重启后从库续拉即可（注意避免同一行被两实例同时 relay 时，须保证仅一消费者组写内存队列，或每行 relay 与 notify 仍串行在同一 leader 上——V1 可简化为 **单 Relay 槽位** 或 **单实例跑 notify 链**）。

**收益**：评估崩溃时不会出现「库已改但 outbox 未插入」的分裂；进程崩溃后内存队列中的在途任务会丢，但 **outbox 未 ACK 的行可重放**（配合 Notify 侧 `dedupe_key` 幂等，重复投递可接受）。

### 5.2 `notifications` 通用化约定（解耦告警）

为避免 `notifications` 与告警域强耦合，V1 起采用**来源抽象**而非强制 `alarm_id` 外键：

- `source_type`：通知来源类型（如 `alarm`、`system`、`portfolio`；V1 实现至少支持 `alarm`）。
- `source_id`：来源对象标识（字符串，便于承载 UUID 或未来异构主键）；可空，仅在确有来源对象时写入。
- `user_id`、`dedupe_key`、`title`、`body`、`notify_tier`、`status`、时间戳保持不变。
- 新增 `read_at`（可空时间戳）：`NULL` 表示未读，非 `NULL` 表示已读，用于面向用户的通知列表读态。

告警链路写入 `notifications` 时固定：

- `source_type = 'alarm'`
- `source_id = alarm_id`

这样可以保证后续其他业务（非告警）复用同一通知落库与投递流水，而无需被 `alarm_id` FK 约束。

### 5.3 消费者幂等

- 表 `notifications`（域总览 §5）写入时使用 **`dedupe_key` UNIQUE** 或 `INSERT … ON CONFLICT DO NOTHING`。
- 推送提供商失败时：用 **进程内重试**（退避 + 上限）或将该行重新可见给 Relay；全程依赖同一 `dedupe_key` 做 `notifications` 幂等，避免用户收到重复可见通知。
- `status` 仍表示**投递状态**（如 `pending/sent/failed`）；`read_at` 表示**用户阅读状态**，两者语义独立。

---

## 6. 与 HTTP API 的协作

| 能力                | 说明                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRUD**            | `POST/GET/PATCH/DELETE /alarms` 仅走鉴权 + Drizzle；`user_id` 从 token 注入（与身份域一致）                                                                                                                                                                                                                                                                                |
| **内网行情 ingest** | 建议 `POST /internal/v1/alarm-ingest`（mTLS 或固定 Service Token + IP allowlist），body 为 §3.1 **行情/指标事件**（`symbol`、时间、`payload` 等）。**本路由不「评估条件」**：只做鉴权、轻校验，把事件丢进 **按 symbol 的内存队列**；真正的 **`condition_group` 评估、边沿/冷却、写 `alarms` + outbox** 在下游 **Evaluator worker** 里完成（见 §2、§3）。**不**对公网开放。 |
| **健康与背压**      | ingest 在内存队列过深时返回 429/503，便于上游反压                                                                                                                                                                                                                                                                                                                          |

聊天域确认创建仍只调用 **`POST /alarms`**，与本实时链路解耦。

---

## 7. 可观测性

- **指标**：`alarm_eval_latency_ms`、`alarms_loaded_per_symbol`、`triggers_enqueued_total`、`notify_worker_lag_ms`、`dedupe_conflicts_total`。
- **日志**：结构化字段含 `symbol`、`alarm_id`（不含面向用户的 triggerId）、`delivery_id`（内部）。
- **追踪**：ingest → DB → outbox → **内存队列** → notify 共用一个 `trace_id`（HTTP 头或内存任务对象携带）。

---

## 8. 风险与后续

- **时钟**：多源行情时间与时区必须规范化；冷却比较文档化。
- **条件语言**：V1 仅 **单层 `AND`/`OR` + 多叶子条件**，默认 **≤5 叶子**（见 §3.2.1）；执行器仍应对单次求值设 **超时或步数上限**，防止异常 payload 拖死 worker。
- **端内实时列表**：若产品要求 App 内「通知列表秒级刷新」，可在 V2 增加 **SSE/WebSocket** 仅推送「有新通知」信号，详情仍拉 REST；本 V1 方案不强制。
- **纯内存桥接**：进程内队列bounded、多副本时 in-flight 语义需与 outbox 状态机对齐；扩容到多机若要强解耦，再考虑引入外部 MQ（非 V1）。

---

## 9. 文档引用

- 告警域：`docs/designs/market-mind-alarm-domain.md`
- 总览与 `notifications`：`docs/designs/market-mind-domain-model.md`
- workspace 实现排期：`docs/plans/market-mind-alarms-technical.md`

---

## 10. TODO（执行清单）

以下为 backend 落地顺序建议；与仓库根计划可双向链回。

- [x] **Schema**：Drizzle 迁移 `alarms`（含 `deleted_at`、partial unique 若产品需要「每用户每 symbol 一条未删告警」）、`alarm_trigger_outbox`（V1 已定）、`notifications`、`alarm_feedback`（若 V1 落库）
- [x] **模块**：`modules/alarms` — CRUD 路由 + Zod/JSON Schema 校验 `condition_group`（§3.2.1：单层 AND/OR、叶子数默认≤5、可配置上限）+ 列表默认 `deleted_at IS NULL`
- [x] **评估器**：纯函数 `evaluateGroup(condition_group, snapshot) -> boolean` + 单元测试（fixtures 来自 PRD 样例）
- [x] **Ingest**：内网路由 + 鉴权；将事件投递到 **按 symbol 分区** 的**内存**队列（bounded，带背压）
- [x] **Evaluator worker**：消费内存队列 → 加载 alarms → 事务内 UPDATE + outbox INSERT → 提交
- [x] **Relay**：`FOR UPDATE SKIP LOCKED` 读 outbox → 写入 **Notify 内存队列** → 更新 outbox 状态；无外部 MQ
- [x] **Notify worker**：消费内存队列 → `notifications` 幂等插入 → **将对应 outbox 标为已完成** → 调用 FCM/APNs（进程内重试/退避；失败时 outbox 保持未完结以便 Relay 重放 + `dedupe_key`）
- [ ] **监控**：接入 §7 指标与告警（队列积压、评估 P95）_（已完成进程内指标聚合，尚未接入外部监控/告警平台）_
- [ ] **文档**：与 `market-database` 约定 Tick 字段与 ingest 频率上限；内网 OpenAPI 片段或 `docs/rules/modules/` 下模块说明（若团队要求）
