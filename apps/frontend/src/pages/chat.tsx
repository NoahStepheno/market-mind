import { useEffect, useState } from "react";
import { useLocalRuntime, type ThreadMessage } from "@assistant-ui/react";
import { ThreadPrimitive, ComposerPrimitive } from "@assistant-ui/react";
import { marketChatAdapter, setActiveSession } from "@/components/chat/market-adapter";
import { createSession } from "@/services/chat-api";

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { session } = await createSession();
        if (!cancelled) {
          setSessionId(session.id);
          setActiveSession(session.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setActiveSession(null);
    };
  }, []);

  if (loading || !sessionId) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] items-center justify-center">
        <p className="text-apple-ink-muted-48 text-caption">加载中…</p>
      </div>
    );
  }

  return <ChatThread />;
}

function ChatThread() {
  useLocalRuntime(marketChatAdapter);

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col">
      <div className="flex-1 overflow-y-auto px-apple-md py-apple-sm">
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Empty>
            <div className="flex h-full items-center justify-center">
              <p className="text-apple-ink-muted-48 text-body">
                描述你想关注的股票条件，我来帮你设置提醒。
              </p>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages>
            {({ message }) => {
              const text = message.content
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("");

              if (message.role === "user") {
                return (
                  <div className="mb-apple-sm flex justify-end">
                    <div className="max-w-[70%] rounded-apple-lg rounded-br-apple-xs bg-apple-primary px-apple-md py-apple-sm text-body text-apple-on-primary">
                      {text}
                    </div>
                  </div>
                );
              }

              if (!text) return null;
              return (
                <div className="mb-apple-sm flex justify-start">
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
            className="flex-1 resize-none rounded-apple-lg border border-apple-hairline bg-apple-canvas px-apple-md py-apple-sm text-body text-apple-ink outline-none placeholder:text-apple-ink-muted-48 focus:border-apple-primary"
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
    </div>
  );
}
