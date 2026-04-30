# Market Frontend - Development Guide

## Overview

The Market Frontend is used for client to manage alarm settings and notifications.

## Critical Rules

- UI Design System `apps/frontend/docs/DESIGN-apple.md`
- The text in all product should be Chineses.

## Technology Stack

> **Note**: This section will be updated with specific technology stack details as the admin panel is developed.

Expected stack:

- Frontend framework React
- UI component library shadcn
- State management solution zustend
- Css solution with TailwindCSS
- API integration with backend

## Essential Commands

```bash
# Development
vp install          # Install dependencies
vp run dev          # Start dev server
vp run build        # Build for production
vp run preview      # Preview production build


# Code Quality
vp lint         # Run linter
vp format       # Format code

```

## Project Structure

```
src/
├── pages/           # Page components
├── components/      # Reusable components
│   ├── ui/          # shadcn components
├── hooks/           # Custom React hooks
├── services/        # API services
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

## Key Features

TODO:

**Authentication:**

- Frontend users authenticate via JWT tokens
- All API requests include the admin token in headers
- Token refresh mechanism for long sessions

## Development Workflow

1. **Setup**: Install dependencies with `vp install`
2. **Development**: Run `vp run dev` to start the dev server
3. **API Integration**: Ensure backend is running for API calls
4. **Testing**: Write tests for new features
5. **Build**: Run `vp run build` before deployment

## Common Patterns

### 1. Data Fetching

```typescript

```

### 2. Form Handling

```typescript
// Use form libraries for complex forms
// Validate input before submission
// Handle errors gracefully
```

### 3. Table Management

```typescript
// Implement pagination, sorting, and filtering
// Use virtual scrolling for large datasets
// Provide bulk actions for efficiency
```

## Security Considerations

1. **Authentication**: All frontend routes require authentication
2. **Input Validation**: Validate all user inputs
3. **XSS Prevention**: Sanitize user-generated content
4. **CSRF Protection**: Implement CSRF tokens for state-changing operations

## Deployment

> **Note**: Deployment instructions will be added as the deployment process is established.

Expected deployment process:

1. Build production bundle: `npm run build`
2. Deploy to hosting service (Vercel, Netlify, etc.)
3. Configure environment variables
4. Set up CI/CD pipeline

## Related Documentation

- [Workspace CLAUDE.md](../../CLAUDE.md) - Overall project guide
- [Backend CLAUDE.md](../backend/CLAUDE.md) - Backend API reference

## Future Enhancements

TODO:
