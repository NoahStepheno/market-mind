import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ChatMessage } from "@/services/chat-api";
import { formatUnsupportedResponse } from "./chat-text-formatter";

export function toThreadMessages(messages: ChatMessage[]): ThreadMessageLike[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.blocks.flatMap((b) => {
      if (b.type === "text" && "content" in b && typeof b.content === "string") {
        return { type: "text" as const, text: b.content };
      }
      if (b.type === "ui" && "props" in b && b.props && typeof b.props === "object") {
        const props = b.props as Record<string, unknown>;
        const draft = props.draft as Record<string, unknown> | undefined;
        if (draft) {
          const name = typeof draft.symbolName === "string" ? draft.symbolName : "";
          const code = typeof draft.symbol === "string" ? draft.symbol : "";
          return {
            type: "text" as const,
            text: `[告警草稿] ${name || code} - ${JSON.stringify(draft.conditionGroup ?? {})}`,
          };
        }
        const explanation = props.explanation;
        if (typeof explanation === "string" && explanation) {
          const text = formatUnsupportedResponse(explanation, props.metrics, props.templates);
          return { type: "text" as const, text };
        }
      }
      return [];
    }),
    createdAt: new Date(msg.createdAt),
  }));
}
