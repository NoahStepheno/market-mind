import { useEffect, useMemo } from "react";
import { useLocalRuntime, type ThreadMessageLike } from "@assistant-ui/react";
import { ThreadPrimitive, ComposerPrimitive } from "@assistant-ui/react";
import { marketChatAdapter } from "@/components/chat/market-adapter";
import { useChat } from "@/store/chat";
import { SessionSelector } from "@/components/chat/session-selector";
import { toThreadMessages } from "@/lib/chat-message-mapper";

export function ChatPage() {
  const currentSessionId = useChat((s) => s.currentSessionId);
  const sessionsStatus = useChat((s) => s.sessionsStatus);
  const messagesStatus = useChat((s) => s.messagesStatus);
  const sessions = useChat((s) => s.sessions);
  const createAndSelectSession = useChat((s) => s.createAndSelectSession);
  const selectSession = useChat((s) => s.selectSession);
  const loadSessions = useChat((s) => s.loadSessions);
  const clearCurrentSession = useChat((s) => s.clearCurrentSession);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (sessionsStatus !== "success") return;

    if (currentSessionId && !sessions.some((s) => s.id === currentSessionId)) {
      clearCurrentSession();
      return;
    }

    if (currentSessionId) {
      void selectSession(currentSessionId);
    } else {
      void createAndSelectSession();
    }
  }, [
    sessionsStatus,
    currentSessionId,
    sessions,
    createAndSelectSession,
    selectSession,
    clearCurrentSession,
  ]);

  const error = sessionsStatus === "error" || (currentSessionId && messagesStatus === "error");
  const loading =
    sessionsStatus === "loading" || (currentSessionId && messagesStatus === "loading");

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] flex-col items-center justify-center gap-apple-sm bg-apple-parchment">
        <p className="text-apple-ink-muted-48 text-body">加载失败</p>
        <button
          type="button"
          onClick={() => {
            if (sessionsStatus === "error") void loadSessions();
            if (currentSessionId && messagesStatus === "error")
              void selectSession(currentSessionId);
          }}
          className="text-apple-primary text-body"
        >
          重试
        </button>
      </div>
    );
  }

  if (loading || !currentSessionId) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-apple-parchment">
        <p className="text-apple-ink-muted-48 text-caption">加载中…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-44px)] max-w-[768px] flex-col bg-apple-parchment px-apple-xl">
      <SessionSelector />
      <ChatThread key={currentSessionId} />
    </div>
  );
}

function ChatThread() {
  const messages = useChat((s) => s.messages);
  const initialMessages = useMemo(
    () => toThreadMessages(messages) as readonly ThreadMessageLike[],
    [messages],
  );
  useLocalRuntime(marketChatAdapter, { initialMessages });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-apple-md py-apple-sm">
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Empty />
          <ThreadPrimitive.Messages>
            {({ message }) => {
              const text = message.content
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("");

              if (message.role === "user") {
                return (
                  <div className="mb-apple-md flex justify-end">
                    <div className="max-w-[70%] rounded-apple-lg rounded-br-apple-xs bg-apple-primary px-apple-md py-apple-sm text-body text-apple-on-primary">
                      {text}
                    </div>
                  </div>
                );
              }

              if (!text) return null;
              return (
                <div className="mb-apple-md flex justify-start">
                  <div className="max-w-[70%] rounded-apple-lg rounded-bl-apple-xs bg-apple-canvas px-apple-md py-apple-sm text-body text-apple-ink">
                    {text}
                  </div>
                </div>
              );
            }}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Root>
      </div>

      <div className="border-t border-apple-hairline bg-apple-parchment px-apple-md py-apple-sm">
        <ComposerPrimitive.Root className="flex items-end gap-apple-xs">
          <ComposerPrimitive.Input
            placeholder="例如：茅台跌破1800时提醒我"
            className="h-11 flex-1 resize-none rounded-apple-pill border border-apple-hairline bg-apple-canvas px-apple-md py-apple-sm text-body text-apple-ink outline-none placeholder:text-apple-ink-muted-48 focus:border-apple-primary"
            rows={1}
          />
          <ComposerPrimitive.Send className="rounded-apple-pill bg-apple-primary px-apple-md py-[8px] text-button-primary text-apple-on-primary transition-transform active:scale-95 disabled:opacity-40">
            发送
          </ComposerPrimitive.Send>
          <ComposerPrimitive.Cancel className="rounded-apple-pill bg-apple-ink px-apple-md py-[8px] text-button-utility text-apple-body-on-dark transition-transform active:scale-95">
            停止
          </ComposerPrimitive.Cancel>
        </ComposerPrimitive.Root>
      </div>
    </>
  );
}
