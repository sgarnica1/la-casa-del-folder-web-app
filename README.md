# La Casa Del Folder - Frontend App

Frontend repository for the MVP photo-product system.

## Tech Stack

- React
- TypeScript
- Vite
- pnpm
- Tailwind CSS
- shadcn/ui
- React Router
- Zustand
- Vitest

## Project Structure

```
/src
  /app        (routing, layout, providers)
  /components (shared UI primitives)
  /features
    /editor
    /order
  /stores     (editor store, draft store)
  /services   (API client placeholders)
  /types      (Draft, Layout, Product contracts)
  /tests
```

## Core Principles

1. **Draft is the Core Entity** - All UI revolves around a Draft
2. **Define Contracts BEFORE UI** - Types are the source of truth
3. **Editor Is a State Machine** - Single editor store, serializable state only
4. **Backend Is the Authority** - Frontend never calculates prices or validates drafts
5. **Styling Rules** - Tailwind only, shadcn/ui as base components
6. **Testing Rules** - Editor state logic must be testable

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## MVP Scope

- Exactly ONE product
- Exactly ONE template
- Exactly ONE layout structure
- No catalog browsing
- No cart
- Fake payment only

## Status

This is a scaffolding repository. Core functionality is not yet implemented.
