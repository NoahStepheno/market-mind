# MarketMind 智能告警 — 实现排期

**告警域设计与数据契约**以设计文档为准，见：

**[docs/designs/market-mind-alarm-domain.md](../designs/market-mind-alarm-domain.md)**

产品定义：`docs/prds/market-mind-prd.md`。

---

## 实现 Todo

- [ ] Drizzle（或选定 ORM）迁移：`alarms`、`alarm_feedback`（若 V1 即落库反馈）
- [ ] 告警 CRUD 模块 + auth 中间件
- [ ] 与聊天域约定：确认创建时调用 `POST /alarms` 的载荷格式（含 `notify_label` / `notify_tier`）

## 验收对照

- [ ] 无告警域草稿表；确认仅来自聊天域流程后的写入
- [ ] 所有告警行带 `user_id`；API 无越权访问
- [ ] 支持 `notify_label`、`notify_tier` 的持久化与 PATCH；触发队列透传到通知层
- [ ] 反馈 API 不依赖客户端持有「触发流水号」型 ID；内部幂等如需则仅用系统内部标识
