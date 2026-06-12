// tests/remote-worker.test.ts
//
// Verifies the pglite-socket roundtrip:
//   1. Boot PGlite (in-memory, ephemeral).
//   2. Expose it via PGLiteSocketServer on a fixed port.
//   3. Connect a pg.Pool client over the Postgres wire protocol.
//   4. Run queries and verify results.
//
// This proves the foundation of the remote-worker topology:
//   evolve:server  → PGlite + pglite-socket
//   evolve:worker  → pg.Pool(ENGINE_URL) → polls the same queue
//
// Note: PGlite is single-connection embedded Postgres. pglite-socket
// serialises connections (only one active at a time), so the pool is
// configured with max:1 to avoid concurrent-connection failures.

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let socketServer: any
let pool: Pool
const serverPort = 15_444

beforeAll(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')

  const pglite = new PGlite() // in-memory, ephemeral
  socketServer = new PGLiteSocketServer({
    db: pglite,
    port: serverPort,
    host: '127.0.0.1',
  })
  await socketServer.start()

  // max:1 — PGlite accepts one TCP connection at a time
  pool = new Pool({
    connectionString: `postgres://localhost:${serverPort}/delphi`,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
  })
}, 15_000)

afterAll(async () => {
  try {
    await pool?.end()
  } catch {
    /* ignore */
  }
  try {
    await socketServer?.stop()
  } catch {
    /* ignore */
  }
}, 10_000)

describe('pglite-socket remote roundtrip', () => {
  it('pg client connects over wire protocol and executes a query', async () => {
    const res = await pool.query('SELECT 42 AS answer')
    expect(res.rows[0]?.answer).toBe(42)
  })

  it('pg client can create a table and insert/select rows', async () => {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS rw_test (id SERIAL PRIMARY KEY, val TEXT)',
    )
    await pool.query("INSERT INTO rw_test (val) VALUES ('hello-remote-worker')")
    const res = await pool.query('SELECT val FROM rw_test LIMIT 1')
    expect(res.rows[0]?.val).toBe('hello-remote-worker')
  })

  it('pg client can use transactions across the wire', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        "INSERT INTO rw_test (val) VALUES ('tx-test-1'), ('tx-test-2')",
      )
      const res = await client.query(
        "SELECT COUNT(*)::int AS cnt FROM rw_test WHERE val LIKE 'tx-test-%'",
      )
      expect(res.rows[0]?.cnt).toBe(2)
      await client.query('COMMIT')
    } finally {
      client.release()
    }
  })

  it('queries reflect previously committed data', async () => {
    // Verify that the insert from the previous test is visible
    const res = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM rw_test WHERE val LIKE 'tx-test-%'",
    )
    expect(res.rows[0]?.cnt).toBe(2)
  })
})
