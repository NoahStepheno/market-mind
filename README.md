# MarketMind

> AI-native market intelligence agent for A-share investors.

MarketMind connects real-time quotes, technical indicators, fundamentals, and news sentiment **directly into an LLM reasoning loop** via structured tools — giving you analyst-grade insights on any A-share stock, on demand.

**Natural-language alarms:** describe what you care about in plain language; the agent turns that into monitored conditions on live (or near-live) data and notifies you when they trigger — still grounded in the same tool outputs as chat.

No black boxes. No guesswork. Every analysis is grounded in live data, sourced and explainable.

---

## How it works

### On-demand advisory

```
Market Data Sources
  (quotes · technicals · fundamentals · sentiment)
          ↓
     Tool Layer
  (structured injection)
          ↓
  MarketMind Agent
  (Claude · multi-dimensional reasoning)
          ↓
   Advisory Output
  (analysis · position review · explainable calls)
          ↓
     You decide
```

### Prompt-defined alarms

```
Your prompt
  ("alert me when …")
          ↓
  MarketMind Agent
  (parse intent → symbols · thresholds · time window)
          ↓
   Alarm spec
  (durable rule set + schedule + cooldown)
          ↓
  Scheduler + data feed
  (evaluate on quotes / indicators / events)
          ↓
   Trigger
  (notify + short rationale from latest tool snapshot)
          ↓
     You decide
```

MarketMind is **advisory only** — it surfaces insights and flags risks, but the final call is always yours.

---

## Features

- **Pre-market briefing** — Daily summary of your watchlist: key events, overnight news, technicals to watch
- **Stock deep-dive** — On-demand multi-dimensional analysis: technical + fundamental + sentiment + macro
- **Prompt-defined alarms** — You describe conditions in natural language; the agent compiles them into evaluable rules on real-time or near-real-time data (combine price, volume, indicators, and announcements in one rule set)
- **Intraday signals** — System-side anomaly hooks: unusual volume, limit-up/down approach, breaking announcements (complements user-defined alarms)
- **Announcement decoder** — Plain-language summary of exchange filings, with bull/bear impact assessment
- **Position review** — Portfolio risk check, concentration warnings, rebalancing suggestions

### A-share specific coverage

- Northbound (沪深港通) capital flow
- Limit-up / limit-down dynamics
- Margin trading data (融资融券)
- Dragon-Tiger list (龙虎榜)
- Sector rotation signals

---

## Tool layer

Each tool returns **structured, annotated data** — not raw numbers. The agent receives context alongside values so it can reason, not just retrieve. **Alarms** reuse the same tool outputs for evaluation and for the explanation attached to each trigger.

| Tool | Data |
|---|---|
| `get_quotes(symbol, period)` | Price, volume, turnover, money flow, bid-ask |
| `get_indicators(symbol, indicators)` | MA, EMA, BOLL, RSI, MACD, KDJ, volume-price |
| `get_fundamentals(symbol)` | PE, PB, ROE, revenue, net profit, analyst ratings |
| `get_sentiment(symbol)` | News sentiment score, announcement digest, hot sectors |
| `get_macro()` | Policy events, index futures, northbound flow |
| `get_portfolio()` | Current positions, cost basis, P&L, risk exposure |
| `create_alarm(spec)` *(planned)* | Persist parsed alarm: symbols, conditions, schedule, cooldown, notification channel |
| `evaluate_alarm(alarm_id)` *(planned)* | Run tools, compare to spec, return trigger + rationale or no-op |

---

## Stack

- **Agent** — Claude API with Tool Use
- **Data** — AKShare (open source) / Tushare / Wind (optional upgrade)
- **Language** — Python 3.11+
- **Alarms** — Durable alarm store + scheduler (or job queue) + quote/event feed; debounce and session-level “fire once” to limit noise
- **Interface** — CLI (MVP) → Web UI (roadmap)

---

## Getting started

The repository currently documents the product direction; application scaffold (`requirements.txt`, `main.py`, `.env.example`) will land with the core agent loop.

```bash
git clone https://github.com/NoahStepheno/market-mind.git
cd market-mind
# pip install -r requirements.txt   # when added
# cp .env.example .env              # add ANTHROPIC_API_KEY when added
# python main.py
```

---

## Roadmap

- [x] Tool layer design
- [ ] Core agent loop
- [ ] Alarm spec schema (agent output → durable, evaluable rules)
- [ ] Real-time / near-real-time feed + condition evaluator
- [ ] Pre-market briefing
- [ ] Stock deep-dive report
- [ ] Notifications (CLI → webhook / email as needed)
- [ ] Web UI (create · list · pause · delete alarms)

---

## Disclaimer

MarketMind is a personal research tool. Nothing it produces constitutes financial advice. Always do your own due diligence before making investment decisions.

**Alarms:** triggers depend on data availability, feed latency, and market halts; missed, delayed, or duplicate notifications are possible. Treat every alarm as informational, not execution-grade.

---

## License

MIT
