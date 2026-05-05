# AI Parser Prompt Spike

**Status:** spike
**Date:** 2026-05-05

## Goal

Design a system prompt that converts Chinese natural-language alarm requests into structured `conditionGroup` JSON. This prompt will drive the chat module's AI parsing capability.

---

## Target Output Schema

```json
{
  "symbol": "600519.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price", "operator": "<", "value": 1800 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "茅台跌破1800",
  "notifyTier": "standard"
}
```

### conditionGroup constraints

- `op`: `"AND"` | `"OR"` (V1 only supports one level, no nesting)
- `conditions`: array of 1–5 leaf conditions
- Each leaf: `{ metric, operator, value }`
- `metric` enum: `price | pct_change | volume | turnover | volume_ratio_5m | price_change_5m | limit_up | limit_down`
- `operator` enum: `> | >= | < | <= | ==`
- `value`: number or boolean (boolean only for `limit_up`/`limit_down`)

### symbol format

A-share codes: 6-digit number with `.SH` (Shanghai) or `.SZ` (Shenzhen) suffix. Examples:

- 茅台 = `600519.SH`
- 平安银行 = `000001.SZ`
- 宁德时代 = `300750.SZ`

---

## System Prompt

```
你是 Market 的股票提醒解析器。用户用自然语言描述关注的股票条件，你需要将其解析为结构化的告警规则。

## 输出格式

返回 JSON 对象，不要包含其他文字。格式如下：

{
  "symbol": "代码.交易所",
  "conditionGroup": {
    "op": "AND",
    "conditions": [
      { "metric": "price", "operator": "<", "value": 1800 }
    ]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "用户可读的提醒标签（10字以内）",
  "notifyTier": "standard"
}

## 可用指标（metric）

- price：当前价格（元）
- pct_change：涨跌幅（百分比，如 -3.5 表示跌 3.5%）
- volume：成交量（手）
- turnover：成交额（元）
- volume_ratio_5m：5分钟量比
- price_change_5m：5分钟价格变动（元）
- limit_up：涨停（布尔值 true）
- limit_down：跌停（布尔值 true）

## 可用运算符（operator）

>  大于    >= 大于等于    < 小于    <= 小于等于    == 等于

## 规则

1. 股票代码：必须转换为「数字.交易所」格式。上海以 .SH 结尾，深圳以 .SZ 结尾。
   - 常见映射：茅台=600519.SH，平安银行=000001.SZ，宁德时代=300750.SZ，比亚迪=002594.SZ，中芯国际=688981.SH，招商银行=600036.SH
   - 如果用户只说了名字但无法确定代码，在 JSON 外用文字询问确认。
2. 默认冷却时间 900 秒（15分钟），除非用户明确指定。
3. 如果条件涉及"涨停"或"跌停"，使用 limit_up/limit_down 指标，value 为 true。
4. 如果用户描述了多个条件，使用 AND 组合（除非明确说"或"）。
5. notifyLabel 应该简洁概括告警内容，不超过 10 个字。
6. notifyTier 默认 "standard"，除非用户说"紧急"或"重要"则用 "emphasis"。
7. 如果无法解析出完整的条件（缺少关键信息），返回一个错误对象：
   { "error": true, "message": "描述性错误信息，告诉用户缺了什么" }
```

---

## Test Cases

### 1. Single price condition

**Input:** `茅台跌破1800时提醒我`
**Expected:**

```json
{
  "symbol": "600519.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price", "operator": "<", "value": 1800 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "茅台跌破1800",
  "notifyTier": "standard"
}
```

### 2. Price rise with percentage

**Input:** `比亚迪涨超过5%的时候通知我`
**Expected:**

```json
{
  "symbol": "002594.SZ",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "pct_change", "operator": ">", "value": 5 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "比亚迪涨幅超5%",
  "notifyTier": "standard"
}
```

### 3. Limit up

**Input:** `宁德时代涨停了告诉我`
**Expected:**

```json
{
  "symbol": "300750.SZ",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "limit_up", "operator": "==", "value": true }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "宁德时代涨停",
  "notifyTier": "standard"
}
```

### 4. Compound conditions (AND)

**Input:** `招商银行成交量超过10万手且价格低于35元`
**Expected:**

```json
{
  "symbol": "600036.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [
      { "metric": "volume", "operator": ">", "value": 100000 },
      { "metric": "price", "operator": "<", "value": 35 }
    ]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "招行放量跌破35",
  "notifyTier": "standard"
}
```

### 5. Compound conditions (OR)

**Input:** `中芯国际涨到120或者跌到80的时候都要提醒`
**Expected:**

```json
{
  "symbol": "688981.SH",
  "conditionGroup": {
    "op": "OR",
    "conditions": [
      { "metric": "price", "operator": ">=", "value": 120 },
      { "metric": "price", "operator": "<=", "value": 80 }
    ]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "中芯突破区间",
  "notifyTier": "standard"
}
```

### 6. Custom cooldown

**Input:** `茅台跌破1800时提醒我，一天最多提醒一次`
**Expected:**

```json
{
  "symbol": "600519.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price", "operator": "<", "value": 1800 }]
  },
  "cooldownSeconds": 86400,
  "notifyLabel": "茅台跌破1800",
  "notifyTier": "standard"
}
```

### 7. Urgent tier

**Input:** `平安银行跌破10块，这个很重要，赶紧告诉我`
**Expected:**

```json
{
  "symbol": "000001.SZ",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price", "operator": "<", "value": 10 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "平安银行破10",
  "notifyTier": "emphasis"
}
```

### 8. Unknown stock name

**Input:** `恒生电子跌到30提醒我`
**Expected:**

```json
{
  "symbol": "600570.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price", "operator": "<=", "value": 30 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "恒生电子跌至30",
  "notifyTier": "standard"
}
```

### 9. Ambiguous / missing information

**Input:** `帮我关注一下那个科技股`
**Expected:**

```json
{ "error": true, "message": "请告诉我具体哪只股票（名称或代码），以及你想关注的条件。" }
```

### 10. Out of scope request

**Input:** `今天大盘怎么样`
**Expected:**

```json
{
  "error": true,
  "message": "我是告警设置助手，只能帮你设置股票提醒。比如你可以说「茅台跌破1800时提醒我」。"
}
```

### 11. 5-minute price change

**Input:** `贵州茅台5分钟内涨了超过2块就提醒我`
**Expected:**

```json
{
  "symbol": "600519.SH",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "price_change_5m", "operator": ">", "value": 2 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "茅台5分钟涨超2",
  "notifyTier": "standard"
}
```

### 12. Volume ratio

**Input:** `比亚迪5分钟量比超过2倍的时候通知我`
**Expected:**

```json
{
  "symbol": "002594.SZ",
  "conditionGroup": {
    "op": "AND",
    "conditions": [{ "metric": "volume_ratio_5m", "operator": ">", "value": 2 }]
  },
  "cooldownSeconds": 900,
  "notifyLabel": "比亚迪放量",
  "notifyTier": "standard"
}
```

---

## Findings & Recommendations

1. **Stock name → code resolution** is the biggest accuracy risk. The prompt includes a small lookup table of common stocks, but production will need either:
   - A dedicated stock search API (preferred — most reliable)
   - A RAG-augmented prompt with a stock name database
   - A post-parse validation step that rejects unknown symbols

2. **Single-level conditionGroup** is sufficient for V1. No nested logic. Compound AND/OR covers the vast majority of real requests.

3. **Error handling via JSON error object** lets the chat flow gracefully ask for clarification instead of crashing.

4. **Ambiguous inputs** (case 9-10) should be handled by returning an error object. The chat UI can then display a clarifying prompt.

5. **Prompt injection defense**: The parser should run as a standalone LLM call (not concatenated into a larger conversation). Input is the user's latest message only, with no conversation history needed for the parse step.

6. **Next steps for integration**:
   - Replace the `userPrompt = "继续"` stub in `routes.ts` with actual user message content
   - Wire the parsed JSON into `streamAssistantMessage` to produce structured `UIBlock` outputs
   - Add a stock search endpoint (`GET /stocks/search?q=茅台`) to decouple name→code from the prompt
