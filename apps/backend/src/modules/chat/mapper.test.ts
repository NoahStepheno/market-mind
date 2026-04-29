import { describe, expect, test } from "vite-plus/test";

import { toMessageDto } from "./mapper.ts";

describe("toMessageDto", () => {
  test("maps db row into api message dto", () => {
    const createdAt = new Date();
    const dto = toMessageDto({
      id: "m1",
      sessionId: "s1",
      userId: "u1",
      role: "assistant",
      status: "done",
      blocks: [{ type: "text", content: "ok" }],
      textSearch: null,
      createdAt,
    });

    expect(dto.id).toBe("m1");
    expect(dto.sessionId).toBe("s1");
    expect(dto.createdAt).toBe(createdAt.toISOString());
    expect(dto.blocks).toHaveLength(1);
  });
});
