type Counters = {
  chat_message_create_total: number;
  chat_stream_start_total: number;
  chat_stream_error_total: number;
  chat_stream_duration_ms_sum: number;
  chat_stream_duration_ms_count: number;
  chat_context_truncated_total: number;
  chat_assistant_blocks_size_bytes: number;
};

const counters: Counters = {
  chat_message_create_total: 0,
  chat_stream_start_total: 0,
  chat_stream_error_total: 0,
  chat_stream_duration_ms_sum: 0,
  chat_stream_duration_ms_count: 0,
  chat_context_truncated_total: 0,
  chat_assistant_blocks_size_bytes: 0,
};

export const chatMetrics = {
  recordMessageCreate() {
    counters.chat_message_create_total += 1;
  },
  recordStreamStart() {
    counters.chat_stream_start_total += 1;
  },
  recordStreamError() {
    counters.chat_stream_error_total += 1;
  },
  recordStreamDuration(ms: number) {
    counters.chat_stream_duration_ms_sum += ms;
    counters.chat_stream_duration_ms_count += 1;
  },
  recordContextTruncated() {
    counters.chat_context_truncated_total += 1;
  },
  recordAssistantBlocksSize(bytes: number) {
    counters.chat_assistant_blocks_size_bytes += bytes;
  },
  snapshot(): Counters {
    return { ...counters };
  },
};
