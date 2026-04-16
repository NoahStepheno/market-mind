# MarketMind — repository architecture

This document is the **implementation blueprint** for [README.md](../README.md). Keep it in sync when product direction or the tool surface changes.

---

## Goals

- **On-demand advisory:** LLM + tools over structured A-share data (quotes, indicators, fundamentals, sentiment, macro, portfolio).
- **Prompt-defined alarms:** natural language → validated **AlarmSpec** → durable store → scheduler → evaluator (same tools as chat) → notifier.
- **Advisory only:** no order execution, no broker integration; triggers are informational.

---

## Directory layout (target)

```
market-mind/
├── .claude/
│   └── architecture.md          # this file
├── marketmind/                  # main Python package
│   ├── __init__.py
│   ├── agent/                   # LLM agent loop
│   │   ├── __init__.py
│   │   ├── loop.py              # conversation + tool-use loop
│   │   ├── prompts.py           # system prompts, templates
│   │   └── tools.py             # tool definitions for Claude API
│   ├── tools/                   # tool implementations (thin wrappers)
│   │   ├── __init__.py
│   │   ├── quotes.py            # get_quotes
│   │   ├── indicators.py        # get_indicators
│   │   ├── fundamentals.py    # get_fundamentals
│   │   ├── sentiment.py         # get_sentiment
│   │   ├── macro.py             # get_macro
│   │   └── portfolio.py         # get_portfolio
│   ├── alarms/                  # prompt-defined alarms
│   │   ├── __init__.py
│   │   ├── schema.py            # AlarmSpec (pydantic): symbols, conditions, schedule, cooldown, channel
│   │   ├── parser.py            # agent output → AlarmSpec (validate + normalize)
│   │   ├── store.py             # persist alarms (SQLite default)
│   │   ├── evaluator.py         # invoke tools, compare to spec → trigger | no-op
│   │   ├── scheduler.py         # due alarms, debounce, market-window awareness
│   │   └── notifier.py          # CLI / webhook / email
│   ├── data/                    # market data adapters
│   │   ├── __init__.py
│   │   ├── base.py              # DataSource protocol / ABC
│   │   ├── akshare_adapter.py
│   │   └── tushare_adapter.py   # optional
│   ├── models/                  # shared domain types
│   │   ├── __init__.py
│   │   ├── quote.py
│   │   ├── indicator.py
│   │   └── alarm.py             # AlarmSpec, AlarmTrigger, AlarmStatus
│   └── config.py                # env-driven settings
├── cli.py                       # CLI entry (typer / click)
├── main.py                      # bootstrap: agent, optional scheduler
├── requirements.txt
├── .env.example
├── tests/
│   ├── test_tools/
│   ├── test_alarms/
│   └── test_agent/
└── README.md
```

Planned agent-facing tools from the README (`create_alarm`, `evaluate_alarm`) live in **`alarms/`** and are exposed to the agent via **`agent/tools.py`** when implemented.

---

## Layer responsibilities

| Layer | Role | Constraint |
|--------|------|----------------|
| **CLI** | User I/O, alarm CRUD commands | No market logic; delegates to agent / alarms |
| **agent/** | Claude loop; tool routing; alarm intent → structured output | Stateless per turn; durable state in **store** |
| **tools/** | Call **data/** adapters; return structured, annotated payloads | No raw untyped blobs; prefer pydantic / typed dicts |
| **data/** | AKShare / Tushare / Wind behind one interface | Swappable via config |
| **alarms/** | Parse → persist → schedule → evaluate → notify | Evaluator **must** reuse **tools/** (same path as chat) |
| **models/** | Shared types | No I/O, no side effects |

---

## Alarm subsystem flow

```
User prompt
    → agent/loop.py (Claude + tool use)
    → alarms/parser.py (JSON → validated AlarmSpec)
    → alarms/store.py (persist)
    → alarms/scheduler.py (periodic: select due alarms, respect cooldown)
    → alarms/evaluator.py (tools/* → compare conditions)
    → alarms/notifier.py (if fired)
```

- **Scheduler:** in-process loop for MVP (`asyncio` or background thread); configurable poll interval; optional market-hours guard.
- **Cooldown / fire-once:** persisted on alarm record (`last_triggered_at`, `cooldown_seconds`, session flags as needed).
- **Rationale on trigger:** evaluator attaches latest tool snapshot summary (or agent-generated one-liner from a bounded follow-up) so notifications stay explainable.

---

## Data adapter interface (conceptual)

Implementations: `akshare_adapter.py`, `tushare_adapter.py`, optional Wind.

```python
# Conceptual — not yet in repo until scaffold lands.
class DataSource(ABC):
    def get_quotes(self, symbol: str, period: str) -> ...: ...
    def get_indicators(self, symbol: str, indicators: list[str]) -> ...: ...
    def get_fundamentals(self, symbol: str) -> ...: ...
    def get_sentiment(self, symbol: str) -> ...: ...
    def get_macro(self) -> ...: ...
    # get_portfolio may read local user config / broker export — keep out of vendor adapters if needed
```

**tools/** modules take a `DataSource` (injected) and return structures the agent document in README expects.

---

## Configuration (env)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API |
| `DATA_SOURCE` | e.g. `akshare` (default) / `tushare` |
| `TUSHARE_TOKEN` | if using Tushare |
| `ALARM_DB_PATH` | SQLite path (default e.g. `~/.marketmind/alarms.db`) |
| `ALARM_POLL_INTERVAL` | seconds between scheduler ticks (e.g. `30`) |
| `NOTIFY_WEBHOOK_URL` | optional webhook for triggers |

---

## Design decisions (non-negotiables for v1)

1. **Single data path for chat and alarms** — evaluator calls the same **tools/** as the agent; no duplicate “alarm-only” fetchers.
2. **AlarmSpec is structured and validated** — agent emits JSON; **parser.py** + pydantic reject ambiguous specs before storage.
3. **SQLite alarm store** for MVP — zero extra infra; migrate only if multi-user or scale demands.
4. **In-process scheduler** first — graduate to external queue/cron only when needed.
5. **Disclaimer alignment** — README alarm caveats (latency, gaps, duplicates) apply to notifier copy and any UI.

---

## Roadmap alignment (from README)

Implement roughly in this order:

1. **data/base.py** + one adapter + **tools/** smoke path  
2. **agent/loop** + tool wiring  
3. **alarms/schema.py** + **store.py** + **parser.py**  
4. **evaluator.py** + **scheduler.py** + **notifier.py**  
5. CLI + `create_alarm` / `evaluate_alarm` as agent tools  
6. Pre-market briefing, deep-dive, web UI as separate vertical slices  

---

## License

Same as repository (MIT).
