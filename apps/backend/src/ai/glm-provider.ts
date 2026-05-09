import { getLogger } from "../common/logging/logger.ts";
import { buildPrompt } from "./prompt-builder.ts";
import type { AlarmParser, ParserInput, ParserOutput } from "./parser-interface.ts";
import { ParserOutputSchema } from "./schemas.ts";

const logger = getLogger({ module: "ai-glm-provider" });

export interface GlmConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

function getGlmConfig(): GlmConfig {
  return {
    apiKey: process.env.GLM_API_KEY ?? "",
    apiUrl: process.env.GLM_API_URL ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: process.env.GLM_MODEL ?? "glm-5-plus",
    temperature: 0.1,
    maxTokens: 2048,
    timeoutMs: 30_000,
  };
}

function extractJsonFromResponse(text: string): string | null {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1]!.trim();

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return null;
}

export function parseGlmResponse(raw: string): ParserOutput {
  const jsonStr = extractJsonFromResponse(raw);
  if (!jsonStr) {
    return {
      textExplanation: raw.trim() || "AI 响应格式异常，请重试。",
      draft: null,
    };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const result = ParserOutputSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ err: result.error, jsonStr }, "glm_response_schema_validation_failed");
      return {
        textExplanation:
          typeof parsed.textExplanation === "string"
            ? parsed.textExplanation
            : "AI 响应格式异常，请重试。",
        draft: null,
        ...(typeof parsed.errorCode === "string" ? { errorCode: parsed.errorCode } : {}),
      };
    }
    return result.data as ParserOutput;
  } catch {
    logger.warn({ jsonStr }, "glm_response_json_parse_failed");
    return {
      textExplanation: raw.trim() || "AI 响应解析失败，请重试。",
      draft: null,
    };
  }
}

export class GlmProvider implements AlarmParser {
  private config: GlmConfig;

  constructor(config?: Partial<GlmConfig>) {
    this.config = { ...getGlmConfig(), ...config };
  }

  async parse(input: ParserInput): Promise<ParserOutput> {
    if (!this.config.apiKey) {
      logger.error("GLM_API_KEY not configured");
      return {
        textExplanation: "AI 服务未配置，请联系管理员。",
        draft: null,
        errorCode: "infra_error",
      };
    }

    const messages = buildPrompt({
      userMessage: input.userMessage,
      recentMessages: input.recentMessages,
    });

    const body = {
      model: this.config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        if (res.status === 429) {
          logger.warn({ status: res.status }, "glm_rate_limited");
          return {
            textExplanation: "AI 服务繁忙，请稍后再试。",
            draft: null,
            errorCode: "infra_error",
          };
        }
        logger.error({ status: res.status, errorText }, "glm_api_error");
        return {
          textExplanation: "AI 服务暂时不可用，请稍后再试。",
          draft: null,
          errorCode: "infra_error",
        };
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        return {
          textExplanation: "AI 未返回有效响应，请重试。",
          draft: null,
          errorCode: "infra_error",
        };
      }

      return parseGlmResponse(content);
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === "AbortError") {
        logger.error({ timeoutMs: this.config.timeoutMs }, "glm_request_timeout");
        return {
          textExplanation: "AI 服务响应超时，请稍后再试。",
          draft: null,
          errorCode: "infra_error",
        };
      }
      logger.error({ err }, "glm_request_failed");
      return {
        textExplanation: "AI 服务出现异常，请稍后再试。",
        draft: null,
        errorCode: "infra_error",
      };
    }
  }
}
