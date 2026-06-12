---
paths: "**/*.test.ts, **/*.test.tsx, **/*.spec.ts, **/test/**/*"
---

# Testing Rules

## Test Types

| Type | Command | Purpose |
|------|---------|---------|
| Unit | `pnpm test:unit` | Pure logic, no containers |
| Functional | `pnpm test:functional` | With database containers |
| Integration | `pnpm test:integration` | Full API tests |
| E2E | `pnpm test:e2e` | Browser/app tests |

## File Naming

- Unit tests: `*.test.ts`
- Functional tests: `*.functional.test.ts`
- Integration tests: `*.integration.test.ts`

## Test Structure

```typescript
describe('ExampleService', () => {
  describe('create', () => {
    it('should create an example with valid input', async () => {
      // Arrange
      const input = { name: 'test' }

      // Act
      const result = await service.create(input)

      // Assert
      expect(result.name).toBe('test')
    })

    it('should throw on invalid input', async () => {
      await expect(service.create({})).rejects.toThrow()
    })
  })
})
```

## Best Practices

- Extract pure functions to `*.utils.ts` for easy unit testing
- Mock Firebase for auth testing
- Use TestContainers for database tests
- Never increase test timeout beyond 2 minutes without approval
- Keep tests green before and after changes
