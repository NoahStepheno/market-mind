type Counters = {
  alarm_eval_latency_ms_sum: number;
  alarm_eval_latency_ms_count: number;
  alarms_loaded_per_symbol_sum: number;
  alarms_loaded_per_symbol_count: number;
  triggers_enqueued_total: number;
  notify_worker_lag_ms_sum: number;
  notify_worker_lag_ms_count: number;
  dedupe_conflicts_total: number;
  ingest_rejected_backpressure: number;
};

const counters: Counters = {
  alarm_eval_latency_ms_sum: 0,
  alarm_eval_latency_ms_count: 0,
  alarms_loaded_per_symbol_sum: 0,
  alarms_loaded_per_symbol_count: 0,
  triggers_enqueued_total: 0,
  notify_worker_lag_ms_sum: 0,
  notify_worker_lag_ms_count: 0,
  dedupe_conflicts_total: 0,
  ingest_rejected_backpressure: 0,
};

export const alarmMetrics = {
  recordEvalLatencyMs(ms: number) {
    counters.alarm_eval_latency_ms_sum += ms;
    counters.alarm_eval_latency_ms_count += 1;
  },
  recordAlarmsLoaded(n: number) {
    counters.alarms_loaded_per_symbol_sum += n;
    counters.alarms_loaded_per_symbol_count += 1;
  },
  recordTriggerEnqueued() {
    counters.triggers_enqueued_total += 1;
  },
  recordNotifyLagMs(ms: number) {
    counters.notify_worker_lag_ms_sum += ms;
    counters.notify_worker_lag_ms_count += 1;
  },
  recordDedupeConflict() {
    counters.dedupe_conflicts_total += 1;
  },
  recordIngestBackpressure() {
    counters.ingest_rejected_backpressure += 1;
  },
  snapshot(): Counters {
    return { ...counters };
  },
};
