import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ChatMessage } from "@/services/chat-api";

export function toThreadMessages(messages: ChatMessage[]): ThreadMessageLike[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.blocks
      .filter((b): b is { type: "text"; content: string } => b.type === "text")
      .map((b) => ({ type: "text" as const, text: b.content })),
    createdAt: new Date(msg.createdAt),
  }));
}
