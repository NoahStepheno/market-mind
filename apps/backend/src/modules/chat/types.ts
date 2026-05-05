export type TextBlock = {
  type: "text";
  content: string;
};

export type UIBlock = {
  type: "ui";
  component: "alarm_preview" | "alarm_editor";
  props: Record<string, unknown>;
};

export type ToolCallBlock = {
  type: "tool_call";
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResultBlock = {
  type: "tool_result";
  name: string;
  result: unknown;
};

export type Block = TextBlock | UIBlock | ToolCallBlock | ToolResultBlock;

export type MessageDto = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  status: "streaming" | "done";
  blocks: Block[];
  createdAt: string;
};

export type SseEventName =
  | "message_start"
  | "block_start"
  | "block_delta"
  | "block_end"
  | "block_patch"
  | "message_end"
  | "error";

export type SseEvent = {
  requestId: string;
  sessionId: string;
  messageId: string;
  ts: string;
  data: Record<string, unknown>;
};
