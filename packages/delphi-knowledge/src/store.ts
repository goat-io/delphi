import {
  type Asset,
  AssetSchema,
  type Brain,
  BrainSchema,
  type Chunk,
  ChunkSchema,
  type EvidenceRef,
  EvidenceRefSchema,
  type KnowledgeIndex,
  KnowledgeIndexSchema,
  type KnowledgeMap,
  KnowledgeMapSchema,
  type Leaf,
  type LeafEvent,
  LeafEventSchema,
  type LeafKind,
  LeafSchema,
  newId,
  nowIso,
  type Region,
  RegionSchema,
  type Relationship,
  RelationshipSchema,
} from '@goatlab/delphi-protocol'
import type { Db } from './db'

function j(v: unknown): unknown {
  return typeof v === 'string' ? JSON.parse(v) : v
}

// Convert null to undefined for optional fields
function n2u<T>(v: T | null | undefined): T | undefined {
  return v == null ? undefined : v
}

function mapBrain(row: Record<string, unknown>): Brain {
  return BrainSchema.parse({
    id: row.id,
    name: row.name,
    description: n2u(row.description),
    createdAt: row.created_at,
  })
}

function mapAsset(row: Record<string, unknown>): Asset {
  return AssetSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    type: row.type,
    title: row.title,
    uri: row.uri,
    checksum: row.checksum,
    metadata:
      row.metadata != null
        ? (j(row.metadata) as Record<string, unknown>)
        : undefined,
    createdAt: row.created_at,
  })
}

function mapChunk(row: Record<string, unknown>): Chunk {
  return ChunkSchema.parse({
    id: row.id,
    assetId: row.asset_id,
    ordinal: row.ordinal,
    text: row.text,
    location:
      row.location != null
        ? (j(row.location) as {
            section?: string
            page?: number
            timestamp?: string
          })
        : undefined,
  })
}

function mapLeaf(row: Record<string, unknown>): Leaf {
  return LeafSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    summary: n2u(row.summary as string | null),
    statement: n2u(row.statement as string | null),
    aliases: j(row.aliases),
    tags: j(row.tags),
    confidence:
      row.confidence != null
        ? (j(row.confidence) as Record<string, unknown>)
        : undefined,
    regionId: n2u(row.region_id as string | null),
    content:
      row.content != null
        ? (j(row.content) as Record<string, unknown>)
        : undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function mapRelationship(row: Record<string, unknown>): Relationship {
  return RelationshipSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    sourceLeafId: row.source_leaf_id,
    targetLeafId: row.target_leaf_id,
    type: row.type,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    metadata:
      row.metadata != null
        ? (j(row.metadata) as Record<string, unknown>)
        : undefined,
    createdAt: row.created_at,
  })
}

function mapEvidence(row: Record<string, unknown>): EvidenceRef {
  return EvidenceRefSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    leafId: row.leaf_id,
    assetId: row.asset_id,
    chunkId: n2u(row.chunk_id as string | null),
    citation: n2u(row.citation as string | null),
    relation: row.relation,
    strength: row.strength,
    extractionConfidence: row.extraction_confidence,
    createdAt: row.created_at,
  })
}

function mapRegion(row: Record<string, unknown>): Region {
  return RegionSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    title: row.title,
    kind: row.kind,
    anchorLeafId: n2u(row.anchor_leaf_id as string | null),
    createdAt: row.created_at,
  })
}

function mapIndex(row: Record<string, unknown>): KnowledgeIndex {
  return KnowledgeIndexSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    regionId: row.region_id,
    title: row.title,
    summaryTiny: row.summary_tiny,
    summaryShort: row.summary_short,
    summaryMedium: row.summary_medium,
    summaryLong: row.summary_long,
    keyConcepts: j(row.key_concepts),
    keyBeliefs: j(row.key_beliefs),
    keyQuestions: j(row.key_questions),
    representativeLeafIds: j(row.representative_leaf_ids),
    stale: row.stale,
    changedLeafCount: row.changed_leaf_count,
    generatedAt: row.generated_at,
  })
}

function mapKnowledgeMap(row: Record<string, unknown>): KnowledgeMap {
  return KnowledgeMapSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    title: row.title,
    routes: j(row.routes),
    generatedAt: row.generated_at,
  })
}

function mapLeafEvent(row: Record<string, unknown>): LeafEvent {
  return LeafEventSchema.parse({
    id: row.id,
    brainId: row.brain_id,
    leafId: row.leaf_id,
    type: row.type,
    payload: j(row.payload),
    createdAt: row.created_at,
  })
}

export class BrainStore {
  constructor(public readonly db: Db) {}

  // ── Brain ──────────────────────────────────────────────────────────────────

  async createBrain(name: string, description?: string): Promise<Brain> {
    const id = newId('brain')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO brains(id, name, description, created_at) VALUES($1, $2, $3, $4)`,
      [id, name, description ?? null, now],
    )
    return mapBrain({
      id,
      name,
      description: description ?? null,
      created_at: now,
    } as Record<string, unknown>)
  }

  async getBrain(id: string): Promise<Brain | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM brains WHERE id = $1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapBrain(row)
  }

  // ── Asset ──────────────────────────────────────────────────────────────────

  async createAsset(a: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
    const id = newId('asset')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO assets(id, brain_id, type, title, uri, checksum, metadata, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        id,
        a.brainId,
        a.type,
        a.title,
        a.uri,
        a.checksum,
        a.metadata !== undefined ? JSON.stringify(a.metadata) : null,
        now,
      ],
    )
    return mapAsset({
      id,
      brain_id: a.brainId,
      type: a.type,
      title: a.title,
      uri: a.uri,
      checksum: a.checksum,
      metadata: a.metadata !== undefined ? a.metadata : null,
      created_at: now,
    })
  }

  async findAssetByChecksum(
    brainId: string,
    checksum: string,
  ): Promise<Asset | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM assets WHERE brain_id = $1 AND checksum = $2 LIMIT 1`,
      [brainId, checksum],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapAsset(row)
  }

  async getAsset(id: string): Promise<Asset | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM assets WHERE id = $1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapAsset(row)
  }

  async listAssets(brainId: string): Promise<Asset[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM assets WHERE brain_id = $1 ORDER BY created_at`,
      [brainId],
    )
    return rows.map(mapAsset)
  }

  // ── Chunk ──────────────────────────────────────────────────────────────────

  async createChunks(chunks: Omit<Chunk, 'id'>[]): Promise<Chunk[]> {
    const result: Chunk[] = []
    for (const c of chunks) {
      const id = newId('chunk')
      await this.db.query(
        `INSERT INTO chunks(id, asset_id, ordinal, text, location)
         VALUES($1, $2, $3, $4, $5::jsonb)`,
        [
          id,
          c.assetId,
          c.ordinal,
          c.text,
          c.location !== undefined ? JSON.stringify(c.location) : null,
        ],
      )
      result.push(
        mapChunk({
          id,
          asset_id: c.assetId,
          ordinal: c.ordinal,
          text: c.text,
          location: c.location !== undefined ? c.location : null,
        }),
      )
    }
    return result
  }

  async getChunk(id: string): Promise<Chunk | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM chunks WHERE id = $1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapChunk(row)
  }

  async listChunksByAsset(assetId: string): Promise<Chunk[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM chunks WHERE asset_id = $1 ORDER BY ordinal`,
      [assetId],
    )
    return rows.map(mapChunk)
  }

  // ── Leaf ───────────────────────────────────────────────────────────────────

  async createLeaf(
    l: Omit<Leaf, 'id' | 'version' | 'createdAt' | 'updatedAt'>,
  ): Promise<Leaf> {
    const id = newId('leaf')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO leaves(id, brain_id, kind, status, title, summary, statement, aliases, tags, confidence, region_id, content, version, created_at, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12::jsonb, 1, $13, $14)`,
      [
        id,
        l.brainId,
        l.kind,
        l.status,
        l.title,
        l.summary ?? null,
        l.statement ?? null,
        JSON.stringify(l.aliases ?? []),
        JSON.stringify(l.tags ?? []),
        l.confidence !== undefined ? JSON.stringify(l.confidence) : null,
        l.regionId ?? null,
        l.content !== undefined ? JSON.stringify(l.content) : null,
        now,
        now,
      ],
    )

    // Append LEAF_CREATED event
    await this._appendEvent(id, l.brainId, 'LEAF_CREATED', {
      title: l.title,
      kind: l.kind,
    })

    return mapLeaf({
      id,
      brain_id: l.brainId,
      kind: l.kind,
      status: l.status,
      title: l.title,
      summary: l.summary ?? null,
      statement: l.statement ?? null,
      aliases: l.aliases ?? [],
      tags: l.tags ?? [],
      confidence: l.confidence !== undefined ? l.confidence : null,
      region_id: l.regionId ?? null,
      content: l.content !== undefined ? l.content : null,
      version: 1,
      created_at: now,
      updated_at: now,
    })
  }

  async getLeaf(id: string): Promise<Leaf | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE id = $1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapLeaf(row)
  }

  async updateLeaf(
    id: string,
    patch: Partial<
      Pick<
        Leaf,
        | 'summary'
        | 'statement'
        | 'aliases'
        | 'tags'
        | 'confidence'
        | 'status'
        | 'regionId'
        | 'content'
      >
    >,
  ): Promise<Leaf> {
    const now = nowIso()
    const sets: string[] = ['updated_at = $1', 'version = version + 1']
    const params: unknown[] = [now]

    if ('summary' in patch) {
      params.push(patch.summary ?? null)
      sets.push(`summary = $${params.length}`)
    }
    if ('statement' in patch) {
      params.push(patch.statement ?? null)
      sets.push(`statement = $${params.length}`)
    }
    if ('aliases' in patch) {
      params.push(JSON.stringify(patch.aliases))
      sets.push(`aliases = $${params.length}::jsonb`)
    }
    if ('tags' in patch) {
      params.push(JSON.stringify(patch.tags))
      sets.push(`tags = $${params.length}::jsonb`)
    }
    if ('confidence' in patch) {
      params.push(
        patch.confidence !== undefined
          ? JSON.stringify(patch.confidence)
          : null,
      )
      sets.push(`confidence = $${params.length}::jsonb`)
    }
    if ('status' in patch) {
      params.push(patch.status)
      sets.push(`status = $${params.length}`)
    }
    if ('regionId' in patch) {
      params.push(patch.regionId ?? null)
      sets.push(`region_id = $${params.length}`)
    }
    if ('content' in patch) {
      params.push(
        patch.content !== undefined ? JSON.stringify(patch.content) : null,
      )
      sets.push(`content = $${params.length}::jsonb`)
    }

    params.push(id)
    const idParam = `$${params.length}`

    await this.db.query(
      `UPDATE leaves SET ${sets.join(', ')} WHERE id = ${idParam}`,
      params,
    )

    // Fetch updated leaf for brainId
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE id = $1`,
      [id],
    )
    const row = rows[0]
    if (!row) {
      throw new Error(`Leaf ${id} not found after update`)
    }

    const leaf = mapLeaf(row)

    // Append LEAF_UPDATED event
    await this._appendEvent(id, leaf.brainId, 'LEAF_UPDATED', {
      changed: Object.keys(patch),
    })

    return leaf
  }

  async listLeaves(
    brainId: string,
    opts?: { kind?: LeafKind },
  ): Promise<Leaf[]> {
    if (opts?.kind) {
      const { rows } = await this.db.query<Record<string, unknown>>(
        `SELECT * FROM leaves WHERE brain_id = $1 AND kind = $2 ORDER BY created_at`,
        [brainId, opts.kind],
      )
      return rows.map(mapLeaf)
    }
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE brain_id = $1 ORDER BY created_at`,
      [brainId],
    )
    return rows.map(mapLeaf)
  }

  async findLeafByTitleOrAlias(
    brainId: string,
    text: string,
  ): Promise<Leaf | null> {
    // Try title match first
    const { rows: byTitle } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE brain_id = $1 AND lower(title) = lower($2) LIMIT 1`,
      [brainId, text],
    )
    if (byTitle[0]) {
      return mapLeaf(byTitle[0])
    }

    // Fallback: fetch all and check aliases in JS
    const { rows: all } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE brain_id = $1`,
      [brainId],
    )
    const lower = text.toLowerCase()
    for (const row of all) {
      const aliases = j(row.aliases) as string[]
      if (aliases.some(a => a.toLowerCase() === lower)) {
        return mapLeaf(row)
      }
    }
    return null
  }

  async searchLeaves(
    brainId: string,
    query: string,
    limit = 10,
  ): Promise<Leaf[]> {
    // Try Postgres FTS
    try {
      const { rows } = await this.db.query<Record<string, unknown>>(
        `SELECT *, ts_rank(to_tsvector('english', title || ' ' || coalesce(summary,'') || ' ' || coalesce(statement,'')), plainto_tsquery('english', $2)) AS _rank
         FROM leaves
         WHERE brain_id = $1
           AND to_tsvector('english', title || ' ' || coalesce(summary,'') || ' ' || coalesce(statement,'')) @@ plainto_tsquery('english', $2)
         ORDER BY _rank DESC
         LIMIT $3`,
        [brainId, query, limit],
      )
      if (rows.length > 0) {
        return rows.map(mapLeaf)
      }
    } catch {
      // FTS not available, fall through
    }

    // Fallback: ILIKE any word > 3 chars
    const words = query
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.toLowerCase())

    if (words.length === 0) {
      return []
    }

    const conditions = words
      .map(
        (_, i) =>
          `(lower(title) LIKE $${i + 2} OR lower(coalesce(statement,'')) LIKE $${i + 2})`,
      )
      .join(' OR ')
    const params: unknown[] = [brainId, ...words.map(w => `%${w}%`), limit]

    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaves WHERE brain_id = $1 AND (${conditions}) ORDER BY length(title) LIMIT $${params.length}`,
      params,
    )
    return rows.map(mapLeaf)
  }

  // ── Evidence ───────────────────────────────────────────────────────────────

  async createEvidence(
    e: Omit<EvidenceRef, 'id' | 'createdAt'>,
  ): Promise<EvidenceRef> {
    const id = newId('evd')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO evidence(id, brain_id, leaf_id, asset_id, chunk_id, citation, relation, strength, extraction_confidence, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        e.brainId,
        e.leafId,
        e.assetId,
        e.chunkId ?? null,
        e.citation ?? null,
        e.relation,
        e.strength,
        e.extractionConfidence,
        now,
      ],
    )

    await this._appendEvent(e.leafId, e.brainId, 'EVIDENCE_ADDED', {
      assetId: e.assetId,
    })

    return mapEvidence({
      id,
      brain_id: e.brainId,
      leaf_id: e.leafId,
      asset_id: e.assetId,
      chunk_id: e.chunkId ?? null,
      citation: e.citation ?? null,
      relation: e.relation,
      strength: e.strength,
      extraction_confidence: e.extractionConfidence,
      created_at: now,
    })
  }

  async listEvidenceByLeaf(leafId: string): Promise<EvidenceRef[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM evidence WHERE leaf_id = $1 ORDER BY created_at`,
      [leafId],
    )
    return rows.map(mapEvidence)
  }

  async evidenceStats(leafId: string): Promise<{
    count: number
    distinctAssets: number
    avgStrength: number
    avgExtraction: number
  }> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT
         count(*)::int AS count,
         count(DISTINCT asset_id)::int AS distinct_assets,
         coalesce(avg(strength), 0)::float AS avg_strength,
         coalesce(avg(extraction_confidence), 0)::float AS avg_extraction
       FROM evidence
       WHERE leaf_id = $1`,
      [leafId],
    )
    const row = rows[0]
    if (!row) {
      return { count: 0, distinctAssets: 0, avgStrength: 0, avgExtraction: 0 }
    }
    return {
      count: Number(row.count ?? 0),
      distinctAssets: Number(row.distinct_assets ?? 0),
      avgStrength: Number(row.avg_strength ?? 0),
      avgExtraction: Number(row.avg_extraction ?? 0),
    }
  }

  async listEvidenceWithContext(leafId: string): Promise<
    Array<{
      evidence: EvidenceRef
      assetTitle: string
      chunkText: string | null
    }>
  > {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT e.*,
              a.title AS asset_title,
              c.text AS chunk_text
       FROM evidence e
       LEFT JOIN assets a ON a.id = e.asset_id
       LEFT JOIN chunks c ON c.id = e.chunk_id
       WHERE e.leaf_id = $1
       ORDER BY e.created_at`,
      [leafId],
    )

    return rows.map(row => ({
      evidence: mapEvidence(row),
      assetTitle: String(row.asset_title ?? ''),
      chunkText: row.chunk_text != null ? String(row.chunk_text) : null,
    }))
  }

  // ── Relationship ───────────────────────────────────────────────────────────

  async createRelationship(
    r: Omit<Relationship, 'id' | 'createdAt'>,
  ): Promise<Relationship> {
    const id = newId('rel')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO relationships(id, brain_id, source_leaf_id, target_leaf_id, type, confidence, metadata, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT (source_leaf_id, target_leaf_id, type) DO NOTHING`,
      [
        id,
        r.brainId,
        r.sourceLeafId,
        r.targetLeafId,
        r.type,
        r.confidence ?? null,
        r.metadata !== undefined ? JSON.stringify(r.metadata) : null,
        now,
      ],
    )

    // Select the actual row (might be the pre-existing one)
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM relationships WHERE source_leaf_id = $1 AND target_leaf_id = $2 AND type = $3`,
      [r.sourceLeafId, r.targetLeafId, r.type],
    )
    const row = rows[0]
    if (!row) {
      throw new Error('Relationship not found after insert')
    }
    return mapRelationship(row)
  }

  async listRelationships(brainId: string): Promise<Relationship[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM relationships WHERE brain_id = $1 ORDER BY created_at`,
      [brainId],
    )
    return rows.map(mapRelationship)
  }

  async listRelationshipsForLeaf(leafId: string): Promise<Relationship[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM relationships WHERE source_leaf_id = $1 OR target_leaf_id = $1 ORDER BY created_at`,
      [leafId],
    )
    return rows.map(mapRelationship)
  }

  async leafDegree(leafId: string): Promise<number> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS degree FROM relationships WHERE source_leaf_id = $1 OR target_leaf_id = $1`,
      [leafId],
    )
    const row = rows[0]
    return Number(row?.degree ?? 0)
  }

  // ── Region ─────────────────────────────────────────────────────────────────

  async createRegion(
    brainId: string,
    title: string,
    kind: 'SEEDED' | 'HUB',
    anchorLeafId?: string,
  ): Promise<Region> {
    const id = newId('region')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO regions(id, brain_id, title, kind, anchor_leaf_id, created_at)
       VALUES($1, $2, $3, $4, $5, $6)
       ON CONFLICT (brain_id, title) DO NOTHING`,
      [id, brainId, title, kind, anchorLeafId ?? null, now],
    )

    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM regions WHERE brain_id = $1 AND title = $2`,
      [brainId, title],
    )
    const row = rows[0]
    if (!row) {
      throw new Error('Region not found after insert')
    }
    return mapRegion(row)
  }

  async listRegions(brainId: string): Promise<Region[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM regions WHERE brain_id = $1 ORDER BY created_at`,
      [brainId],
    )
    return rows.map(mapRegion)
  }

  async getRegionByTitle(
    brainId: string,
    title: string,
  ): Promise<Region | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM regions WHERE brain_id = $1 AND title = $2 LIMIT 1`,
      [brainId, title],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapRegion(row)
  }

  async assignLeafRegion(leafId: string, regionId: string): Promise<void> {
    await this.db.query(`UPDATE leaves SET region_id = $1 WHERE id = $2`, [
      regionId,
      leafId,
    ])
  }

  // ── Index ──────────────────────────────────────────────────────────────────

  async upsertIndex(
    idx: Omit<KnowledgeIndex, 'id' | 'generatedAt'>,
  ): Promise<KnowledgeIndex> {
    const id = newId('idx')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO indexes(id, brain_id, region_id, title, summary_tiny, summary_short, summary_medium, summary_long, key_concepts, key_beliefs, key_questions, representative_leaf_ids, stale, changed_leaf_count, generated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, false, 0, $13)
       ON CONFLICT (region_id) DO UPDATE SET
         title = EXCLUDED.title,
         summary_tiny = EXCLUDED.summary_tiny,
         summary_short = EXCLUDED.summary_short,
         summary_medium = EXCLUDED.summary_medium,
         summary_long = EXCLUDED.summary_long,
         key_concepts = EXCLUDED.key_concepts,
         key_beliefs = EXCLUDED.key_beliefs,
         key_questions = EXCLUDED.key_questions,
         representative_leaf_ids = EXCLUDED.representative_leaf_ids,
         stale = false,
         changed_leaf_count = 0,
         generated_at = EXCLUDED.generated_at`,
      [
        id,
        idx.brainId,
        idx.regionId,
        idx.title,
        idx.summaryTiny,
        idx.summaryShort,
        idx.summaryMedium,
        idx.summaryLong,
        JSON.stringify(idx.keyConcepts),
        JSON.stringify(idx.keyBeliefs),
        JSON.stringify(idx.keyQuestions),
        JSON.stringify(idx.representativeLeafIds),
        now,
      ],
    )

    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM indexes WHERE region_id = $1`,
      [idx.regionId],
    )
    const row = rows[0]
    if (!row) {
      throw new Error('Index not found after upsert')
    }
    return mapIndex(row)
  }

  async getIndexByRegion(regionId: string): Promise<KnowledgeIndex | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM indexes WHERE region_id = $1 LIMIT 1`,
      [regionId],
    )
    const row = rows[0]
    if (!row) {
      return null
    }
    return mapIndex(row)
  }

  async listIndexes(brainId: string): Promise<KnowledgeIndex[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM indexes WHERE brain_id = $1 ORDER BY generated_at`,
      [brainId],
    )
    return rows.map(mapIndex)
  }

  async markRegionDirty(regionId: string): Promise<void> {
    await this.db.query(
      `UPDATE indexes SET stale = true, changed_leaf_count = changed_leaf_count + 1 WHERE region_id = $1`,
      [regionId],
    )
  }

  // ── Map ────────────────────────────────────────────────────────────────────

  async saveMap(
    m: Omit<KnowledgeMap, 'id' | 'generatedAt'>,
  ): Promise<KnowledgeMap> {
    const id = newId('map')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO maps(id, brain_id, title, routes, generated_at)
       VALUES($1, $2, $3, $4::jsonb, $5)`,
      [id, m.brainId, m.title, JSON.stringify(m.routes), now],
    )
    return mapKnowledgeMap({
      id,
      brain_id: m.brainId,
      title: m.title,
      routes: m.routes,
      generated_at: now,
    })
  }

  async listMaps(brainId: string): Promise<KnowledgeMap[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM maps WHERE brain_id = $1 ORDER BY generated_at`,
      [brainId],
    )
    return rows.map(mapKnowledgeMap)
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  async listEventsByLeaf(leafId: string): Promise<LeafEvent[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM leaf_events WHERE leaf_id = $1 ORDER BY created_at`,
      [leafId],
    )
    return rows.map(mapLeafEvent)
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  async health(brainId: string): Promise<{
    leaves: number
    beliefs: number
    evidence: number
    relationships: number
    orphanBeliefs: number
    avgConfidence: number
    staleIndexes: number
    openQuestions: number
  }> {
    const { rows: lRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS leaves,
              count(*) FILTER (WHERE kind = 'BELIEF')::int AS beliefs
       FROM leaves WHERE brain_id = $1`,
      [brainId],
    )
    const lRow = lRows[0] ?? {}

    const { rows: eRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS evidence FROM evidence WHERE brain_id = $1`,
      [brainId],
    )
    const eRow = eRows[0] ?? {}

    const { rows: rRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS relationships FROM relationships WHERE brain_id = $1`,
      [brainId],
    )
    const rRow = rRows[0] ?? {}

    // Orphan beliefs: BELIEF leaves with zero evidence rows
    const { rows: oRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS orphan_beliefs
       FROM leaves l
       WHERE l.brain_id = $1
         AND l.kind = 'BELIEF'
         AND NOT EXISTS (SELECT 1 FROM evidence e WHERE e.leaf_id = l.id)`,
      [brainId],
    )
    const oRow = oRows[0] ?? {}

    // Avg confidence
    const { rows: cRows } = await this.db.query<Record<string, unknown>>(
      `SELECT coalesce(avg((confidence->>'value')::float), 0)::float AS avg_conf
       FROM leaves WHERE brain_id = $1 AND confidence IS NOT NULL`,
      [brainId],
    )
    const cRow = cRows[0] ?? {}

    const { rows: sRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS stale_indexes FROM indexes WHERE brain_id = $1 AND stale = true`,
      [brainId],
    )
    const sRow = sRows[0] ?? {}

    const { rows: qRows } = await this.db.query<Record<string, unknown>>(
      `SELECT count(*)::int AS open_questions
       FROM leaves WHERE brain_id = $1 AND kind = 'QUESTION' AND status != 'ARCHIVED'`,
      [brainId],
    )
    const qRow = qRows[0] ?? {}

    return {
      leaves: Number(lRow.leaves ?? 0),
      beliefs: Number(lRow.beliefs ?? 0),
      evidence: Number(eRow.evidence ?? 0),
      relationships: Number(rRow.relationships ?? 0),
      orphanBeliefs: Number(oRow.orphan_beliefs ?? 0),
      avgConfidence: Number(cRow.avg_conf ?? 0),
      staleIndexes: Number(sRow.stale_indexes ?? 0),
      openQuestions: Number(qRow.open_questions ?? 0),
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _appendEvent(
    leafId: string,
    brainId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const id = newId('evt')
    const now = nowIso()
    await this.db.query(
      `INSERT INTO leaf_events(id, brain_id, leaf_id, type, payload, created_at)
       VALUES($1, $2, $3, $4, $5::jsonb, $6)`,
      [id, brainId, leafId, type, JSON.stringify(payload), now],
    )
  }
}
