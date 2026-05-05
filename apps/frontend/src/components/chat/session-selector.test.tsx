import { describe, expect, test, vi, beforeEach } from "vite-plus/test";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { SessionSelector } from "./session-selector";

type SessionShape = {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

let mockSessions: SessionShape[] = [];
let mockCurrentSessionId: string | null = null;
const mockSelectSession = vi.fn();
const mockCreateAndSelectSession = vi.fn();

vi.mock("@/store/chat", () => ({
  useChat: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      sessions: mockSessions,
      currentSessionId: mockCurrentSessionId,
      selectSession: mockSelectSession,
      createAndSelectSession: mockCreateAndSelectSession,
    }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSessions = [];
  mockCurrentSessionId = null;
});

describe("SessionSelector", () => {
  test("renders current session title", () => {
    mockSessions = [
      {
        id: "s1",
        userId: "u1",
        title: "Test Session",
        createdAt: "2026-05-04T00:00:00Z",
        updatedAt: "2026-05-04T00:00:00Z",
      },
    ];
    mockCurrentSessionId = "s1";

    const html = renderToString(<SessionSelector />);
    expect(html).toContain("Test Session");
  });

  test("renders 新对话 when no current session", () => {
    mockCurrentSessionId = null;

    const html = renderToString(<SessionSelector />);
    expect(html).toContain("新对话");
  });

  test("renders dropdown toggle button with chevron", () => {
    const html = renderToString(<SessionSelector />);
    expect(html).toContain("border-apple-hairline");
    expect(html).toContain("M19 9l-7 7-7-7");
  });

  test("renders session container with correct structure", () => {
    const html = renderToString(<SessionSelector />);
    expect(html).toContain("relative");
    expect(html).toContain("border-b");
  });
});
