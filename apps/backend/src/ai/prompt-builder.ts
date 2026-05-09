import type { ContextMessage } from "./parser-interface.ts";

const SYSTEM_PROMPT = `你是 Market 告警助手，帮助用户将自然语言描述转化为结构化的股票告警条件。

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
4. 始终使用 JSON 格式输出草稿，文本说明用中文。`;

const SYMBOL_TABLE = `## 常见A股标的代码对照
贵州茅台:600519, 比亚迪:002594, 中芯国际:688981, 宁德时代:300750,
中国平安:601318, 工商银行:601398, 招商银行:600036, 中科曙光:603019,
翠微股份:603123, 大唐电信:600198, 隆基绿能:601012, 药明康德:603259,
紫金矿业:601899, 长江电力:600900, 中国中免:601888, 海天味业:603288`;

const FEW_SHOT_EXAMPLES = [
  {
    role: "user" as const,
    content: "当茅台跌破1800时提醒我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"好的，我将为你设置一个贵州茅台的价格告警：当股价跌破1800元时触发提醒。","draft":{"symbol":"600519","symbolName":"贵州茅台","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":"<=","value":1800}]},"cooldownSeconds":900,"notifyLabel":"茅台跌破1800","notifyTier":"standard"}}`,
  },
  {
    role: "user" as const,
    content: "比亚迪放量突破250，成交量超过10万手的时候通知我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"为你设置比亚迪的双重条件告警：价格突破250元且成交量超过10万手时触发。","draft":{"symbol":"002594","symbolName":"比亚迪","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":">=","value":250},{"metric":"volume","operator":">=","value":100000}]},"cooldownSeconds":900,"notifyLabel":"比亚迪放量突破250","notifyTier":"emphasis"}}`,
  },
  {
    role: "user" as const,
    content: "中芯国际涨到120或者跌到80的时候提醒我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"为你设置中芯国际的价格区间告警：涨到120元或跌到80元时都会触发。","draft":{"symbol":"688981","symbolName":"中芯国际","conditionGroup":{"operator":"OR","conditions":[{"metric":"price","operator":">=","value":120},{"metric":"price","operator":"<=","value":80}]},"cooldownSeconds":900,"notifyLabel":null,"notifyTier":"standard"}}`,
  },
  {
    role: "user" as const,
    content: "当大盘的情绪指数超过80的时候提醒我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"抱歉，目前暂不支持「情绪指数」这个指标。以下是当前支持的所有指标：\\n\\n• price — 当前价格（例：股价跌破1800时提醒）\\n• pct_change — 涨跌幅（例：涨跌幅超过5%时提醒）\\n• volume — 成交量（例：成交量超过10万手时提醒）\\n• turnover — 成交额（例：成交额超过50亿时提醒）\\n• limit_up — 涨停价（例：接近涨停时提醒）\\n• limit_down — 跌停价（例：接近跌停时提醒）\\n• volume_ratio_5m — 5分钟量比（例：量比超过3时提醒）\\n• price_change_5m — 5分钟涨跌额（例：5分钟涨跌超过2元时提醒）\\n\\n你可以用这些指标重新描述你的需求。","draft":null}`,
  },
  {
    role: "user" as const,
    content: "工商银行涨跌幅超过3%的时候提醒我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"好的，为你设置工商银行的涨跌幅告警：涨跌幅超过3%时触发提醒。","draft":{"symbol":"601398","symbolName":"工商银行","conditionGroup":{"operator":"AND","conditions":[{"metric":"pct_change","operator":">=","value":3}]},"cooldownSeconds":900,"notifyLabel":"工行涨跌幅超3%","notifyTier":"standard"}}`,
  },
  {
    role: "user" as const,
    content: "帮我盯一下那只新能源的股票",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"好的，你想设置新能源相关股票的告警。不过「新能源」涉及多只股票，能否告诉我具体的股票名称或代码？例如：宁德时代（300750）、隆基绿能（601012）等。","draft":null}`,
  },
  {
    role: "user" as const,
    content: "用快速提醒模式，当招商银行5分钟涨跌超过2元的时候通知我",
  },
  {
    role: "assistant" as const,
    content: `{"textExplanation":"好的，为你设置招商银行的5分钟涨跌额告警：5分钟涨跌超过2元时以强调模式触发提醒。","draft":{"symbol":"600036","symbolName":"招商银行","conditionGroup":{"operator":"OR","conditions":[{"metric":"price_change_5m","operator":">=","value":2},{"metric":"price_change_5m","operator":"<=","value":-2}]},"cooldownSeconds":300,"notifyLabel":"招行5分钟涨跌超2元","notifyTier":"emphasis"}}`,
  },
];

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildPrompt(input: {
  userMessage: string;
  recentMessages?: ContextMessage[];
}): PromptMessage[] {
  const systemContent = [SYSTEM_PROMPT, SYMBOL_TABLE].join("\n\n");

  const messages: PromptMessage[] = [{ role: "system", content: systemContent }];

  for (const example of FEW_SHOT_EXAMPLES) {
    messages.push(example);
  }

  if (input.recentMessages && input.recentMessages.length > 0) {
    for (const msg of input.recentMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: input.userMessage });

  return messages;
}
