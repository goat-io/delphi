# Verify Project Integrity

  Run a full integrity check across all apps and packages. Fix any issues found - regardless of who introduced them.

## Steps

### 1. Lint & TypeScript Check

    Positioned in the main package.json folder, run the following commands

    ```bash
        pnpm lint:check
        pnpm typecheck
    ```
  
  Both commands use Turbo to run across all projects. Fix all errors and warnings - the codebase must be clean with zero lint warnings.

### 2. Build Check

    ```bash
        pnpm build
    ```
  Ensure all projects build successfully.

#### Build Dependency Architecture

Some packages have **implicit dependencies via tsconfig paths** that aren't declared in `package.json`. Turbo's `^build` only recognizes package.json dependencies, so these are explicitly configured in `turbo.json`:

    @sodium/commerce-connect
           ↓
    @sodium/backend (imports commerce-connect types via tsconfig paths)
           ↓
    @sodium/shared-frontend-schemas (imports backend types via tsconfig paths)
    @sodium/shared-frontend-services (imports backend + commerce-connect types via tsconfig paths)
           ↓
    @sodium/frontend, @sodium/expo

**If build fails with "Cannot find module '@sodium/backend'" or similar:**

1. The explicit task dependencies in `turbo.json` should handle this automatically
2. If issues persist, verify `turbo.json` has the package-specific build tasks with correct `dependsOn`
3. As a fallback, build manually in order: `commerce-connect → backend → shared-frontend-schemas → shared-frontend-services`

**Key turbo.json entries that enforce build order:**

- `@sodium/backend#build` depends on `@sodium/commerce-connect#build`
- `@sodium/shared-frontend-schemas#build` depends on `@sodium/backend#build`
- `@sodium/shared-frontend-services#build` depends on `@sodium/backend#build` and `@sodium/commerce-connect#build`

### 3. Expo Bundle Check

    ```bash
        pnpm --filter=@sodium/expo bundle:check
        pnpm --filter=@sodium/expo bundle:check:android
        pnpm --filter=@sodium/expo verify:no-node-imports
    ```

  Verify the Expo app bundles correctly for iOS.

  Success Criteria

- ✅ Zero lint errors or warnings
- ✅ Zero TypeScript errors
- ✅ All builds pass
- ✅ Expo bundle exports successfully

### 4. Run unit tests

    ```bash
       pnpm test:unit
    ```
Make sure that all the tests pass and if they dont, fix the errors even if they are not changes you made

## 4. Run integration and functional tests

 For backend run functional and integration tests (dont run for frontend nor expo, they are broken)

    ```bash
       pnpm test:functional
    ```

     ```bash
       pnpm test:integration
    ```

Make sure that all the tests pass and if they dont, fix the errors even if they are not changes you made
