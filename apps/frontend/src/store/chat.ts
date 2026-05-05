import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  listSessions,
  listMessages,
  createSession,
  type ChatSession,
  type ChatMessage,
} from "@/services/chat-api";

type ChatState = {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  sessionsStatus: "idle" | "loading" | "success" | "error";
  messagesStatus: "idle" | "loading" | "success" | "error";
  messagesCursor: string | null;
  hasMoreMessages: boolean;
};

type ChatActions = {
  loadSessions: () => Promise<void>;
  createAndSelectSession: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  loadMessages: (sessionId: string, cursor?: string) => Promise<void>;
  addLocalMessage: (msg: ChatMessage) => void;
  clearCurrentSession: () => void;
};

export type ChatStore = ChatState & ChatActions;

export const useChat = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      messages: [],
      sessionsStatus: "idle",
      messagesStatus: "idle",
      messagesCursor: null,
      hasMoreMessages: false,

      loadSessions: async () => {
        set({ sessionsStatus: "loading" });
        try {
          const { sessions } = await listSessions();
          set({ sessions, sessionsStatus: "success" });
        } catch {
          set({ sessionsStatus: "error" });
        }
      },

      createAndSelectSession: async () => {
        try {
          const { session } = await createSession();
          set((s) => ({
            sessions: [session, ...s.sessions],
            currentSessionId: session.id,
            messages: [],
            messagesCursor: null,
            hasMoreMessages: false,
          }));
        } catch {
          // caller handles error
        }
      },

      selectSession: async (id: string) => {
        set({ currentSessionId: id, messages: [], messagesCursor: null, hasMoreMessages: false });
        await get().loadMessages(id);
      },

      loadMessages: async (sessionId: string, cursor?: string) => {
        set({ messagesStatus: "loading" });
        try {
          const { messages, nextCursor } = await listMessages(sessionId, 50, cursor);
          set((s) => ({
            messages: cursor ? [...messages, ...s.messages] : messages,
            messagesCursor: nextCursor ?? null,
            hasMoreMessages: !!nextCursor,
            messagesStatus: "success",
          }));
        } catch {
          set({ messagesStatus: "error" });
        }
      },

      addLocalMessage: (msg: ChatMessage) => {
        set((s) => ({ messages: [...s.messages, msg] }));
      },

      clearCurrentSession: () => {
        set({ currentSessionId: null, messages: [], messagesCursor: null, hasMoreMessages: false });
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ currentSessionId: state.currentSessionId }),
    },
  ),
);
