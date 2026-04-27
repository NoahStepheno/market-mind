# Market Backend - Development Guide

## Technology Stack

- **Framework**: Hono 4.x
- **Database**: Postgres 3.x with drizzle
- **Auth**: Better-Auth
- **Node Version**: 20 (use `nvm use` in backend directory)
- **Package Manager**: vite-plus
- **Vilidator**: **Zod**

## Essential Commands

```bash
# Switch to correct Node version
nvm use

# Development
pnpm dev              # Start dev server with watch mode
pnpm build            # Build for production
pnpm start       # Run production build

# Code Quality
vp lint             # ESLint with auto-fix
vp format           # Prettier formatting

# Testing
vp test             # Run all tests
```

## Project Structure

```
src/
├── modules/              # Business modules
│   ├── auth/             # auth module
│   ├── alarms/           # alarms module
│   └── ...
├── entities/             # Drizzle-orm entities
│   └── accounts.ts       # Account entity
│   └── refreshTokens.ts  # RefreshTokens entity
│   └── users.ts          # User entity
│   └── ...
├── common/               # Shared utilities
│   ├── db/               # Db client
│   ├── logging/          # Logger util
├── config/               # Configuration
└── index.ts              # Application entry
```

## Critical Architecture Patterns

- **Separation of Concerns**: Service layer handles business logic, Controller layer handles presentation
- **Reusability**: Services can be used by different resolvers with different VO requirements
- **Type Safety**: Entity types provide database-level guarantees

## Database design（至关重要）

**软删除是库表设计的默认约定，不是可选项（凡业务需要「用户删除 / 下线」且需保留历史或防误删的实体）。**

- **列**：使用可空时间戳 **`deleted_at`**（`timestamptz`，推荐列名 `deleted_at`；应用层可用 `deletedAt`）。`NULL` = 未删除；写入**当前 UTC 时间** = 已删除。
- **查询**：默认所有业务查询必须带 **`WHERE deleted_at IS NULL`**（列表、详情、关联加载、定时任务、规则引擎拉数等）；除非接口明确为「含已删」或审计导出。
- **API**：对外 `DELETE` 应实现为更新 `deleted_at`（幂等：重复删除安全）；禁止把用户删除做成无条件的物理 `DELETE FROM`，除非该表明确为纯缓存/日志且无恢复需求。
- **唯一约束**：若存在业务唯一键（如 `(user_id, email)`），在支持软删后必须评估**部分唯一索引**（`WHERE deleted_at IS NULL`），否则软删行会阻塞用户再次插入「同键」新行。
- **硬删除**：仅用于迁移清理、法务/GDPR、或表本身无软删语义；走单独流程并文档化，不作为默认删除路径。

## Migration Notes

**Important**: Do NOT generate migration files. When adding new Drizzle entities, include the Postgress CREATE TABLE statement in comments within the entity file. and please check sql generation document for details

## Related Documentation

- [Workspace CLAUDE.md](../CLAUDE.md) - Overall project guide
- [Frontend CLAUDE.md](../frontend/CLAUDE.md) - Frontend development guide
- [market-mind-domain-model.md](../../docs/designs/market-mind-domain-model.md) - Domain Model Design
