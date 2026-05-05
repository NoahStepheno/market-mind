# P3: AI Parser Prompt Spike — Chinese A-Share Trading Scenarios

**Date:** 2026-05-05
**Scope:** Story 2.3 (AI Natural Language Parsing & Streaming Response)
**Target:** Design system prompt, output schema, and integration plan for GLM-5 NL→Structured alarm parsing

---

## 1. Parser Interface Design

### 1.1 Abstract Interface (from Architecture)

```ts
// ai/parser-interface.ts
interface AlarmParser {
  parse(input: ParserInput): Promise<ParserOutput>;
}

interface ParserInput {
  userMessage: string;
  sessionId: string;
  recentMessages: ContextMessage[];
  contextBudget: number;
}

interface ParserOutput {
  textExplanation: string;
  draft: ParsedDraft | null; // null = unsupported request
}

interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}
```

### 1.2 ParsedDraft Schema (Maps to Alarm Creation API)

```ts
// ai/schemas.ts — Zod v4 schema for AI output validation
const ConditionSchema = z.object({
  metric: z.enum([
    "price",
    "pct_change",
    "volume",
    "turnover",
    "limit_up",
    "limit_down",
    "volume_ratio_5m",
    "price_change_5m",
  ]),
  operator: z.enum([">=", "<=", ">", "<", "==", "!="]),
  value: z.number(),
});

const ParsedDraftSchema = z.object({
  symbol: z.string().describe("Stock code, e.g. 600519"),
  symbolName: z.string().describe("Stock name in Chinese, e.g. 贵州茅台"),
  conditionGroup: z.object({
    operator: z.enum(["AND", "OR"]),
    conditions: z.array(ConditionSchema).min(1).max(5),
  }),
  cooldownSeconds: z.number().int().min(0).max(86400).default(900),
  notifyLabel: z.string().max(64).nullable().optional(),
  notifyTier: z.enum(["standard", "emphasis"]).default("standard"),
});
```

---

## 2. System Prompt Design

### 2.1 Core System Prompt

```
你是 Market 告警助手，帮助用户将自然语言描述转化为结构化的股票告警条件。

## 你的能力

你可以解析用户的自然语言请求，生成结构化的告警草稿。告警由以下要素组成：

### 支持的指标（metrics）
- price: 当前价格
- pct_change: 涨跌幅（百分比）
- volume: 成交量（手）
- turnover: 成交额（元）
- limit_up: 涨停价
- limit_down: 跌停价
- volume_ratio_5m: 5分钟量比
- price_change_5m: 5分钟涨跌额

### 支持的比较运算符
- >= (大于等于), <= (小于等于), > (大于), < (小于), == (等于), != (不等于)

### 条件逻辑
- AND: 所有条件同时满足
- OR: 任一条件满足

## 输出规则

1. 如果用户请求可以解析为有效的告警条件，输出 JSON 草稿和简短中文说明。
2. 如果用户请求涉及不支持的指标或无法识别的条件，礼貌说明限制，列出可用的指标和示例。
3. 如果信息不完整（缺少标的代码或关键数值），追问缺少的信息。
4. 始终使用 JSON 格式输出草稿，文本说明用中文。
```

### 2.2 Few-Shot Examples (Chinese Trading Scenarios)

#### Example 1: Single condition — Price breakout

**User:** "当茅台跌破1800时提醒我"

**Assistant:**

```json
{
  "textExplanation": "好的，我将为你设置一个贵州茅台的价格告警：当股价跌破1800元时触发提醒。",
  "draft": {
    "symbol": "600519",
    "symbolName": "贵州茅台",
    "conditionGroup": {
      "operator": "AND",
      "conditions": [{ "metric": "price", "operator": "<=", "value": 1800 }]
    },
    "cooldownSeconds": 900,
    "notifyLabel": "茅台跌破1800",
    "notifyTier": "standard"
  }
}
```

#### Example 2: Multi-condition AND — Price + Volume

**User:** "比亚迪放量突破250，成交量超过10万手的时候通知我"

**Assistant:**

```json
{
  "textExplanation": "为你设置比亚迪的双重条件告警：价格突破250元且成交量超过10万手时触发。",
  "draft": {
    "symbol": "002594",
    "symbolName": "比亚迪",
    "conditionGroup": {
      "operator": "AND",
      "conditions": [
        { "metric": "price", "operator": ">=", "value": 250 },
        { "metric": "volume", "operator": ">=", "value": 100000 }
      ]
    },
    "cooldownSeconds": 900,
    "notifyLabel": "比亚迪放量突破250",
    "notifyTier": "emphasis"
  }
}
```

#### Example 3: OR condition — Price range

**User:** "中芯国际涨到120或者跌到80的时候提醒我"

**Assistant:**

```json
{
  "textExplanation": "为你设置中芯国际的价格区间告警：涨到120元或跌到80元时都会触发。",
  "draft": {
    "symbol": "688981",
    "symbolName": "中芯国际",
    "conditionGroup": {
      "operator": "OR",
      "conditions": [
        { "metric": "price", "operator": ">=", "value": 120 },
        { "metric": "price", "operator": "<=", "value": 80 }
      ]
    },
    "cooldownSeconds": 900,
    "notifyLabel": null,
    "notifyTier": "standard"
  }
}
```

#### Example 4: Percentage change — Limit monitoring

**User:** "宁德时代涨跌幅超过5%提醒"

**Assistant:**

```json
{
  "textExplanation": "为你设置宁德时代的涨跌幅监控：日涨跌幅超过5%（涨或跌）时触发。",
  "draft": {
    "symbol": "300750",
    "symbolName": "宁德时代",
    "conditionGroup": {
      "operator": "OR",
      "conditions": [
        { "metric": "pct_change", "operator": ">=", "value": 5 },
        { "metric": "pct_change", "operator": "<=", "value": -5 }
      ]
    },
    "cooldownSeconds": 900,
    "notifyLabel": "宁德时代涨跌幅>5%",
    "notifyTier": "standard"
  }
}
```

#### Example 5: Unsupported metric — Graceful fallback

**User:** "当大盘的情绪指数超过80的时候提醒我"

**Assistant:**

```json
{
  "textExplanation": "抱歉，目前暂不支持「情绪指数」这个指标。以下是当前支持的所有指标：\n\n• price — 当前价格（例：股价跌破1800时提醒）\n• pct_change — 涨跌幅（例：涨跌幅超过5%时提醒）\n• volume — 成交量（例：成交量超过10万手时提醒）\n• turnover — 成交额（例：成交额超过50亿时提醒）\n• limit_up — 涨停价（例：接近涨停时提醒）\n• limit_down — 跌停价（例：接近跌停时提醒）\n• volume_ratio_5m — 5分钟量比（例：量比超过3时提醒）\n• price_change_5m — 5分钟涨跌额（例：5分钟涨跌超过2元时提醒）\n\n你可以用这些指标重新描述你的需求。",
  "draft": null
}
```

#### Example 6: Volume ratio + incomplete info — Follow-up

**User:** "量比超过3的时候提醒我"

**Assistant:**

```json
{
  "textExplanation": "我可以帮你设置一个5分钟量比告警。不过我需要知道你想监控哪只股票？请提供股票代码或名称。",
  "draft": null
}
```

#### Example 7: Template activation — Preset text

**User:** "当 {symbol} 价格突破 {value} 时提醒我" (from template "price-breakout")

**Assistant:** Same as Example 1 but with template-filled values.

---

## 3. Symbol Resolution Strategy

### 3.1 Problem

Users may type stock names (贵州茅台), partial names (茅台), or codes (600519, SH600519). The parser needs to resolve these to a canonical symbol code.

### 3.2 V1 Approach: Prompt-Embedded Symbol Table

Include a concise symbol lookup table in the system prompt context. GLM-5 has strong Chinese language understanding and can resolve common A-share names to codes.

```
## 常见A股标的代码对照
贵州茅台:600519, 比亚迪:002594, 中芯国际:688981, 宁德时代:300750,
中国平安:601318, 工商银行:601398, 招商银行:600036, 腾讯:00700,
...
```

**Limitation:** This only covers a fixed set. For V1 (<10 beta users), this is acceptable. Unknown symbols should trigger a follow-up asking the user to provide the code.

### 3.3 Future (Phase 2): Server-Side Symbol Search

- Maintain a `symbols` table with name/code/alias
- Pre-resolve symbol before passing to AI parser
- Reduces prompt size and eliminates AI hallucination risk

---

## 4. GLM-5 Integration Plan

### 4.1 API Configuration

```ts
// ai/glm-provider.ts
interface GlmConfig {
  apiKey: string; // GLM_API_KEY env var
  apiUrl: string; // GLM_API_URL env var (e.g. https://open.bigmodel.cn/api/paas/v4/chat/completions)
  model: string; // "glm-5" or specific model version
  temperature: number; // 0.1 for structured output consistency
  maxTokens: number; // 2048 sufficient for alarm drafts
}
```

### 4.2 Request Flow

```
User message → chat/routes.ts
  → buildChatContext() (assembles system prompt + recent messages + draft)
  → AlarmParser.parse()
    → prompt-builder.ts (assembles final prompt with few-shot examples)
    → GLM-5 API call (streaming: true)
    → Parse SSE chunks → extract JSON draft + text explanation
  → stream.ts (emits SSE events to frontend)
```

### 4.3 Streaming Strategy

GLM-5 supports SSE streaming. The stream handler should:

1. Accumulate text explanation → emit as `block_delta` for a text block
2. Detect JSON output start (e.g., `"draft": {`) → emit `block_start` for UIBlock
3. Stream JSON key-value pairs → emit `block_patch` for progressive UIBlock updates
4. On JSON completion → emit `block_end`
5. Emit `message_end`

**V1 simplification:** Wait for the complete GLM-5 response, then emit all blocks at once. Streaming the UIBlock progressively is a UX enhancement that can be added later.

### 4.4 Error Handling

| Error                            | Handling                                                          |
| -------------------------------- | ----------------------------------------------------------------- |
| GLM-5 API timeout (>30s)         | Emit `error` SSE event with `CHAT_AI_TIMEOUT`                     |
| GLM-5 returns malformed JSON     | Re-parse with lenient extraction; fall back to text-only response |
| GLM-5 returns unsupported metric | This is valid — `draft: null` with explanation text               |
| GLM-5 rate limit                 | Queue retry with backoff; emit `error` if retries exhausted       |
| Symbol not resolved              | Return text asking user for code; `draft: null`                   |

---

## 5. Prompt Assembly Architecture

### 5.1 Context Budget Allocation

```
Total budget: ~4000 tokens (contextBudget in buildChatContext)
├── System prompt: ~800 tokens (fixed instructions + metric definitions)
├── Symbol table: ~400 tokens (50 common stocks)
├── Few-shot examples: ~1200 tokens (3 examples, selected by relevance)
├── Recent messages: ~1000 tokens (from context-policy)
└── Current draft: ~600 tokens (if editing existing alarm)
```

### 5.2 Few-Shot Selection

Select 2-3 examples most relevant to the current input:

- If user mentions price → include price examples
- If user mentions volume → include volume examples
- If user mentions percentage → include pct_change examples
- Default: 2 general examples + 1 unsupported metric example

**V1 simplification:** Include all 3-4 examples in every request. The token budget allows it, and relevance matching adds complexity.

---

## 6. Output Validation Pipeline

````
GLM-5 raw response (text)
  → Extract JSON between markers (e.g., ```json ... ```)
  → JSON.parse()
  → ParsedDraftSchema.safeParse()
    → Success: Return ParsedDraft
    → Failure: Log validation error, fall back to text-only response
````

### Validation Rules

1. `symbol` must be a valid format (6 digits for A-share, or 5 digits for HK)
2. `conditions` must have at least 1 condition, max 5
3. Each condition's `metric` must be from the supported set
4. Each condition's `value` must be a reasonable number (not NaN, not 0 for price)
5. `cooldownSeconds` must be within [0, 86400]

---

## 7. Risks & Mitigations

| Risk                                                         | Likelihood              | Impact | Mitigation                                          |
| ------------------------------------------------------------ | ----------------------- | ------ | --------------------------------------------------- |
| GLM-5 hallucinates stock codes                               | Medium                  | High   | Validate against symbol table; reject unknown codes |
| GLM-5 outputs inconsistent JSON structure                    | Medium                  | Medium | Robust Zod validation + text-only fallback          |
| Chinese NLP ambiguity ("跌破" = break below or break above?) | Low                     | Medium | Few-shot examples cover common patterns             |
| Symbol not in prompt table                                   | High for obscure stocks | Low    | Ask user for code; V1 scope is limited beta         |
| Prompt too long for context window                           | Low                     | Medium | Context budget enforcement in buildChatContext      |
| GLM-5 latency exceeds NFR3 (<2s first token)                 | Low                     | High   | Monitor; consider prompt caching or smaller model   |

---

## 8. Implementation Order (within Story 2.3)

1. Create `ai/parser-interface.ts` — abstract interface definition
2. Create `ai/schemas.ts` — ParsedDraft Zod schema
3. Create `ai/prompt-builder.ts` — system prompt + few-shot assembly
4. Create `ai/glm-provider.ts` — GLM-5 API integration
5. Wire `glm-provider` into `stream.ts` — replace mock echo with real AI call
6. Add output validation pipeline in provider
7. Add error handling for AI failures
8. Test with the 7 example scenarios from §2.2
