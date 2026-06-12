---
paths: "apps/backend/src/api/**/*.ts"
---

# Domain Architecture Rules

## File Size

~200 lines per file as a rule of thumb. If a file grows past that, split it.

## Domain Structure

Every backend API domain (`apps/backend/src/api/<domain>/`) follows this structure:

```
domain/
  domain.router.ts              # Merges sub-controllers into one router
  domain.service.ts             # Unified facade (delegates to traits + sub-services)
  domain.repository.ts          # Data access layer (Prisma queries)
  domain.types.ts               # Domain TS types + Prisma type re-exports
  domain.filters.ts             # Query filters (if needed)

  traits/                       # Service implementation split by concern
    cache.service.ts            # Caching logic
    creation.service.ts         # Entity creation
    ownership.service.ts        # Roles, ownership, permissions
    indexing.service.ts         # Search indexing, metrics, mapping

  subResource/                  # One folder per REST-like sub-resource
    subResource.controller.ts   # Thin - input validation, auth, delegate, return
    subResource.service.ts      # Business logic for this sub-resource
    subResource.repository.ts   # Data access for this sub-resource
    subResource.schema.ts       # Zod schemas for input/output

  workflows/                    # BullMQ/Delphi workflows
    someWorkflow.workflow.ts
    workflow.schema.ts          # Zod schemas for workflow inputs

  __tests__/                    # All tests consolidated here
    domain.unit.test.ts
    domain.functional.test.ts
    domain.integration.test.ts
```

## Layer Responsibilities

| Layer | File suffix | What it is | Does | Does NOT |
|-------|-------------|------------|------|----------|
| **Controller** | `.controller.ts` | HTTP/tRPC entry point | Input validation (Zod), auth checks, delegate to service, return result | Prisma queries, business logic, data transformation |
| **Service** | `.service.ts` | Business logic | Business rules, orchestration, caching, error decisions | Direct Prisma calls (use repository), UI concerns |
| **Repository** | `.repository.ts` | Data access (Repository Pattern) | Prisma queries, includes, selects, raw SQL | Business logic, caching, error throwing (return null instead) |
| **Schema** | `.schema.ts` | Input/output validation | Zod schemas for tRPC `.input()` / `.output()` | Runtime logic |
| **Types** | `.types.ts` | Entity definition (the "model") | TypeScript types, Prisma type re-exports | Zod schemas, runtime code |

**Why Repository, not Model?** The Model is the entity definition (fields, relationships, shape) -- that's what Prisma schemas and `*.types.ts` provide. The Repository is the data access abstraction (queries, creates, updates) -- that's what our `*.repository.ts` files do. Using the correct name avoids confusion.

## Class Pattern

Repositories, services, and traits export class instances with enforced names. This prevents import collisions and ensures consistent naming across the codebase.

```typescript
// account.repository.ts
class AccountRepository {
  async findById(id: string) { ... }
  async findBySlug(slug: string) { ... }
}
export const accountRepository = new AccountRepository()

// consumer - name is enforced by the producer
import { accountRepository } from './account.repository'
import { collaboratorRepository } from './collaborator.repository'
accountRepository.findById(id)
collaboratorRepository.findInvitation(id)
```

**Do NOT use `import *` for repositories.** The class instance export controls the name.

**Exception:** Trait files (`traits/*.service.ts`) and sub-services imported only by the domain facade use `import *` because they export standalone functions wired together by the facade class. This is intentional -- traits are internal implementation, not public API.

## No Dynamic Imports

Use static `import` at the top of files. Dynamic `await import()` breaks the build (declaration emit can't resolve them) and makes dependencies invisible.

Only acceptable uses:
- ESM-only modules in CJS context (e.g., `@react-email/*` templates)
- Truly optional dependencies that may not be installed

If a dynamic import exists to "avoid circular deps," fix the circular dependency instead (extract shared types, restructure modules).

## Prisma Import Rule

`prisma-client` may ONLY be imported in:
- `*.repository.ts` files (for queries and Prisma namespace)
- `*.types.ts` files (for type re-exports)
- `*.filters.ts` files (for `Prisma.raw()` filter utilities)

Services and controllers get Prisma types through `domain.types.ts` re-exports. This enforces the repository layer as the single point of data access.

```typescript
// WRONG - service importing Prisma directly
import type { Account } from 'prisma-client'

// CORRECT - service importing through domain types
import type { Account } from '../account.types'
```

## Facade Pattern (Traits)

Large services use the trait pattern: the main `.service.ts` is a thin facade that delegates to focused implementation files in `traits/`.

- External callers always use `domainService.method()` - the API never changes
- Trait files export class instances (same class pattern as repositories)
- The facade class wires them together, passing dependencies as params
- No circular imports: traits depend on repository, not on each other or the facade

## Sub-Controller Pattern

When a controller would exceed ~200 lines, split by REST resource:

```typescript
// domain.router.ts - merges sub-controllers
export const domainRouter = router({
  ...profileController,      // Spread sub-controller procedures
  ...socialController,
  collaborators: collaboratorRouter,  // Or nest as sub-router
})
```

- API shape stays identical - frontend calls don't change
- Each sub-controller file stays under 200 lines
- Sub-controllers import from their own repository/schema + the shared domain service

## Documentation (JSDoc)

Pragmatic docblocks -- document the *why*, not the *what*. Inspired by Laravel's convention.

**When to docblock:**
- Non-obvious functions (complex logic, side effects, gotchas)
- Functions where the name + params don't tell the full story
- Re-exported types (explain why they exist)
- Module-level file docs (what this file is for, what it depends on)

**When NOT to docblock:**
- Self-explanatory functions (`findById`, `deleteAccount`, `countPosts`)
- Functions where the TypeScript signature is the documentation
- Getters, simple delegations, one-liners

**Format:**
- One-line for simple docs: `/** Excludes placeholder accounts from search. */`
- Multi-line only when explaining *why* or documenting detection logic, side effects, or gotchas
- No `@param` / `@returns` when TypeScript types already express it
- Use `@param` only when adding context beyond the type

```typescript
// GOOD - explains non-obvious behavior
/** Uses SELECT FOR UPDATE to prevent race conditions on concurrent requests. */
async upsertActivity(accountId: string, activityType: string, now: Date) {

// GOOD - explains why this approach was chosen
/**
 * Sets ownerId directly via Kysely raw query.
 * Uses Kysely instead of Prisma because ownerId is a self-referential FK
 * and Prisma's relation API makes this awkward in a parallel Promise.all.
 */
async setOwnerIdRaw(accountId: string, ownerId: string) {

// BAD - restates the function name
/** Finds an account by its ID. */
async findById(id: string) {
```

**File-level docs:**
Every file should have a top-level comment explaining its role. Keep it to 1-3 lines.

```typescript
// Account repository - core account data access layer.
// Only queries that operate on the Account table itself.
// Sub-domain queries live in their own repositories (social, search, profile).
```

## Controller Rules

- **Controllers only call services, never repositories.** The flow is always Controller -> Service -> Repository. Even for simple queries, wrap them in a service method. This keeps business logic out of controllers and gives a single place for caching, logging, and authorization.
- Every procedure MUST have `.meta()` with OpenAPI method, path, description, and tags
- Every procedure MUST have `.output()` with a Zod schema
- Zod schemas go in `*.schema.ts` files, not inline in controllers
- Controllers never import `container.context.prisma` - use service
- Controllers never import `*.repository.ts` - use service
- Use `TRPCError` with correct codes (see error-codes.md), never bare `throw new Error()`

## Test Organization

- All tests in `__tests__/` directory within the domain
- Naming: `{module}.{unit|functional|integration}.test.ts`
- Tests may import from `prisma-client` directly (test files are exempt from the Prisma rule)

## Gold Standard Reference

`apps/backend/src/api/account/` - fully refactored with all patterns applied.
