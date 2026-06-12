---
paths: "**/prisma/**/*.prisma, **/prisma/**/*.ts, **/*.service.ts, **/*.controller.ts, **/*.router.ts"
---

# Prisma Rules

## SodiumPrismaClient — the ONLY Prisma type to use

The codebase uses an extended Prisma client (`SodiumPrismaClient`) with custom extensions (Kysely, cursor streaming). **Never use the base `PrismaClient` type** for variables, parameters, or return types.

```typescript
// CORRECT
import type { SodiumPrismaClient } from '@src/config/database/getConfiguredPrismaClient'

function myService(prisma: SodiumPrismaClient) {
  return prisma.account.findMany()
}

// WRONG — base PrismaClient is missing extensions, causes type mismatch
import type { PrismaClient } from 'prisma-client'
function myService(prisma: PrismaClient) { ... }
```

## Accessing Prisma

### In tRPC handlers — use `ctx.extended.prisma`

```typescript
// CORRECT — fully typed, no casts
.query(async ({ ctx }) => {
  return ctx.extended.prisma.account.findMany()
})

// WRONG
const prisma = (ctx as any).extended?.prisma   // NO — never cast ctx
const prisma = ctx.extended.prisma as any      // NO — never cast prisma
```

### In `withContainer` callbacks — use `c.context.prisma`

```typescript
// CORRECT — ContainerContext types it as SodiumPrismaClient
await withContainer(async c => {
  return c.context.prisma.platformTenant.findMany()
}, tenantId)

// WRONG
const prisma = c.context.prisma as any    // NO
```

### In services — accept `SodiumPrismaClient` parameter or use `container.context.prisma`

```typescript
// CORRECT
import { container } from '@src/config/_container'
const { prisma } = container.context
await prisma.account.findFirst({ where: { id } })

// WRONG
const prisma = (container.context as any).prisma   // NO
```

### Dynamic model access (rare — only for generic/meta queries)

The only legitimate `as any` for Prisma is dynamic model access where the model name is a runtime variable:

```typescript
// ACCEPTABLE — model name is dynamic
const prismaModel = (prisma as any)[modelName]
```

## JSON Fields

Prisma JSON fields require `Prisma.InputJsonValue`, not `Record<string, unknown>`:

```typescript
import type { Prisma } from 'prisma-client'

// CORRECT
interface MyParams {
  metadata?: Prisma.InputJsonValue
}

// WRONG — causes type mismatch on create/update
interface MyParams {
  metadata?: Record<string, unknown>
}
```

## Schema Changes

- Always create migrations: `sodium db:migrate --name=desc`
- Never run `prisma db push` — pgroll handles all DDL
- Add indexes for frequently queried fields
- Use soft deletes with `deletedAt DateTime?`

## Naming Conventions

- Models: PascalCase (`UserProfile`)
- Fields: camelCase (`createdAt`)
- Map to snake_case in DB: `@@map("user_profile")`, `@map("created_at")`

## Import

Always import from `prisma-client` (NOT `@prisma/client`):

```typescript
import type { Prisma } from 'prisma-client'           // For Prisma namespace (types)
import type { Account } from 'prisma-client'           // For model types
import type { SodiumPrismaClient } from '@src/config/database/getConfiguredPrismaClient' // For client type
```
