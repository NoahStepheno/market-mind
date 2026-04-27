import { getLogger } from "../../common/logging/logger.ts";
import { AsyncBoundedQueue } from "./async-queue.ts";
import { evaluateMarketEventForSymbol } from "./evaluator.ts";
import type { MarketSnapshot } from "./evaluate.ts";
import { createNotifyWorker } from "./notify-worker.ts";
import type { NotifyTask } from "./notify-queue.ts";
import { createOutboxRelay } from "./outbox-relay.ts";
import { PerSymbolSerialDispatcher } from "./symbol-dispatch.ts";

const logger = getLogger({ module: "alarm_pipeline" });

export type MarketIngestEvent = {
  symbol: string;
  occurredAt: Date;
  snapshot: MarketSnapshot;
  traceId?: string;
};

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) {
    return fallback;
  }
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function startAlarmRealtimePipeline() {
  const ingestMax = envInt("ALARM_INGEST_QUEUE_MAX", 10_000);
  const notifyMax = envInt("ALARM_NOTIFY_QUEUE_MAX", 1000);

  const evalQueue = new AsyncBoundedQueue<MarketIngestEvent>(ingestMax);
  const notifyQueue = new AsyncBoundedQueue<NotifyTask>(notifyMax);
  const symbolDispatcher = new PerSymbolSerialDispatcher();
  const relay = createOutboxRelay(notifyQueue);
  const notifyWorker = createNotifyWorker(notifyQueue);

  let evalStopped = false;

  async function evalLoop() {
    while (!evalStopped) {
      const ev = await evalQueue.dequeue();
      await symbolDispatcher.run(ev.symbol, () =>
        evaluateMarketEventForSymbol({
          symbol: ev.symbol,
          occurredAt: ev.occurredAt,
          snapshot: ev.snapshot,
          traceId: ev.traceId,
        }),
      );
    }
  }

  void evalLoop();
  relay.start(250);
  notifyWorker.start();

  logger.info({ ingestMax, notifyMax }, "alarm_realtime_pipeline_started");

  const handle = {
    evalQueue,
    metricsSnapshot() {
      return { ingestDepth: evalQueue.depth, notifyDepth: notifyQueue.depth };
    },
    stop() {
      evalStopped = true;
      relay.stop();
      notifyWorker.stop();
    },
  };
  return handle;
}

export type AlarmPipelineHandle = ReturnType<typeof startAlarmRealtimePipeline>;
