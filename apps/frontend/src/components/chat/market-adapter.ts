import type { ChatModelAdapter, ChatModelRunOptions } from "@assistant-ui/react";
import { sendMessage, streamSse } from "@/services/chat-api";
import { useChat } from "@/store/chat";
import { formatUnsupportedResponse } from "../../lib/chat-text-formatter";

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

    let assistantMessageId: string;
    try {
      const result = await sendMessage(sessionId, content);
      assistantMessageId = result.assistantMessageId;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      yield {
        content: [{ type: "text", text: "消息发送失败，请检查网络后重试。" }],
      };
      return;
    }

    useChat.getState().addLocalMessage({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      role: "user",
      status: "done",
      blocks: [{ type: "text", content: content }],
      createdAt: new Date().toISOString(),
    });

    let accumulated = "";
    try {
      for await (const evt of streamSse(sessionId, assistantMessageId, options.abortSignal)) {
        if (evt.event === "block_delta" && typeof evt.payload.data.delta === "string") {
          accumulated += evt.payload.data.delta;
          yield {
            content: [{ type: "text", text: accumulated }],
          };
        }

        if (evt.event === "block_patch") {
          if (evt.payload.data.draft) {
            const draft = evt.payload.data.draft as Record<string, unknown>;
            const summary = `[告警草稿] ${String(draft.symbolName ?? draft.symbol ?? "")} - ${JSON.stringify(draft.conditionGroup ?? {})}`;
            accumulated += "\n\n" + summary;
            yield {
              content: [{ type: "text", text: accumulated }],
            };
          } else if (
            typeof evt.payload.data.explanation === "string" &&
            evt.payload.data.explanation
          ) {
            let explanation = formatUnsupportedResponse(
              evt.payload.data.explanation,
              evt.payload.data.metrics,
              evt.payload.data.templates,
            );
            accumulated = accumulated ? accumulated + "\n\n" + explanation : explanation;
            yield {
              content: [{ type: "text", text: accumulated }],
            };
          }
        }

        if (evt.event === "error") {
          const message =
            typeof evt.payload.data.message === "string"
              ? evt.payload.data.message
              : "连接中断，正在重新连接...";
          accumulated += "\n\n⚠️ " + message;
          yield {
            content: [{ type: "text", text: accumulated }],
          };
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const fallback = "AI 响应中断，请重新发送消息。";
      accumulated = accumulated ? accumulated + "\n\n⚠️ " + fallback : fallback;
      yield {
        content: [{ type: "text", text: accumulated }],
      };
    }
  },
};
