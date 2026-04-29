import { streamSSE } from "hono/streaming";

import { getLogger } from "../../common/logging/logger.ts";
import { chatMetrics } from "./metrics.ts";
import { getMessageForSession, updateAssistantMessageDone } from "./repo.ts";
import type { Block, SseEventName } from "./types.ts";

const logger = getLogger({ module: "chat-stream" });

function eventEnvelope(input: {
  requestId: string;
  sessionId: string;
  messageId: string;
  data: Record<string, unknown>;
}) {
  return {
    requestId: input.requestId,
    sessionId: input.sessionId,
    messageId: input.messageId,
    ts: new Date().toISOString(),
    data: input.data,
  };
}

async function writeEvent(
  stream: { writeSSE: (input: { event: SseEventName; data: string }) => Promise<void> },
  event: SseEventName,
  payload: ReturnType<typeof eventEnvelope>,
) {
  await stream.writeSSE({ event, data: JSON.stringify(payload) });
}

export async function streamAssistantMessage(input: {
  c: Parameters<typeof streamSSE>[0];
  userId: string;
  sessionId: string;
  messageId: string;
  requestId: string;
  userPrompt: string;
}) {
  chatMetrics.recordStreamStart();
  const startedAt = performance.now();
  return streamSSE(input.c, async (stream) => {
    try {
      const message = await getMessageForSession({
        userId: input.userId,
        sessionId: input.sessionId,
        messageId: input.messageId,
      });
      if (!message || message.status !== "streaming") {
        await writeEvent(
          stream,
          "error",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { code: "CHAT_STREAM_NOT_READY", message: "Message is not streamable" },
          }),
        );
        return;
      }

      const blockId = "b1";
      await writeEvent(
        stream,
        "message_start",
        eventEnvelope({
          requestId: input.requestId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          data: {},
        }),
      );
      await writeEvent(
        stream,
        "block_start",
        eventEnvelope({
          requestId: input.requestId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          data: { blockId, type: "text" },
        }),
      );
      const content = `我已经收到你的请求：${input.userPrompt}`;
      const chunks = [
        content.slice(0, Math.ceil(content.length / 2)),
        content.slice(Math.ceil(content.length / 2)),
      ];
      for (const delta of chunks) {
        await writeEvent(
          stream,
          "block_delta",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId, delta },
          }),
        );
      }
      await writeEvent(
        stream,
        "block_end",
        eventEnvelope({
          requestId: input.requestId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          data: { blockId },
        }),
      );

      const blocks: Block[] = [{ type: "text", content }];
      const updated = await updateAssistantMessageDone({
        userId: input.userId,
        sessionId: input.sessionId,
        messageId: input.messageId,
        blocks,
      });
      if (!updated) {
        await writeEvent(
          stream,
          "error",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { code: "CHAT_MESSAGE_NOT_FOUND", message: "Assistant message not found" },
          }),
        );
        return;
      }

      await writeEvent(
        stream,
        "message_end",
        eventEnvelope({
          requestId: input.requestId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          data: { status: "done" },
        }),
      );
      chatMetrics.recordAssistantBlocksSize(Buffer.byteLength(JSON.stringify(blocks), "utf8"));
      chatMetrics.recordStreamDuration(performance.now() - startedAt);
    } catch (error) {
      chatMetrics.recordStreamError();
      logger.error({ err: error, messageId: input.messageId }, "chat_stream_error");
      await writeEvent(
        stream,
        "error",
        eventEnvelope({
          requestId: input.requestId,
          sessionId: input.sessionId,
          messageId: input.messageId,
          data: { code: "CHAT_STREAM_ERROR", message: "Stream failed" },
        }),
      );
    }
  });
}
