// pnpm tsx scripts/pglite-db-client.ts
//
// PGlite-backed DbClient adapter for @goatlab/delphi-core WorkflowEngine.
//
// PGlite is a single-connection embedded Postgres (WASM). It serializes
// concurrent queries internally, so no mutex is needed at the JS level.
// getPool() returns undefined — the engine omits COPY FROM (uses batch
// INSERT instead) and PgConnector falls back to polling (no LISTEN/NOTIFY).

import type { DbClient } from '@goatlab/delphi-core'
import type { Pool, PoolClient } from 'pg'

export interface PGliteInstance {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>
  close(): Promise<void>
}

/**
 * Wrap a PGlite instance as a delphi-core DbClient.
 *
 * - query(): delegates directly to PGlite (already serialized)
 * - getPool(): returns undefined — engine skips COPY FROM + pgPool features
 * - transaction(): manual BEGIN/COMMIT/ROLLBACK via PGlite
 * - destroy(): closes the PGlite instance
 */
export function createPGliteDbClient(pglite: PGliteInstance): DbClient {
  // Mutex: PGlite is single-connection — concurrent BEGIN/COMMIT calls
  // would interleave. Serialize transactions with a simple promise chain.
  let txChain: Promise<unknown> = Promise.resolve()

  return {
    query: async <T = any>(
      text: string,
      params?: any[],
      // Using any return type to avoid pg's QueryResultRow constraint on QueryResult<T>
    ): Promise<any> => {
      const result = await (pglite as any).query(text, params)
      // Shape to match pg.QueryResult<T>
      return {
        rows: result.rows as T[],
        rowCount: (result.rows as T[]).length,
        command: '',
        oid: 0,
        fields: [],
      }
    },

    getPool: (): Pool => {
      // Return undefined cast — the engine checks `if (this.config.pgPool)`
      // before using COPY FROM and LISTEN/NOTIFY. Returning undefined causes
      // those paths to be skipped; the engine uses polling + batch INSERT.
      return undefined as unknown as Pool
    },

    transaction: async <T>(
      fn: (client: PoolClient) => Promise<T>,
    ): Promise<T> => {
      // Serialize transactions through the chain so BEGIN/COMMIT don't interleave
      const result = (txChain = txChain.then(async () => {
        await pglite.query('BEGIN')
        try {
          // Provide a fake PoolClient that delegates query() to PGlite
          const fakeClient = {
            query: async (text: string, params?: unknown[]) => {
              const r = await pglite.query(text, params)
              return { rows: r.rows, rowCount: r.rows.length }
            },
            release: () => {},
          }
          const r = await fn(fakeClient as unknown as PoolClient)
          await pglite.query('COMMIT')
          return r
        } catch (err) {
          await pglite.query('ROLLBACK').catch(() => {})
          throw err
        }
      }))

      return result as Promise<T>
    },

    destroy: async (): Promise<void> => {
      await txChain.catch(() => {})
      await pglite.close()
    },
  }
}

/**
 * Execute a multi-statement SQL string against a DbClient.
 *
 * PGlite does not support multiple commands in a single query() call.
 * This splits by semicolons, strips comments + blank lines, and executes
 * each statement individually.  Errors from "already exists" DDL are swallowed
 * so the function is safe to call on an existing database.
 */
export async function execMultiStatement(
  db: DbClient,
  sql: string,
): Promise<void> {
  // Split on semicolons that are NOT inside single-quoted strings.
  // A naive split by ';' covers 99 % of DDL — the engine's CREATE_TABLES_SQL
  // contains no semicolons inside string literals.
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(
      s =>
        s.length > 0 &&
        !s
          .replace(/--[^\n]*/g, '')
          .trim()
          .match(/^$/),
    )

  for (const stmt of statements) {
    // Skip pure-comment chunks
    const stripped = stmt
      .split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n')
      .trim()
    if (!stripped) {
      continue
    }
    try {
      await db.query(stmt)
    } catch (err: any) {
      // Swallow "already exists" errors so the function is idempotent
      // 42P07 = duplicate table, 42710 = duplicate object,
      // 42701 = duplicate column, 42P06 = duplicate schema
      if (['42P07', '42710', '42701', '42P06'].includes(err.code ?? '')) {
        continue
      }
      throw err
    }
  }
}

/**
 * Create a PGlite-backed DbClient, bootstrapped with the engine schema.
 * dataDir: path to persist the PGlite database (e.g. .delphi/engine).
 * Pass undefined for an in-memory ephemeral instance.
 */
export async function createEngineDb(dataDir?: string): Promise<{
  db: DbClient
  close: () => Promise<void>
}> {
  const { PGlite } = await import('@electric-sql/pglite')
  const pglite = new PGlite(dataDir)
  const db = createPGliteDbClient(pglite as unknown as PGliteInstance)
  return {
    db,
    close: () => db.destroy(),
  }
}
