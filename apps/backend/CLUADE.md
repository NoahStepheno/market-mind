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
│   └── ...
├── entities/             # Drizzle-orm entities
│   └── accounts.ts       # Account entity
│   └── refreshTokens.ts  # RefreshTokens entity
│   └── users.ts          # User entity
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

## Migration Notes

**Important**: Do NOT generate migration files. When adding new Drizzle entities, include the Postgress CREATE TABLE statement in comments within the entity file. and please check sql generation document for details

## Related Documentation

- [Workspace CLAUDE.md](../CLAUDE.md) - Overall project guide
- [Frontend CLAUDE.md](../frontend/CLAUDE.md) - Frontend development guide
