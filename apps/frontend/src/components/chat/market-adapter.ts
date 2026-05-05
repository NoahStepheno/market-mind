import type { ChatModelAdapter, ChatModelRunOptions } from "@assistant-ui/react";
import { sendMessage, streamSse } from "@/services/chat-api";
import { useChat } from "@/store/chat";

export const marketChatAdapter: ChatModelAdapter = {
  async *run(options: ChatModelRunOptions) {
    const sessionId = useChat.getState().currentSessionId;
    if (!sessionId) {
      yield {
        content: [{ type: "text", text: "请先创建一个聊天会话。" }],
      };
      return;
    }

    const userMsg = options.messages.filter((m) => m.role === "user").pop();
    const content =
      userMsg?.content
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n") ?? "";

    if (!content.trim()) {
      yield {
        content: [{ type: "text", text: "消息不能为空。" }],
      };
      return;
    }

    const { assistantMessageId } = await sendMessage(sessionId, content);

    let accumulated = "";
    for await (const evt of streamSse(sessionId, assistantMessageId, options.abortSignal)) {
      if (evt.event === "block_delta" && typeof evt.payload.data.delta === "string") {
        accumulated += evt.payload.data.delta;
        yield {
          content: [{ type: "text", text: accumulated }],
        };
      }
    }
  },
};
