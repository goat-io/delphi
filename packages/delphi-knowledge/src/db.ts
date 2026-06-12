export interface Db {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>
  close(): Promise<void>
}

export async function createDb(opts?: { dataDir?: string }): Promise<Db> {
  const connectionString = process.env.DATABASE_URL

  if (connectionString) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString })
    return {
      async query<T = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
      ): Promise<{ rows: T[] }> {
        const result = await pool.query(sql, params)
        return { rows: result.rows as T[] }
      },
      async close(): Promise<void> {
        await pool.end()
      },
    }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const client = new PGlite(opts?.dataDir)
  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ): Promise<{ rows: T[] }> {
      const result = await client.query(sql, params)
      return { rows: result.rows as T[] }
    },
    async close(): Promise<void> {
      await client.close()
    },
  }
}
