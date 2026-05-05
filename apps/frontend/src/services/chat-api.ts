import { apiFetch } from "./api";
import { useAuth } from "@/store/auth";

export type ChatSession = {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "ui"; component: string; props: Record<string, unknown> }
  | { type: "tool_call"; name: string; arguments: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown };

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  status: "streaming" | "done";
  blocks: MessageBlock[];
  createdAt: string;
};

export type SsePayload = {
  requestId: string;
  sessionId: string;
  messageId: string;
  ts: string;
  data: Record<string, unknown>;
};

export type SseEvent = { event: string; payload: SsePayload };

export async function createSession(title?: string): Promise<{ session: ChatSession }> {
  return apiFetch("/api/v1/chat/sessions", {
    method: "POST",
    body: title ? { title } : {},
  });
}

export async function listSessions(limit = 20, cursor?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ sessions: ChatSession[]; nextCursor?: string }>(
    `/api/v1/chat/sessions?${params}`,
  );
}

export async function listMessages(sessionId: string, limit = 50, cursor?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<{ messages: ChatMessage[]; nextCursor?: string }>(
    `/api/v1/chat/sessions/${sessionId}/messages?${params}`,
  );
}

export async function sendMessage(
  sessionId: string,
  content: string,
): Promise<{ assistantMessageId: string; streamUrl: string }> {
  return apiFetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: { content },
  });
}

export async function* streamSse(
  sessionId: string,
  messageId: string,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const token = useAuth.getState().accessToken;

  const url = `${baseUrl}/api/v1/chat/sessions/${sessionId}/stream?messageId=${encodeURIComponent(messageId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`SSE connect failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const raw = line.slice(6);
        try {
          const payload: SsePayload = JSON.parse(raw);
          yield { event: currentEvent || "message", payload };
        } catch {
          // skip malformed data lines
        }
        currentEvent = "";
      } else if (line.trim() === "") {
        currentEvent = "";
      }
    }
  }
}
