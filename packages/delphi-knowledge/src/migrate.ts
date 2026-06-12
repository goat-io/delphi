import type { Db } from './db'

export async function migrate(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS brains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      uri TEXT NOT NULL,
      checksum TEXT NOT NULL,
      metadata JSONB,
      created_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      text TEXT NOT NULL,
      location JSONB
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS leaves (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      statement TEXT,
      aliases JSONB NOT NULL DEFAULT '[]',
      tags JSONB NOT NULL DEFAULT '[]',
      confidence JSONB,
      region_id TEXT,
      content JSONB,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS leaf_events (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      leaf_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      source_leaf_id TEXT NOT NULL,
      target_leaf_id TEXT NOT NULL,
      type TEXT NOT NULL,
      confidence DOUBLE PRECISION,
      metadata JSONB,
      created_at TEXT NOT NULL,
      UNIQUE(source_leaf_id, target_leaf_id, type)
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      leaf_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      chunk_id TEXT,
      citation TEXT,
      relation TEXT NOT NULL,
      strength DOUBLE PRECISION NOT NULL,
      extraction_confidence DOUBLE PRECISION NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      anchor_leaf_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(brain_id, title)
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS indexes (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      region_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary_tiny TEXT NOT NULL,
      summary_short TEXT NOT NULL,
      summary_medium TEXT NOT NULL,
      summary_long TEXT NOT NULL,
      key_concepts JSONB NOT NULL,
      key_beliefs JSONB NOT NULL,
      key_questions JSONB NOT NULL,
      representative_leaf_ids JSONB NOT NULL,
      stale BOOLEAN NOT NULL DEFAULT false,
      changed_leaf_count INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS maps (
      id TEXT PRIMARY KEY,
      brain_id TEXT NOT NULL,
      title TEXT NOT NULL,
      routes JSONB NOT NULL,
      generated_at TEXT NOT NULL
    )
  `)

  // Indexes
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_brain_id ON leaves(brain_id)`,
  )
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_evidence_leaf_id ON evidence(leaf_id)`,
  )
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_leaf_id)`,
  )
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_leaf_id)`,
  )
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_chunks_asset_id ON chunks(asset_id)`,
  )
}
