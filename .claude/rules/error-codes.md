# HTTP/tRPC Error Code Standard

## Rules

| Code | tRPC Name | When to Use | Frontend Behavior |
|------|-----------|-------------|-------------------|
| 401 | `UNAUTHORIZED` | Token/session is invalid, expired, or missing. Identity cannot be verified. | Clears token + redirects to login |
| 403 | `FORBIDDEN` | Authenticated but not allowed. User is known but lacks permission. | Shows error, stays logged in |
| 404 | `NOT_FOUND` | Resource doesn't exist. | Shows error |

## Critical

- `UNAUTHORIZED` must ONLY be thrown from auth middleware (token validation, session verification in `trpc.context.ts`, `platform.trpc.ts`, `admin.trpc.ts`, `user.context.ts`).
- All business-logic permission checks (ownership, role, access control) must use `FORBIDDEN`.
- Resource existence checks must use `NOT_FOUND`.
- Misusing `UNAUTHORIZED` causes automatic user logout on the frontend.
