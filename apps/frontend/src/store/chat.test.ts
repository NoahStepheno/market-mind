import { describe, expect, test, vi, beforeEach } from "vite-plus/test";
import { useChat } from "./chat";
import type { ChatSession, ChatMessage } from "@/services/chat-api";

const mockSessions: ChatSession[] = [
  {
    id: "s1",
    userId: "u1",
    title: "Session 1",
    createdAt: "2026-05-04T00:00:00Z",
    updatedAt: "2026-05-04T00:00:00Z",
  },
  {
    id: "s2",
    userId: "u1",
    title: null,
    createdAt: "2026-05-03T00:00:00Z",
    updatedAt: "2026-05-03T00:00:00Z",
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    sessionId: "s1",
    role: "user",
    status: "done",
    blocks: [{ type: "text", content: "hello" }],
    createdAt: "2026-05-04T00:00:00Z",
  },
  {
    id: "m2",
    sessionId: "s1",
    role: "assistant",
    status: "done",
    blocks: [{ type: "text", content: "hi" }],
    createdAt: "2026-05-04T00:01:00Z",
  },
];

vi.mock("@/services/chat-api", () => ({
  listSessions: vi.fn(),
  listMessages: vi.fn(),
  createSession: vi.fn(),
}));

import { listSessions, listMessages, createSession } from "@/services/chat-api";

beforeEach(() => {
  vi.clearAllMocks();
  useChat.setState({
    sessions: [],
    currentSessionId: null,
    messages: [],
    sessionsStatus: "idle",
    messagesStatus: "idle",
    messagesCursor: null,
    hasMoreMessages: false,
  });
});

describe("chat store", () => {
  test("loadSessions populates sessions", async () => {
    vi.mocked(listSessions).mockResolvedValue({ sessions: mockSessions });
    await useChat.getState().loadSessions();
    const s = useChat.getState();
    expect(s.sessions).toEqual(mockSessions);
    expect(s.sessionsStatus).toBe("success");
  });

  test("loadSessions sets error on failure", async () => {
    vi.mocked(listSessions).mockRejectedValue(new Error("fail"));
    await useChat.getState().loadSessions();
    expect(useChat.getState().sessionsStatus).toBe("error");
  });

  test("selectSession loads messages", async () => {
    vi.mocked(listMessages).mockResolvedValue({ messages: mockMessages });
    useChat.setState({ sessions: mockSessions });

    await useChat.getState().selectSession("s1");
    const s = useChat.getState();
    expect(s.currentSessionId).toBe("s1");
    expect(s.messages).toEqual(mockMessages);
    expect(s.messagesStatus).toBe("success");
  });

  test("createAndSelectSession creates and selects", async () => {
    const newSession: ChatSession = {
      id: "s3",
      userId: "u1",
      title: null,
      createdAt: "2026-05-05T00:00:00Z",
      updatedAt: "2026-05-05T00:00:00Z",
    };
    vi.mocked(createSession).mockResolvedValue({ session: newSession });
    useChat.setState({ sessions: mockSessions });

    await useChat.getState().createAndSelectSession();
    const s = useChat.getState();
    expect(s.currentSessionId).toBe("s3");
    expect(s.sessions).toHaveLength(3);
    expect(s.sessions[0].id).toBe("s3");
    expect(s.messages).toEqual([]);
  });

  test("loadMessages pagination appends messages", async () => {
    const olderMessages: ChatMessage[] = [
      {
        id: "m0",
        sessionId: "s1",
        role: "user",
        status: "done",
        blocks: [{ type: "text", content: "old" }],
        createdAt: "2026-05-03T00:00:00Z",
      },
    ];
    vi.mocked(listMessages).mockResolvedValue({ messages: olderMessages, nextCursor: "cursor2" });
    useChat.setState({ messages: mockMessages });

    await useChat.getState().loadMessages("s1", "cursor1");
    const s = useChat.getState();
    expect(s.messages).toHaveLength(3);
    expect(s.messages[0].id).toBe("m0");
    expect(s.messagesCursor).toBe("cursor2");
    expect(s.hasMoreMessages).toBe(true);
  });

  test("clearCurrentSession resets session state", () => {
    useChat.setState({
      currentSessionId: "s1",
      messages: mockMessages,
      messagesCursor: "c1",
      hasMoreMessages: true,
    });
    useChat.getState().clearCurrentSession();
    const s = useChat.getState();
    expect(s.currentSessionId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.messagesCursor).toBeNull();
    expect(s.hasMoreMessages).toBe(false);
  });

  test("addLocalMessage appends message", () => {
    const msg: ChatMessage = {
      id: "m3",
      sessionId: "s1",
      role: "user",
      status: "done",
      blocks: [{ type: "text", content: "new" }],
      createdAt: "2026-05-05T00:00:00Z",
    };
    useChat.setState({ messages: mockMessages });
    useChat.getState().addLocalMessage(msg);
    expect(useChat.getState().messages).toHaveLength(3);
    expect(useChat.getState().messages[2].id).toBe("m3");
  });
});
