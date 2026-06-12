// pnpm mcp

import { answerQuestion, pickSynthesizer } from '@goatlab/delphi-agent'
import {
  canonicalize,
  pickExtractor,
  resolveCandidate,
} from '@goatlab/delphi-extraction'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import type { Asset, Chunk } from '@goatlab/delphi-protocol'
import { newId } from '@goatlab/delphi-protocol'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const DATA_DIR = process.env.DELPHI_DATA_DIR ?? '.delphi/brain'

async function main() {
  // Bootstrap DB
  const db = await createDb({ dataDir: DATA_DIR })
  await migrate(db)
  const store = new BrainStore(db)

  // Resolve brain by name
  const brain = await store.getBrainByName('delphi')
  if (!brain) {
    console.error(
      '[delphi-mcp] Brain "delphi" not found. Run `pnpm brain:bootstrap` first.',
    )
    process.exit(1)
  }
  const brainId = brain.id

  // Lazy synthetic asset for propose_knowledge
  let sessionAsset: Asset | null = null
  async function getSessionAsset(): Promise<Asset> {
    if (sessionAsset) {
      return sessionAsset
    }
    const checksum = newId('sess')
    sessionAsset = await store.createAsset({
      brainId,
      type: 'TEXT',
      title: 'agent-session',
      uri: 'mcp://session',
      checksum,
    })
    return sessionAsset
  }

  // Create the MCP server
  const server = new McpServer({
    name: 'delphi',
    version: '0.1.0',
  })

  // ── Tool: navigate_index ────────────────────────────────────────────────────
  server.registerTool(
    'navigate_index',
    {
      description:
        'Navigate the knowledge index. Without region: list all regions with tiny summaries. With region: return the full index for that region.',
      inputSchema: {
        region: z.string().optional().describe('Region title to navigate into'),
      },
    },
    async ({ region }) => {
      if (!region) {
        // Return all regions with their index summaries
        const regions = await store.listRegions(brainId)
        const leaves = await store.listLeaves(brainId)
        const result: Array<{
          id: string
          title: string
          kind: string
          leafCount: number
          tiny: string | undefined
          keyConcepts: string[] | undefined
          keyQuestions: string[] | undefined
        }> = []
        for (const r of regions) {
          const leafCount = leaves.filter(l => l.regionId === r.id).length
          const idx = leafCount > 0 ? await store.getIndexByRegion(r.id) : null
          result.push({
            id: r.id,
            title: r.title,
            kind: r.kind,
            leafCount,
            tiny: idx?.summaryTiny ?? undefined,
            keyConcepts: idx?.keyConcepts ?? undefined,
            keyQuestions: idx?.keyQuestions ?? undefined,
          })
        }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        }
      }

      // Full index for specified region
      const reg = await store.getRegionByTitle(brainId, region)
      if (!reg) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Region "${region}" not found` }),
            },
          ],
        }
      }
      const idx = await store.getIndexByRegion(reg.id)
      if (!idx) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `No index for region "${region}" yet`,
              }),
            },
          ],
        }
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(idx) }],
      }
    },
  )

  // ── Tool: search ────────────────────────────────────────────────────────────
  server.registerTool(
    'search',
    {
      description: 'Full-text search across all leaves in the brain.',
      inputSchema: {
        q: z.string().describe('Search query'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Max results (default 10)'),
      },
    },
    async ({ q, limit }) => {
      const leaves = await store.searchLeaves(brainId, q, limit ?? 10)
      const result = leaves.map(l => ({
        id: l.id,
        kind: l.kind,
        title: l.title,
        statement: l.statement,
        confidence: l.confidence?.value,
        regionId: l.regionId,
      }))
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      }
    },
  )

  // ── Tool: get_leaf ──────────────────────────────────────────────────────────
  server.registerTool(
    'get_leaf',
    {
      description: 'Get a leaf by id, including evidence and relationships.',
      inputSchema: {
        id: z.string().describe('Leaf id'),
      },
    },
    async ({ id }) => {
      const leaf = await store.getLeaf(id)
      if (!leaf) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: `Leaf ${id} not found` }),
            },
          ],
        }
      }
      const evidenceWithCtx = await store.listEvidenceWithContext(id)
      const relationships = await store.listRelationshipsForLeaf(id)
      const result = {
        leaf,
        evidence: evidenceWithCtx.map(e => ({
          id: e.evidence.id,
          relation: e.evidence.relation,
          strength: e.evidence.strength,
          citation: e.evidence.citation,
          assetTitle: e.assetTitle,
          chunkText: e.chunkText?.slice(0, 200),
        })),
        relationships: relationships.map(r => ({
          id: r.id,
          type: r.type,
          sourceLeafId: r.sourceLeafId,
          targetLeafId: r.targetLeafId,
          confidence: r.confidence,
        })),
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      }
    },
  )

  // ── Tool: trace_dependencies ────────────────────────────────────────────────
  server.registerTool(
    'trace_dependencies',
    {
      description:
        'Trace DEPENDS_ON edges from a leaf, transitively to the given depth.',
      inputSchema: {
        leafId: z.string().describe('Starting leaf id'),
        depth: z
          .union([z.literal(1), z.literal(2)])
          .optional()
          .describe('Traversal depth (1 or 2, default 2)'),
      },
    },
    async ({ leafId, depth = 2 }) => {
      const edges: Array<{
        from: string
        fromTitle: string
        to: string
        toTitle: string
      }> = []
      const visited = new Set<string>()
      const queue: Array<{ id: string; level: number }> = [
        { id: leafId, level: 0 },
      ]

      while (queue.length > 0) {
        const current = queue.shift()
        if (!current || current.level >= depth) {
          continue
        }
        if (visited.has(current.id)) {
          continue
        }
        visited.add(current.id)

        const rels = await store.listRelationshipsForLeaf(current.id)
        const deps = rels.filter(
          r => r.type === 'DEPENDS_ON' && r.sourceLeafId === current.id,
        )
        for (const dep of deps) {
          const fromLeaf = await store.getLeaf(dep.sourceLeafId)
          const toLeaf = await store.getLeaf(dep.targetLeafId)
          edges.push({
            from: dep.sourceLeafId,
            fromTitle: fromLeaf?.title ?? dep.sourceLeafId,
            to: dep.targetLeafId,
            toTitle: toLeaf?.title ?? dep.targetLeafId,
          })
          queue.push({ id: dep.targetLeafId, level: current.level + 1 })
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(edges) }],
      }
    },
  )

  // ── Tool: what_breaks_if ────────────────────────────────────────────────────
  server.registerTool(
    'what_breaks_if',
    {
      description:
        'Reverse dependency traversal: find all leaves that transitively depend on this leaf, plus any related DECISION leaves.',
      inputSchema: {
        leafId: z.string().describe('Leaf id to analyze impact of'),
      },
    },
    async ({ leafId }) => {
      // BFS reverse: find leaves whose DEPENDS_ON chain leads to this leaf
      const impacted: Array<{
        id: string
        title: string
        kind: string
        hops: number
      }> = []
      const visited = new Set<string>([leafId])
      const queue: Array<{ id: string; hops: number }> = [
        { id: leafId, hops: 0 },
      ]

      while (queue.length > 0) {
        const current = queue.shift()
        if (!current) {
          continue
        }

        const rels = await store.listRelationshipsForLeaf(current.id)
        const incoming = rels.filter(
          r => r.type === 'DEPENDS_ON' && r.targetLeafId === current.id,
        )
        for (const rel of incoming) {
          if (!visited.has(rel.sourceLeafId)) {
            visited.add(rel.sourceLeafId)
            const leaf = await store.getLeaf(rel.sourceLeafId)
            if (leaf) {
              impacted.push({
                id: leaf.id,
                title: leaf.title,
                kind: leaf.kind,
                hops: current.hops + 1,
              })
              queue.push({ id: leaf.id, hops: current.hops + 1 })
            }
          }
        }
      }

      // Also gather DECISION leaves related to any impacted leaf
      const allDecisions = await store.listLeaves(brainId, { kind: 'DECISION' })
      const impactedIds = new Set(impacted.map(i => i.id))
      impactedIds.add(leafId)

      for (const decision of allDecisions) {
        if (!impactedIds.has(decision.id)) {
          const decRels = await store.listRelationshipsForLeaf(decision.id)
          const related = decRels.some(
            r =>
              impactedIds.has(r.sourceLeafId) ||
              impactedIds.has(r.targetLeafId),
          )
          if (related) {
            impacted.push({
              id: decision.id,
              title: decision.title,
              kind: decision.kind,
              hops: 99,
            })
          }
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(impacted) }],
      }
    },
  )

  // ── Tool: ask ───────────────────────────────────────────────────────────────
  server.registerTool(
    'ask',
    {
      description: 'Answer a question using the Delphi knowledge brain.',
      inputSchema: {
        question: z.string().describe('The question to answer'),
      },
    },
    async ({ question }) => {
      const synthesizer = pickSynthesizer()
      const result = await answerQuestion(store, brainId, question, synthesizer)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      }
    },
  )

  // ── Tool: propose_knowledge ─────────────────────────────────────────────────
  server.registerTool(
    'propose_knowledge',
    {
      description:
        'Propose new knowledge to the brain. For DECISION kind, creates a DECISION leaf directly. For OBJECT/BELIEF/QUESTION, runs through the full canonicalize+resolve pipeline.',
      inputSchema: {
        kind: z
          .enum(['BELIEF', 'QUESTION', 'OBJECT', 'DECISION'])
          .describe('Type of knowledge'),
        title: z.string().describe('Title of the knowledge'),
        statement: z.string().optional().describe('Statement or description'),
        rationale: z.string().optional().describe('Rationale or context'),
      },
    },
    async ({ kind, title, statement, rationale }) => {
      if (kind === 'DECISION') {
        // Direct DECISION leaf creation
        const decisionsRegion = await store.getRegionByTitle(
          brainId,
          'Decisions',
        )
        const regionId = decisionsRegion?.id

        const leaf = await store.createLeaf({
          brainId,
          kind: 'DECISION',
          status: 'PROPOSED',
          title,
          statement: statement ?? undefined,
          aliases: [],
          tags: [],
          content: rationale ? { rationale } : undefined,
          regionId: regionId ?? undefined,
        })

        if (regionId) {
          await store.markRegionDirty(regionId)
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: leaf.id,
                kind: leaf.kind,
                title: leaf.title,
              }),
            },
          ],
        }
      }

      // For OBJECT | BELIEF | QUESTION: use canonicalize + resolveCandidate
      const candidateKind = kind as 'OBJECT' | 'BELIEF' | 'QUESTION'
      const asset = await getSessionAsset()

      // Create a synthetic chunk for this proposal
      const chunkText = statement ?? rationale ?? title
      const [chunk] = await store.createChunks([
        {
          assetId: asset.id,
          ordinal: Date.now(),
          text: chunkText,
        } satisfies Omit<Chunk, 'id'>,
      ])

      if (!chunk) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: 'Failed to create chunk' }),
            },
          ],
        }
      }

      const specRegion = await store.getRegionByTitle(brainId, 'Spec')
      const defaultRegion = await store.getRegionByTitle(brainId, 'Operations')
      const defaultRegionId =
        specRegion?.id ??
        defaultRegion?.id ??
        (await store.listRegions(brainId))[0]?.id

      if (!defaultRegionId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'No regions found. Run bootstrap first.',
              }),
            },
          ],
        }
      }

      const raw = {
        id: newId('cand'),
        kind: candidateKind,
        title,
        statement: statement ?? undefined,
        aliases: [] as string[],
        extractionConfidence: 0.8,
        assetId: asset.id,
        chunkId: chunk.id,
        sourceText: chunkText,
      }

      const candidate = canonicalize(raw)
      const extractor = pickExtractor()
      void extractor // not used directly; canonicalize+resolve is the path

      const resolution = await resolveCandidate(store, brainId, candidate, {
        defaultRegionId,
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(resolution),
          },
        ],
      }
    },
  )

  // Start server
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(e => {
  console.error('[delphi-mcp] Fatal:', e)
  process.exit(1)
})
