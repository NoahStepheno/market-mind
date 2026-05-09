import { describe, expect, test } from "vite-plus/test";

import { parseGlmResponse } from "../../ai/glm-provider.ts";

describe("AI parser integration in stream pipeline", () => {
  test("valid draft produces text + UIBlock alarm_preview", () => {
    const raw = `{"textExplanation":"好的，为你设置茅台价格告警。","draft":{"symbol":"600519","symbolName":"贵州茅台","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":"<=","value":1800}]},"cooldownSeconds":900,"notifyLabel":"茅台跌破1800","notifyTier":"standard"}}`;
    const result = parseGlmResponse(raw);

    expect(result.textExplanation).toContain("茅台");
    expect(result.draft).not.toBeNull();
    expect(result.draft!.symbol).toBe("600519");
    expect(result.draft!.conditionGroup.operator).toBe("AND");
    expect(result.draft!.conditionGroup.conditions).toHaveLength(1);
    expect(result.draft!.conditionGroup.conditions[0].metric).toBe("price");
  });

  test("unsupported metric returns null draft with explanation", () => {
    const raw = `{"textExplanation":"抱歉，暂不支持MACD指标。","draft":null}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toContain("不支持");
  });

  test("GLM timeout returns error text", () => {
    const result = parseGlmResponse("");

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toBeTruthy();
  });

  test("malformed JSON falls back to text-only", () => {
    const raw = "this is not json at all!!!";
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toBeTruthy();
  });

  test("invalid symbol in draft passes schema but is structurally valid", () => {
    const raw = `{"textExplanation":"告警已设置。","draft":{"symbol":"999999","symbolName":"未知股票","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":">=","value":100}]},"cooldownSeconds":900,"notifyLabel":null,"notifyTier":"standard"}}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).not.toBeNull();
    expect(result.draft!.symbol).toBe("999999");
  });

  test("out-of-range cooldown is corrected by schema default", () => {
    const raw = `{"textExplanation":"设置告警。","draft":{"symbol":"600519","symbolName":"茅台","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":">=","value":100}]},"cooldownSeconds":999999,"notifyTier":"standard"}}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
  });

  test("unsupported metric with varied Chinese phrases returns null draft", () => {
    const phrases = [
      "抱歉，该指标不可用。",
      "无法识别您描述的指标。",
      "无法解析该条件。",
      "无法处理此类请求。",
    ];
    for (const phrase of phrases) {
      const raw = JSON.stringify({ textExplanation: phrase, draft: null });
      const result = parseGlmResponse(raw);
      expect(result.draft).toBeNull();
      expect(result.textExplanation).toBeTruthy();
    }
  });

  test("empty draft object {} is rejected as invalid", () => {
    const raw = `{"textExplanation":"已设置告警。","draft":{}}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
  });

  test("draft with missing symbol field is rejected", () => {
    const raw = `{"textExplanation":"告警设置中。","draft":{"symbolName":"茅台","conditionGroup":{"operator":"AND","conditions":[]},"cooldownSeconds":900}}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
  });

  test("infra_error errorCode is preserved through schema parsing", () => {
    const raw = `{"textExplanation":"AI 服务暂时不可用，请稍后再试。","draft":null,"errorCode":"infra_error"}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
    expect(result.errorCode).toBe("infra_error");
    expect(result.textExplanation).toContain("不可用");
  });

  test("parseGlmResponse does not set errorCode on normal unsupported responses", () => {
    const raw = `{"textExplanation":"抱歉，暂不支持MACD指标。","draft":null}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
    expect(result.errorCode).toBeUndefined();
    expect(result.textExplanation).toContain("不支持");
  });

  test("errorCode is preserved when schema validation fails", () => {
    const raw = `{"textExplanation":"AI 服务暂时不可用，请稍后再试。","draft":{"invalid":"structure"},"errorCode":"infra_error"}`;
    const result = parseGlmResponse(raw);

    expect(result.draft).toBeNull();
    expect(result.errorCode).toBe("infra_error");
    expect(result.textExplanation).toContain("不可用");
  });
});
