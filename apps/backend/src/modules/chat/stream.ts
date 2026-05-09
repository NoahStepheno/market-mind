import { streamSSE } from "hono/streaming";

import { PRESET_TEMPLATES, SUPPORTED_METRICS } from "@market/utils";
import { GlmProvider } from "../../ai/glm-provider.ts";
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

function getGlmProvider(): GlmProvider {
  return new GlmProvider();
}

function buildUnsupportedData(textContent: string) {
  return {
    explanation: textContent,
    metrics: SUPPORTED_METRICS.map((m) => ({ value: m.value, label: m.label })),
    templates: PRESET_TEMPLATES.map((t) => ({
      id: t.id,
      title: t.title,
      icon: t.icon,
      description: t.description,
      nlText: t.nlText,
    })),
  };
}

export async function streamAssistantMessage(input: {
  c: Parameters<typeof streamSSE>[0];
  userId: string;
  sessionId: string;
  messageId: string;
  requestId: string;
  userPrompt: string;
  recentMessages?: { role: "user" | "assistant"; content: string }[];
}) {
  chatMetrics.recordStreamStart();
  const startedAt = performance.now();
  return streamSSE(input.c, async (stream) => {
    let textBlockStarted = false;
    let textBlockClosed = false;
    let uiBlockStarted = false;
    let uiBlockClosed = false;
    let persistedOk = false;
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
            data: { code: "CHAT_STREAM_NOT_READY", message: "消息不可流式传输" },
          }),
        );
        return;
      }

      const parserResult = await getGlmProvider().parse({
        userMessage: input.userPrompt,
        sessionId: input.sessionId,
        recentMessages: input.recentMessages ?? [],
        contextBudget: 4000,
      });

      const textContent = parserResult.textExplanation ?? "";
      const hasValidDraft =
        parserResult.draft &&
        typeof parserResult.draft.symbol === "string" &&
        parserResult.draft.symbol.length > 0;
      const isUnsupported =
        parserResult.errorCode !== "infra_error" &&
        /不支持|不可用|无法识别|无法解析|无法处理/.test(textContent);

      const showAlarmPreview = !!hasValidDraft && !isUnsupported;
      const showUnsupportedResponse = isUnsupported;
      const shouldEmitTextBlock = textContent.length > 0 && !isUnsupported;

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

      if (shouldEmitTextBlock) {
        const textBlockId = "b1";
        await writeEvent(
          stream,
          "block_start",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: textBlockId, type: "text" },
          }),
        );
        textBlockStarted = true;

        const CHUNK_SIZE = 8;
        for (let i = 0; i < textContent.length; i += CHUNK_SIZE) {
          await writeEvent(
            stream,
            "block_delta",
            eventEnvelope({
              requestId: input.requestId,
              sessionId: input.sessionId,
              messageId: input.messageId,
              data: { blockId: textBlockId, delta: textContent.slice(i, i + CHUNK_SIZE) },
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
            data: { blockId: textBlockId },
          }),
        );
        textBlockClosed = true;
      }

      const blocks: Block[] = [];

      if (showAlarmPreview) {
        if (shouldEmitTextBlock) blocks.push({ type: "text", content: textContent });
        const uiBlockId = "b2";
        await writeEvent(
          stream,
          "block_start",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId, type: "ui", component: "alarm_preview" },
          }),
        );
        uiBlockStarted = true;
        await writeEvent(
          stream,
          "block_patch",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId, draft: parserResult.draft },
          }),
        );
        await writeEvent(
          stream,
          "block_end",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId },
          }),
        );
        uiBlockClosed = true;
        blocks.push({
          type: "ui",
          component: "alarm_preview",
          props: { draft: parserResult.draft },
        });
      } else if (showUnsupportedResponse) {
        const uiBlockId = "b2";
        const unsupportedData = buildUnsupportedData(textContent);
        await writeEvent(
          stream,
          "block_start",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId, type: "ui", component: "unsupported_response" },
          }),
        );
        uiBlockStarted = true;
        await writeEvent(
          stream,
          "block_patch",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId, ...unsupportedData },
          }),
        );
        await writeEvent(
          stream,
          "block_end",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { blockId: uiBlockId },
          }),
        );
        uiBlockClosed = true;
        blocks.push({
          type: "ui",
          component: "unsupported_response",
          props: unsupportedData,
        });
      } else {
        if (textContent.length > 0) blocks.push({ type: "text", content: textContent });
      }

      const updated = await updateAssistantMessageDone({
        userId: input.userId,
        sessionId: input.sessionId,
        messageId: input.messageId,
        blocks,
      });
      persistedOk = !!updated;
      if (!updated) {
        await writeEvent(
          stream,
          "error",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { code: "CHAT_MESSAGE_NOT_FOUND", message: "助手消息未找到" },
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

      if (!persistedOk) {
        try {
          await updateAssistantMessageDone({
            userId: input.userId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            blocks: [{ type: "text", content: "AI 处理出现异常，请稍后重试。" }],
          });
        } catch (dbErr) {
          logger.error({ err: dbErr, messageId: input.messageId }, "chat_stream_db_persist_failed");
        }
      }

      if (textBlockStarted && !textBlockClosed) {
        try {
          await writeEvent(
            stream,
            "block_end",
            eventEnvelope({
              requestId: input.requestId,
              sessionId: input.sessionId,
              messageId: input.messageId,
              data: { blockId: "b1" },
            }),
          );
        } catch {
          // best-effort block_end
        }
      }

      if (uiBlockStarted && !uiBlockClosed) {
        try {
          await writeEvent(
            stream,
            "block_end",
            eventEnvelope({
              requestId: input.requestId,
              sessionId: input.sessionId,
              messageId: input.messageId,
              data: { blockId: "b2" },
            }),
          );
        } catch {
          // best-effort block_end
        }
      }

      try {
        await writeEvent(
          stream,
          "error",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { code: "CHAT_STREAM_ERROR", message: "流式传输失败" },
          }),
        );
      } catch {
        // client may have disconnected
      }

      try {
        await writeEvent(
          stream,
          "message_end",
          eventEnvelope({
            requestId: input.requestId,
            sessionId: input.sessionId,
            messageId: input.messageId,
            data: { status: "error" },
          }),
        );
      } catch {
        // client may have disconnected
      }
    }
  });
}
