import { describe, expect, test, vi } from "vite-plus/test";

import { GlmProvider, parseGlmResponse } from "./glm-provider.ts";
import type { ParserInput } from "./parser-interface.ts";

const mockInput: ParserInput = {
  userMessage: "茅台跌破1800时提醒我",
  sessionId: "s-1",
  recentMessages: [],
  contextBudget: 4000,
};

const validGlmResponse = `好的，为你设置茅台价格告警。

\`\`\`json
{"textExplanation":"好的，我将为你设置一个贵州茅台的价格告警：当股价跌破1800元时触发提醒。","draft":{"symbol":"600519","symbolName":"贵州茅台","conditionGroup":{"operator":"AND","conditions":[{"metric":"price","operator":"<=","value":1800}]},"cooldownSeconds":900,"notifyLabel":"茅台跌破1800","notifyTier":"standard"}}
\`\`\``;

const unsupportedMetricResponse = `{"textExplanation":"抱歉，目前暂不支持「MACD」这个指标。","draft":null}`;

const malformedResponse = `Here is something that is not valid JSON at all {{}}`;

describe("parseGlmResponse", () => {
  test("extracts valid draft from markdown code block", () => {
    const result = parseGlmResponse(validGlmResponse);
    expect(result.textExplanation).toContain("贵州茅台");
    expect(result.draft).not.toBeNull();
    expect(result.draft!.symbol).toBe("600519");
    expect(result.draft!.conditionGroup.conditions[0].metric).toBe("price");
  });

  test("handles unsupported metric response with null draft", () => {
    const result = parseGlmResponse(unsupportedMetricResponse);
    expect(result.textExplanation).toContain("不支持");
    expect(result.draft).toBeNull();
  });

  test("falls back to text-only on malformed response", () => {
    const result = parseGlmResponse(malformedResponse);
    expect(result.textExplanation).toBeTruthy();
    expect(result.draft).toBeNull();
  });
});

describe("GlmProvider", () => {
  test("returns parsed draft for valid GLM response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: validGlmResponse } }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({ apiKey: "test-key", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.draft).not.toBeNull();
    expect(result.draft!.symbol).toBe("600519");
    expect(mockFetch).toHaveBeenCalledOnce();

    vi.restoreAllMocks();
  });

  test("returns null draft with explanation for unsupported metric", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: unsupportedMetricResponse } }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({ apiKey: "test-key", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toContain("不支持");

    vi.restoreAllMocks();
  });

  test("returns error message when API key is missing", async () => {
    const provider = new GlmProvider({ apiKey: "", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toContain("未配置");
  });

  test("handles API rate limiting (429)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({ apiKey: "test-key", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.textExplanation).toContain("繁忙");
    expect(result.draft).toBeNull();

    vi.restoreAllMocks();
  });

  test("handles malformed JSON response gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: malformedResponse } }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({ apiKey: "test-key", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.draft).toBeNull();
    expect(result.textExplanation).toBeTruthy();

    vi.restoreAllMocks();
  });

  test("sets errorCode on server error (non-429)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve("service unavailable"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({ apiKey: "test-key", apiUrl: "http://test", model: "test" });
    const result = await provider.parse(mockInput);

    expect(result.draft).toBeNull();
    expect(result.errorCode).toBe("infra_error");
    expect(result.textExplanation).toContain("不可用");

    vi.restoreAllMocks();
  });

  test("sets errorCode on timeout", async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted.");
      (err as any).name = "AbortError";
      throw err;
    });
    vi.stubGlobal("fetch", mockFetch);

    const provider = new GlmProvider({
      apiKey: "test-key",
      apiUrl: "http://test",
      model: "test",
      timeoutMs: 10,
    });
    const result = await provider.parse(mockInput);

    expect(result.draft).toBeNull();
    expect(result.errorCode).toBe("infra_error");
    expect(result.textExplanation).toContain("超时");

    vi.restoreAllMocks();
  });
});
