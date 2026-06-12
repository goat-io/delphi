---
paths: "apps/backend/**/*.ts"
---

# Type Safety Rules

## `as any` is banned

Never use `as any` to work around type mismatches. Find the root cause and fix the type.

### Common violations and their fixes

| Bad pattern | Fix |
|-------------|-----|
| `(ctx as any).extended.prisma` | `ctx.extended.prisma` — ctx.extended is typed via ContainerContext |
| `(container.context as any).prisma` | `container.context.prisma` — container is typed as TypedContainer |
| `c.context.prisma as any` | `c.context.prisma` — withContainer callback has ContainerContext |
| `prisma as any).account.findFirst` | `prisma.account.findFirst` — use SodiumPrismaClient type |
| `(ctx as any).actorId` | `ctx.actorId` — superAdminProcedure adds this to ctx |
| `prisma: PrismaClient` (param type) | `prisma: SodiumPrismaClient` — always use the extended type |
| `metadata: Record<string, unknown>` (for Prisma JSON) | `metadata: Prisma.InputJsonValue` |

### Acceptable `as any` (rare)

- Dynamic property access where the key is a runtime variable: `(prisma as any)[modelName]`
- Test files: mock objects need `as any` for `.mockResolvedValue()` etc.
- Framework boundaries: `extendContext` callback in trpc.ts where library types are too narrow

## No `as unknown as` chains

If you need `as unknown as SomeType`, the types are wrong. Fix the source type instead.

```typescript
// WRONG
const prisma = ctx.extended.prisma as unknown as PrismaClient

// CORRECT — ctx.extended.prisma is already SodiumPrismaClient
const prisma = ctx.extended.prisma
```

## Container context is fully typed

`container.context` returns `ContainerContext` with all services typed. Never cast it.

```typescript
// All of these are typed — no casts needed
container.context.prisma              // SodiumPrismaClient
container.context.secretService       // SecretService<SodiumSecrets>
container.context.centrifugoService   // CentrifugoService
container.context.tenantMeta          // TenantMeta
container.context.queueService        // QueueService
container.context.tasks               // SodiumTaskRegistry
container.context.typesenseService    // { account, product, job, skill }
container.context.stripeService       // StripeService
container.context.cacheService        // SodiumCache
```

## Frontend: no hardcoded data that belongs in the backend

- Category lists, feature flags, config options — fetch from backend API
- Never duplicate backend constants in frontend code
- If the backend doesn't have an endpoint, create one

## Reuse components, don't duplicate

- Shared form fields (name + slug) → `TenantSlugFields`
- Dialog patterns → reuse existing dialog components
- Before creating a new component, check if one exists that does the same thing
