---
paths: "packages/shared-schemas/**/*.ts, packages/shared-frontend-schemas/**/*.ts"
---

# Shared Schemas Rules

## Purpose

`@sodium/shared-schemas` contains Zod schemas and TypeScript types used across all apps (backend, frontend, expo, commerce-connect).

## Schema Pattern

```typescript
import { z } from 'zod'

// Schema definition
export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  published: z.boolean().default(false),
})

// Infer type from schema
export type CreatePost = z.infer<typeof CreatePostSchema>
```

## File Organization

- One domain per file: `post.schema.ts`, `user.schema.ts`
- Types in same file as schema (inferred with `z.infer`)
- Complex types in separate `.types.ts` if needed

## Usage in Other Apps

```typescript
// Backend - input validation
import { CreatePostSchema } from '@sodium/shared-schemas'

export const postsRouter = router({
  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(...)
})

// Frontend/Expo - form validation
import { CreatePostSchema, type CreatePost } from '@sodium/shared-schemas'
```

## Best Practices

- Schemas should be backend-agnostic (no Prisma types)
- Use `.transform()` for data normalization
- Use `.refine()` for complex validation
- Export both schema and inferred type
