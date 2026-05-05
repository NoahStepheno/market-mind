import { useState, useRef, useEffect } from "react";
import { useChat } from "@/store/chat";

export function SessionSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sessions = useChat((s) => s.sessions);
  const currentSessionId = useChat((s) => s.currentSessionId);
  const selectSession = useChat((s) => s.selectSession);
  const createAndSelectSession = useChat((s) => s.createAndSelectSession);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = sessions.find((s) => s.id === currentSessionId);
  const label = current?.title ?? "新对话";

  return (
    <div ref={ref} className="relative border-b border-apple-hairline px-apple-sm py-apple-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-apple-xs rounded-apple-md bg-apple-canvas px-apple-sm py-apple-xs text-body text-apple-ink transition-colors hover:bg-apple-canvas/80"
      >
        <span className="flex-1 truncate text-left">{label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-apple-ink-muted-48 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-apple-sm right-apple-sm top-full z-10 mt-apple-xs max-h-64 overflow-y-auto rounded-apple-md border border-apple-hairline bg-apple-canvas shadow-lg"
        >
          {sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            const title =
              session.title ??
              `会话 · ${new Date(session.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`;
            return (
              <button
                key={session.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  if (session.id !== currentSessionId) {
                    void selectSession(session.id);
                  }
                  setOpen(false);
                }}
                className={`flex w-full items-center px-apple-md py-apple-sm text-left text-body transition-colors hover:bg-apple-parchment ${isActive ? "bg-apple-primary text-apple-on-primary" : "text-apple-ink"}`}
              >
                <span className="truncate">{title}</span>
              </button>
            );
          })}
          <div className="border-t border-apple-hairline">
            <button
              type="button"
              onClick={() => {
                void createAndSelectSession();
                setOpen(false);
              }}
              className="flex w-full items-center justify-center px-apple-md py-apple-sm text-body text-apple-primary transition-colors hover:bg-apple-parchment"
            >
              新建会话
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
