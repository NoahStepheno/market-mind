下面是基于你收敛后的方向（**只做智能告警 V1**）整理的一版**可直接用于开发的精简 PRD（含数据结构）**。我已经帮你做了产品与工程的统一设计，尽量做到「可以直接开工」。

---

# market PRD V1.0（精简版：智能告警引擎）

---

## 一、产品定位（收敛版）

### 一句话定义

market 是一个 AI 驱动的股票告警工具——用户用一句人话描述关注条件，系统帮他生成规则，并在条件触发时精准通知。

---

### V1 核心目标

> ❗只做好一件事：**高信噪比的智能告警**

---

### 不做的事（V1 强约束）

- ❌ 不做交易归因
- ❌ 不做 OCR / 交割单
- ❌ 不做买入前策略记录
- ❌ 不做复杂技术指标（MACD / KDJ 等）
- ❌ 不做嵌套逻辑（复杂 AND/OR）

---

## 二、核心用户流程（唯一主流程）

```text
用户输入一句话
↓
AI 解析（生成草稿）
↓
用户确认条件（UI结构化）
↓
生成 AlarmSpec
↓
实时数据触发
↓
推送通知 + 用户反馈
```

### 2.1 域边界（工程约定）

- **聊天域**：承载会话、自然语言输入、AI 解析的**中间态（草稿）**。草稿不落「告警域」存储；用户未确认前**不存在** `alarms` 实例。
- **告警域**：仅在用户在聊天/确认流中点击「确认创建」后，写入 **`alarms`（AlarmSpec 持久化）**。规则引擎、触发、通知只读告警域数据。

---

## 三、核心功能：智能告警创建

---

### 3.1 输入方式

用户输入自然语言，例如：

- “茅台涨到1800提醒我”
- “放量3倍提醒我”
- “跌破5%告诉我”

---

### 3.2 AI 解析输出（中间态）

AI 输出结构（不可直接执行）：

```json
{
  "symbol": "600519.SH",
  "conditions": [
    {
      "metric": "price",
      "operator": ">=",
      "value": 1800
    }
  ]
}
```

---

### 3.3 用户确认 UI（关键）

用户必须确认结构化条件：

#### UI 结构（单层）

```text
股票：贵州茅台

满足以下【全部条件】（可切换：全部 / 任意）：

[条件卡片]
价格  高于  [1800]

[+ 添加条件]

冷却时间：15分钟（可修改）

本条告警的特殊提示（可选）：
[ 老爸紧急电话________ ]   （用于推送标题/摘要；见 3.8）

推送档位：○ 普通  ● 强提醒（更响铃、更显眼；端能力见 6.4）

[确认创建]
```

---

### 3.4 条件卡片设计（语义化）

| 系统字段        | 用户显示        |
| --------------- | --------------- |
| price           | 价格            |
| pct_change      | 涨跌幅          |
| volume          | 成交量          |
| volume_ratio_5m | 5分钟成交量倍数 |

---

### 3.5 V1 支持指标（严格限制）

#### 基础指标（必须）

- price（价格）
- pct_change（涨跌幅）
- volume（成交量）
- turnover（成交额）

#### 状态类

- limit_up（涨停）
- limit_down（跌停）

#### 简单衍生

- volume_ratio_5m（5分钟量比）
- price_change_5m（5分钟涨跌）

---

### 3.6 运算符支持

| 运算符 | 含义     |
| ------ | -------- |
| >      | 大于     |
| >=     | 大于等于 |
| <      | 小于     |
| <=     | 小于等于 |
| ==     | 等于     |

---

### 3.7 条件组合规则（V1 限制）

仅支持：

```json
{
  "op": "AND",
  "conditions": []
}
```

或：

```json
{
  "op": "OR",
  "conditions": []
}
```

❌ 不支持嵌套

---

### 3.8 单条告警：特殊提示词与推送档位

用户可为**每一条**告警单独设置「这条提醒对我来说叫什么、要多响」，与标的、条件正交。

- **特殊提示词（`notifyLabel`）**：用户自定义短文案，用于推送展示。  
  _示例：条件为「茅台价格 ≥ 1800」，提示词填「老爸紧急电话」→ 推送标题/摘要中优先展示该词，便于一眼识别场景。_
- **推送档位（`notifyTier`）**：`standard` | `emphasis`
  - `standard`：默认推送样式。
  - `emphasis`：**强提醒**（端上实现：更突出铃声/振动/角标策略等；**不包含** V1 代用户拨打第三方电话，若未来支持外呼/短信通道，在本字段上扩展即可）。

未填写 `notifyLabel` 时，推送仍遵循 6.1 正文模板，标题侧使用默认股票名 + 条件摘要。

---

## 四、核心数据结构（工程可用）

---

### 4.1 AlarmSpec（核心）

```ts
type Operator = ">" | ">=" | "<" | "<=" | "==";

type Metric =
  | "price"
  | "pct_change"
  | "volume"
  | "turnover"
  | "volume_ratio_5m"
  | "price_change_5m"
  | "limit_up"
  | "limit_down";

interface Condition {
  metric: Metric;
  operator: Operator;
  value: number | boolean;
}

interface ConditionGroup {
  op: "AND" | "OR";
  conditions: Condition[];
}

type NotifyTier = "standard" | "emphasis";

interface AlarmSpec {
  id: string;

  // 所有者（告警域持久化必填；由鉴权注入，不可由客户端伪造）
  userId: string;

  // 标的
  symbol: string; // e.g. 600519.SH

  // 条件
  conditionGroup: ConditionGroup;

  // 冷却时间（秒）
  cooldown: number; // 默认 900

  // 是否启用
  enabled: boolean;

  // 单条告警：特殊提示词（可选，见 3.8）
  notifyLabel?: string;

  // 单条告警：推送档位（默认 standard）
  notifyTier: NotifyTier;

  // 上次触发时间
  lastTriggeredAt?: number;

  // 状态缓存（用于边界触发）
  lastMatchState?: boolean;
}
```

---

### 4.2 Tick 数据结构（简化）

```ts
interface Tick {
  symbol: string;
  price: number;
  pct_change: number;
  volume: number;
  turnover: number;

  // 状态
  limit_up: boolean;
  limit_down: boolean;

  timestamp: number;
}
```

---

### 4.3 衍生指标结构

```ts
interface DerivedMetrics {
  volume_ratio_5m: number;
  price_change_5m: number;
}
```

---

## 五、规则引擎设计（核心逻辑）

---

### 5.1 条件评估

```ts
function evaluateCondition(cond: Condition, data: any): boolean;
```

---

### 5.2 条件组评估

```ts
function evaluateGroup(group: ConditionGroup, data: any): boolean {
  if (group.op === "AND") {
    return group.conditions.every((c) => evaluateCondition(c, data));
  }
  return group.conditions.some((c) => evaluateCondition(c, data));
}
```

---

### 5.3 边界触发机制（关键）

```ts
if (currentMatch === true && lastMatchState === false) {
  trigger();
}
```

---

👉 防止重复触发

---

### 5.4 冷却机制

```ts
if (now - lastTriggeredAt < cooldown) {
  skip;
}
```

---

## 六、告警触发与通知

---

### 6.1 通知内容模板（强约束）

正文模板（不变）：

```text
【股票名称 + 变化】｜【触发条件】｜你设的条件触发了
```

示例：

```text
贵州茅台 ↑ 1805｜价格突破1800｜你设的条件触发了
```

**与 3.8 的配合**：若告警配置了 `notifyLabel`，推送的**标题或摘要前缀**应包含该提示词（具体版式由端统一规范），例如标题：`老爸紧急电话 · 贵州茅台`，正文仍用上面模板。

---

### 6.2 通知反馈（必须做）

每条通知包含：

- 👍 有用
- 👎 没用

反馈与 **告警实例（`alarmId`）+ 当前用户** 关联即可；**不在产品协议或客户端模型中暴露「触发流水号」**——若服务端内部需要幂等或投递对账，使用系统内部标识即可，对用户透明。

---

### 6.3 通知策略（V1 简化）

| 类型         | 行为               |
| ------------ | ------------------ |
| 普通告警     | 立即推送           |
| 无反馈       | 默认继续           |
| 用户标记无用 | 后续用于优化（V2） |

---

### 6.4 推送档位（与 `notifyTier` 对齐）

| `notifyTier` | 产品含义 | V1 端上建议行为（可迭代）                |
| ------------ | -------- | ---------------------------------------- |
| `standard`   | 普通告警 | 默认渠道、默认铃声                       |
| `emphasis`   | 强提醒   | 更高优先级通道、更显眼样式、可配专用铃声 |

---

## 七、默认告警模板（冷启动关键）

系统预置 3 个模板：

---

### 模板1：价格突破

```text
价格 高于 昨日最高价
```

---

### 模板2：放量

```text
5分钟成交量 是 平均的 3倍
```

---

### 模板3：大涨/大跌

```text
涨跌幅 超过 ±5%
```

---

👉 用户一键启用；模板实例的 `notifyLabel` 默认空、`notifyTier` 默认 `standard`，用户可在告警详情中再改。

---

## 八、系统架构（简化版）

```text
行情数据流
   ↓
指标计算层（5分钟聚合）
   ↓
规则引擎（AlarmSpec，含 userId / notifyLabel / notifyTier）
   ↓
触发队列
   ↓
通知服务（按用户路由；标题/通道受 notifyLabel、notifyTier 影响）
```

---

## 九、成功指标（V1）

---

### 核心指标

- 告警误报率 < 10%
- 人均日触发数：3~8 条
- 通知点击/查看率 > 60%
- 用户设置告警数 ≥ 2

---

## 十、V1 验收标准（最重要）

---

### 必须满足：

1. 用户 1 分钟内创建一个告警
2. 告警触发逻辑稳定（无重复轰炸）
3. 通知内容一眼能懂
4. 用户能感知“这个提醒有用”

---
