---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
classification:
  projectType: web_app
  domain: fintech
  complexity: medium-high
  projectContext: brownfield
inputDocuments:
  - docs/prds/market-prd.md
  - docs/designs/market-domain-model.md
  - docs/designs/market-alarm-domain.md
  - docs/designs/market-identity-access-domain.md
  - docs/designs/market-message-domain.md
  - docs/designs/market-frontend-design.md
workflowType: "prd"
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 6
---

# Product Requirements Document - market

**Author:** Stepheno
**Date:** 2026-05-03

## Executive Summary

Market is an AI-driven stock alert platform that transforms how active traders capture critical trading windows. Instead of navigating complex parameter forms in broker apps, users describe their monitoring intent in plain language — "alert me when this limit-down stock starts seeing buy orders" — and the system parses, structures, and confirms the rule in seconds. When the condition fires, the notification arrives in real time, giving the trader a decisive edge.

The V1 target user is the active retail trader who monitors specific high-stakes scenarios — capital attempting to lift a limit-down stock (翘板), or large sell orders hitting a held limit-up position (涨停砸盘). These are split-second decision moments where existing broker alerts are either too coarse (price-only triggers) or too complex to configure quickly. Market closes this gap by making alert creation as fast as the thought behind it.

### What Makes This Special

**Intent-driven, not parameter-driven.** Users think in trading scenarios ("is capital lifting this stock?"), not in technical parameters ("volume ratio > 3x"). The AI translation layer converts natural language into structured conditions, and the mandatory confirmation step ensures the user retains full control — no black-box execution.

**One sentence, one minute, one alert.** The entire creation flow — from natural language input to AI parsing to structured confirmation to persisted alarm — completes in approximately one minute. This is the single killer feature for V1: a speed-of-thought alert creation experience that no broker app currently offers.

**High signal-to-noise by design.** Every alarm fires only on edge-triggered state transitions (condition transitions from false to true), enforces cooldown periods, and supports per-alarm notification tiers (`standard` vs `emphasis`). The goal is not "keep the user informed" — it is "alert the user at the exact moment they need to make a trading decision."

## Project Classification

| Dimension        | Value                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project Type** | Web Application (SPA + API backend, SSE streaming)                                                                                                                                        |
| **Domain**       | Fintech / Stock Market Intelligence                                                                                                                                                       |
| **Complexity**   | Medium-High — real-time data pipeline, AI-assisted parsing, rule engine with edge detection, multi-domain architecture; scope constrained to flat condition groups and a fixed metric set |
| **Context**      | Brownfield — existing domain model designs, data contracts, and frontend architecture already established                                                                                 |

## Success Criteria

### User Success

The user creates their first alarm within 1 minute of opening the app — regardless of prior experience. The natural language input, AI parsing, and structured confirmation flow must feel immediate and intuitive for both new and returning users.

When an alarm fires, the notification arrives within **2 seconds** of the market event. This is the critical success threshold: the user must still have enough time to observe the situation and make a trading decision. A late alert in the 翘板 or 涨停砸盘 scenario is a missed alert.

The user rates an alarm as "useful" when the **timing was right** — the condition genuinely fired at the correct moment — regardless of whether the user ultimately decided to trade. "Useful" measures signal accuracy and timeliness, not trading outcomes.

### Business Success

V1 serves the founder and a small group of invited beta users. Success is validated by:

- Founder daily active use: the product is the primary alert tool for the founder's own trading workflow.
- Beta user retention: invited users continue using the product beyond the first week.
- Qualitative feedback: users report that market replaced their previous alert workflow (broker app, manual monitoring, or group chat signals).

Post-V1 growth metrics will be defined after beta validation.

### Measurable Outcomes

All quantitative targets are defined in the Non-Functional Requirements section (NFR1–NFR17). Key V1 adoption targets:

| Outcome                      | Measurement                            | V1 Target                    |
| ---------------------------- | -------------------------------------- | ---------------------------- |
| AI parsing accuracy          | First-attempt match to user intent     | ≥ 85%                        |
| Signal accuracy (user-rated) | User rates "useful" after notification | ≥ 70% of rated notifications |
| Adoption depth               | Active alarms per user                 | ≥ 2 within first session     |

## User Journeys

### Journey 1: 翘板猎手 — Stepheno 的典型一天

**Persona**: Stepheno，短线交易老手。每天盘前浏览跌停股列表，寻找可能被资金撬板的标的。他的对手盘是时间——晚看到一秒，可能就错过最佳跟随窗口。

**Opening Scene**: 早上 9:15， Stepheno 打开 market。某只热门题材股昨天跌停，盘后新闻发酵，他预感今天可能有资金尝试翘板。他需要在开盘前设好监控。

**Rising Action**: 他在聊天框输入："翠微股份跌停打开的时候提醒我，放量3倍以上"。AI 在 2 秒内解析出结构化卡片：

```
股票：翠微股份
条件：全部满足
  · 涨停/跌停状态 = 未跌停（打开）
  · 5分钟量比 >= 3
冷却：15分钟
[确认创建]
```

Stepheno 快速扫了一眼——条件准确，他改了冷却时间为 30 分钟（翘板一旦开始，不想被重复轰炸），选了"强提醒"档位，点确认。整个创建过程不到 45 秒。

**Climax**: 10:23，翠微股份封单开始松动，成交量骤然放大。2 秒内手机震动——推送标题"翠微股份 · 跌停打开 + 放量"。他打开券商 App，看到买一档挂单快速堆积，果断跟随。这一秒级的通知，券商 App 的告警系统做不到——它只能设价格触发，无法表达"跌停打开+放量"这种交易意图。

**Resolution**: 翘板成功，股价翻红。Stepheno 在通知上点了 👍 有用。这条反馈不会改变今天的交易，但它会帮助系统理解：这类告警对他是高价值的。他继续盯盘，market 在后台默默守护他的其他告警。

### Journey 2: 涨停持仓者的卖出预警

**Persona**: 小李，内测用户，也是短线交易者。习惯打板买入，但最怕的是涨停板被砸——如果不第一时间卖出，可能从涨停直接翻绿。

**Opening Scene**: 小李昨天打板买入了某只 AI 概念股，今天一字涨停。但他不安心——最近市场情绪不稳定，涨停被砸的故事时有发生。

**Rising Action**: 他打开 market："我持有的中科曙光，涨停状态下如果出现大单卖出，立刻告诉我"。AI 解析后，他把推送档位调到"强提醒"——这个信号对他来说不能错过。

**Climax**: 13:42，一笔大额卖单成交，涨停板出现裂口。推送几乎同时到达："中科曙光 · 涨停板大单成交"。小李立刻打开券商，看到卖一档堆积了更多卖单，果断卖出。从事件发生到他做出决策，不超过 5 秒。

**Resolution**: 股票随后打开涨停，大幅回落。小李因为第一时间收到信号，保住了利润。他在 market 上点了 👍。这个场景，他的券商 App 完全无法配置。

### Journey 3: 新用户第一次使用

**Persona**: 老张，被邀请的内测用户。做了几年股票，但只用过券商 App 的基本功能，从没使用过第三方告警工具。

**Opening Scene**: 老张收到 Stepheno 的邀请链接，注册登录后进入 `/chat` 页面。他看到一个简洁的输入框和 3 个推荐模板卡片："价格突破"、"放量提醒"、"大涨大跌"。

**Rising Action**: 老张不确定该输入什么，但他最近关注宁德时代，想设一个价格告警。他试着输入："宁德时代跌破200提醒我"。系统立刻返回结构化确认卡片，他看到价格条件、股票名称都正确，冷却时间默认 15 分钟可以接受。他点了确认。

**Climax**: 整个过程不到 1 分钟。老张发现这比券商 App 里翻三层菜单设告警简单太多了。他接着又设了第二个："宁德时代涨到 220 告诉我"。现在他有 2 个活跃告警，体验流畅自然。

**Resolution**: 老张开始把 market 推荐给股友群里的人。"你不用填什么参数，就说一句话就行。" 这就是 V1 的 aha moment。

### Journey 4: 系统运维 — 创始人的日常检查

**Persona**: Stepheno 同时也是系统运维者。交易时段他需要确信系统在正常运转。

**Opening Scene**: 早上 9:00， Stepheno 打开管理面板查看系统状态。他需要确认行情数据流正常、规则引擎运行中、通知通道畅通。

**Rising Action**: 他检查关键指标：行情数据延迟 < 500ms、规则引擎 CPU 使用率正常、通知队列无堆积。他看到昨晚部署的冷却逻辑更新没有产生异常。

**Climax**: 交易时段内，他收到一条系统告警：某台 worker 内存使用率升高。他快速扩容后继续自己的交易。

**Resolution**: V1 的运维界面可以很简单——一个状态页面加关键指标的仪表盘。核心需求是：**在交易时段内，如果系统出了问题，他能在影响用户之前发现**。

### Journey Requirements Summary

| Journey        | Reveals Requirements For                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 翘板猎手       | NL parsing of compound conditions (status + volume), per-alarm cooldown override, emphasis tier push, edge-triggered state detection for limit_down |
| 涨停卖出预警   | NL parsing of sell-pressure scenarios, emphasis tier, sub-2s delivery, feedback mechanism                                                           |
| 新用户首次使用 | Preset templates as onboarding, zero-learning-curve input, single-step confirmation, ≥ 2 alarms in first session                                    |
| 系统运维       | Health dashboard, data pipeline latency monitoring, rule engine metrics, alert queue depth                                                          |

## Domain-Specific Requirements

### Data Source Constraints

Market consumes stock market data sourced from broker-provided feeds. **Redistribution or third-party forwarding of market data is prohibited.** The system may only use this data internally for alarm evaluation and user notification. No API endpoints may expose raw or derived market data to external consumers.

### AI Output Accountability

The AI parsing layer translates natural language into structured alarm conditions, but **the user's explicit confirmation is the sole authority** for alarm creation. If the AI misinterprets user intent, the user corrects or discards the draft before it becomes a persisted alarm. No additional disclaimer or liability mechanism is required for V1 — the confirmation step is the safety gate.

### Notification Delivery

V1 targets sub-2-second event-to-notification latency as a product quality goal, not a contractual SLA. No compensation mechanism is defined for missed or delayed notifications. Reliability is pursued through engineering best practices (edge-triggered evaluation, cooldown enforcement, delivery status tracking in `notifications` table).

### Out of Scope (V1)

- KYC / AML — market does not handle funds, accounts, or trade execution
- PCI-DSS — no payment processing in the alert flow
- Data encryption at rest or audit logging beyond standard application logging — not required for V1 (founder + beta users only)
- Regulatory filings or compliance certifications

## Web Application Specific Requirements

### Project-Type Overview

Market V1 is a single-page application (SPA) built with React + TypeScript, serving authenticated users only. No server-side rendering or SEO optimization is required — the product is a behind-login tool, not a public-facing website. Target browsers are the latest stable versions of Chrome, Safari, and Firefox. No legacy browser support.

### Real-Time Architecture

The application uses two distinct real-time channels:

| Channel             | Technology                                   | Purpose                                                                                        |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Chat streaming      | SSE (`text/event-stream`)                    | Incremental delivery of AI-parsed content and UIBlock updates during alarm creation            |
| Alarm notifications | Browser Push API (Service Worker + Web Push) | Delivery of triggered alarm notifications even when the app tab is in the background or closed |

This separation ensures chat responsiveness is independent of push notification infrastructure, and vice versa. Push subscription management (registering/updating the Service Worker, storing push subscriptions server-side) falls within the Identity & Access domain's device management responsibility.

### Responsive Design

V1 targets desktop as the primary usage context (active traders monitoring during trading hours). Mobile browser support is secondary — the Growth phase introduces a native mobile app (`market-native`) for reliable push delivery and optimized mobile UX. The SPA should remain usable on mobile browsers but need not be pixel-perfect for small screens.

### Accessibility

Not a V1 priority. Accessibility improvements (keyboard navigation, screen reader support, contrast compliance) will be addressed post-beta based on user feedback.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach:** Problem-solving MVP — ship the smallest working product that solves the founder's own trading alert problem, validate with beta users, then expand.

**Resource Requirements:** Solo founder + AI-assisted development. Backend (API + rule engine), frontend (SPA), and infrastructure all managed by one person initially.

### MVP Feature Set (Phase 1)

Single killer feature: **natural language alarm creation with real-time edge-triggered notification.**

**Core User Journeys Supported:**

| Journey        | MVP Coverage                                                                              |
| -------------- | ----------------------------------------------------------------------------------------- |
| 翘板猎手       | Full — NL input → AI parsing → structured confirmation → edge-triggered push notification |
| 涨停卖出预警   | Full — same flow, emphasis tier push                                                      |
| 新用户首次使用 | Full — preset templates + NL input, 1-minute creation target                              |
| 系统运维       | Minimal — basic health dashboard, not a polished admin UI                                 |

**Must-Have Capabilities:**

- User authentication (Better-Auth, OAuth Google)
- Chat interface with assistant-ui (SSE streaming)
- AI natural language parsing → structured alarm draft
- Structured confirmation UI (alarm_editor UIBlock)
- Alarm CRUD (POST/GET/PATCH/DELETE /alarms)
- Rule engine: edge-triggered evaluation with cooldown
- Flat condition groups (AND/OR), fixed metric set (8 metrics: price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m)
- Browser Push notifications (Web Push via Service Worker)
- Per-alarm notify_label and notify_tier (standard/emphasis)
- Notification feedback (useful / not useful)
- 3 preset alarm templates for cold start
- Soft delete for alarms

**Explicitly NOT in MVP:**

- Native mobile app
- Historical trigger log / pattern analysis
- Multi-turn AI clarification
- Admin dashboard beyond basic health check
- Accessibility compliance
- Public API / third-party integrations

### Growth Features (Phase 2)

Features to build after MVP is validated by daily active use:

- Mobile native app (`market-native`) for reliable push delivery
- Historical trigger log and per-alarm trigger statistics
- Smarter AI parsing: multi-turn clarification, implicit intent resolution
- Feedback-driven alarm quality: deprioritize consistently "not useful" alarms
- Shared / community alarm templates
- Operational dashboard: rule engine metrics, notification delivery rates, latency percentiles

### Expansion (Phase 3)

Long-term vision features, prioritized based on Growth-phase learning:

- Multi-condition nesting (complex AND/OR trees)
- Technical indicators (MACD, KDJ, BOLL) as supported metrics
- Strategy journaling and trade attribution
- OCR / statement import for position-aware context
- Cross-market support (US, HK equities)
- Public API for third-party integrations

### Risk Mitigation Strategy

**Technical Risks:**

| Risk                                                                           | Likelihood | Mitigation                                                                                                                          |
| ------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AI parsing accuracy too low for compound conditions (e.g., "跌停打开+放量3倍") | Medium     | Start with single-condition templates; measure first-attempt accuracy; iterate on prompt engineering before adding compound support |
| Sub-2s notification latency hard to achieve                                    | Medium     | Decouple rule engine from notification delivery via queue; measure p99 in production; optimize hot path before adding features      |
| SSE reliability during trading hours (concurrent users, reconnection)          | Low        | V1 serves < 10 users; implement client-side reconnect with retry; no need for distributed SSE infrastructure                        |

**Market Risks:**

| Risk                                                 | Mitigation                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Product solves founder's problem but not beta users' | Beta users are selected from same trader profile; qualitative feedback loop built into V1 via 👍👎 |
| Users revert to broker app alerts                    | Track daily active use as primary signal; if retention drops, investigate specific failure mode    |

**Resource Risks:**

| Risk                                            | Mitigation                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Solo founder capacity limits delivery speed     | MVP scope is deliberately minimal — one killer feature, no admin polish, no mobile |
| Infrastructure cost for real-time data pipeline | Start with broker-provided data feed; no self-hosted market data infrastructure    |

## Functional Requirements

### Authentication & Identity

- FR1: Users can sign up and log in via Google OAuth
- FR2: Users can log out and invalidate their session
- FR3: The system identifies the current user on every authenticated request and injects user identity into all business operations

### Chat & AI Interaction

- FR4: Users can create a chat session to begin an alarm creation conversation
- FR5: Users can view their list of past chat sessions
- FR6: Users can send a natural language message describing an alarm condition
- FR7: The system streams an AI-parsed response in real time, including a text explanation and a structured alarm draft
- FR8: The system presents the parsed alarm as an editable structured card (symbol, conditions, operator, cooldown, notify_label, notify_tier)
- FR9: Users can modify any field in the structured draft before confirming
- FR10: Users can load and scroll through the message history of a chat session
- FR11: When a user's natural language request references a metric or condition the system does not support, the AI responds with a clear text explanation indicating the limitation, rather than producing an incorrect or incomplete alarm draft

### Alarm Creation & Management

- FR12: Users can confirm a structured draft to create a persisted alarm
- FR13: The system persists only user-confirmed alarms with ownership tied to the authenticated user
- FR14: Users can view a list of their active alarms with key attributes (symbol, condition summary, enabled status, notify tier, last triggered time)
- FR15: Users can view the full details of a single alarm
- FR16: Users can update an existing alarm's conditions, cooldown, notify_label, or notify_tier
- FR17: Users can enable or disable an alarm without deleting it
- FR18: Users can delete an alarm (soft delete — hidden from lists and rule engine, recoverable if needed)
- FR19: The system supports flat condition groups using AND or OR logic with a fixed set of metrics (price, pct_change, volume, turnover, limit_up, limit_down, volume_ratio_5m, price_change_5m)

### Alarm Templates

- FR20: Users can browse a set of preset alarm templates (e.g., price breakout, volume surge, large price move)
- FR21: Users can activate a preset template as a personalized alarm with one action

### Rule Engine & Evaluation

- FR22: The system evaluates all enabled, non-deleted alarms against incoming market data in real time
- FR23: The system triggers an alarm only on edge transition (condition state changes from false to true)
- FR24: The system enforces a per-alarm cooldown period between consecutive triggers
- FR25: The system supports per-alarm notification label (user-defined short text for push display)
- FR26: The system supports per-alarm notification tier (standard or emphasis) affecting push delivery behavior

### Notification Delivery

- FR27: The system delivers a push notification to the user when an alarm triggers
- FR28: Users receive push notifications even when the browser tab is in the background or closed (Web Push)
- FR29: The system renders notification content following a structured template (stock name + condition summary + trigger context), incorporating the alarm's notify_label when present
- FR30: The system plays an audible sound alert when a push notification arrives, with the sound behavior differentiated by notify tier (standard vs emphasis)

### Feedback

- FR31: Users can rate a triggered notification as "useful" or "not useful"
- FR32: The system records feedback associated with the alarm and user for future quality analysis

## Non-Functional Requirements

### Performance

| NFR ID | Requirement                                                   | Target                                                              |
| ------ | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| NFR1   | Event-to-notification latency (market event → push received)  | < 2s p99 during trading hours                                       |
| NFR2   | Alarm creation end-to-end (first keystroke → alarm persisted) | < 60s for any user                                                  |
| NFR3   | Chat input to first AI token                                  | < 2s                                                                |
| NFR4   | Initial page load (Time to Interactive)                       | < 3s on broadband                                                   |
| NFR5   | Alarm list render (≤ 50 items)                                | < 500ms                                                             |
| NFR6   | Rule engine tick processing                                   | Complete evaluation cycle for a symbol within 500ms of tick arrival |
| NFR7   | Initial bundle size                                           | < 300KB gzipped                                                     |

### Reliability

| NFR ID | Requirement                                                      | Target                                                                    |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| NFR8   | Rule engine uptime during A-share trading hours (9:30–15:00 CST) | ≥ 99.9%                                                                   |
| NFR9   | Duplicate trigger prevention                                     | 0 duplicate notifications per edge transition + cooldown cycle            |
| NFR10  | Notification delivery rate                                       | ≥ 99% of triggered alarms produce a delivered push notification           |
| NFR11  | SSE stream recovery                                              | Client auto-reconnects within 5s of disconnection with message continuity |

### Security

| NFR ID | Requirement               | Target                                                                                                                        |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| NFR12  | User identity enforcement | All write operations derive `user_id` exclusively from server-side auth context; client-supplied user identifiers are ignored |
| NFR13  | Data isolation            | Users can only read and modify alarms, sessions, and feedback they own; cross-user access returns 404                         |
| NFR14  | Market data containment   | No API endpoint exposes raw or derived market data to external consumers                                                      |
| NFR15  | AI output containment     | AI-parsed alarm drafts are never persisted to the alarm domain without explicit user confirmation                             |

### Integration

| NFR ID | Requirement               | Target                                                                                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NFR16  | Market data feed          | System consumes broker-provided real-time data; feed interruption triggers a system health alert                                     |
| NFR17  | AI model interface        | NL-to-structured parsing is invoked via a stateless API call; model can be swapped without architectural changes                     |
| NFR18  | Push notification service | Web Push delivery via browser push service (FCM for Chrome, APNs for Safari); subscription management tied to authenticated sessions |
