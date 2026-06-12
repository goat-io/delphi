---
paths: "**/api/**/*.ts, **/trpc.ts"
---

# tRPC Rules

## Available Procedures (from `apps/backend/src/trpc.ts`)

Only these base procedures exist. Do NOT create wrapper aliases.

| Procedure | Import | Use when |
|-----------|--------|----------|
| `publicEndpoint` | `@src/trpc` | No auth required (explore, health) |
| `authenticatedEndpoint` | `@src/trpc` | Requires valid auth token |
| `maybeAuthenticatedEnpoint` | `@src/trpc` | Auth optional (adds `isLoggedIn` flag) |

Two specialized middleware procedures also exist (justified — they add real authorization logic):

| Procedure | Import | Use when |
|-----------|--------|----------|
| `platformAccountProcedure` | `./platform.trpc` | Requires auth + resolves Account by firebaseId |
| `superAdminProcedure` | `../admin/admin.trpc` | Requires MARKETPLACE_EMPLOYEE_ADMIN role |

**Do NOT create new procedure aliases.** If you need `authenticatedEndpoint`, import it directly — don't wrap it in `const myCustomProcedure = authenticatedEndpoint`.

## Context Access

All procedures provide typed `ctx.extended` (ContainerContext) with all tenant services:

```typescript
// CORRECT — ctx.extended is fully typed
const prisma = ctx.extended.prisma           // SodiumPrismaClient
const secret = ctx.extended.secretService    // SecretService<SodiumSecrets>
const centrifugo = ctx.extended.centrifugoService

// WRONG — never cast ctx
const prisma = (ctx as any).extended?.prisma      // NO
const service = (ctx as any).extended?.myService   // NO
```

## Router Pattern

```typescript
import { authenticatedEndpoint, publicEndpoint, router } from '@src/trpc'
import { z } from 'zod'

export const exampleRouter = router({
  list: authenticatedEndpoint
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const prisma = ctx.extended.prisma
      return prisma.example.findMany({ take: input.limit })
    }),
})
```

## Error Handling

```typescript
import { TRPCError } from '@trpc/server'

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Resource not found',
})
```

## Input Validation

- Use Zod schemas from `@sodium/shared-schemas` when available
- Create new schemas in `packages/shared-schemas/` for reuse
- Keep validation at the procedure boundary
