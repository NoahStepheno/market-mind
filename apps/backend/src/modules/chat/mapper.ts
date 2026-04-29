import type { ChatMessageRow } from "../../entities/chat_messages.ts";
import type { Block, MessageDto } from "./types.ts";

export function toMessageDto(row: ChatMessageRow): MessageDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    status: row.status,
    blocks: (row.blocks as Block[]) ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}
