import { answerQuestion, pickSynthesizer } from '@goatlab/delphi-agent'
import { extractAsset, pickExtractor } from '@goatlab/delphi-extraction'
import {
  ensureSeededRegions,
  generateIndexes,
  generateMaps,
  pickSummarizer,
} from '@goatlab/delphi-indexer'
import { ingestFile } from '@goatlab/delphi-ingestion'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import Fastify from 'fastify'
import { z } from 'zod'

const DEFAULT_REGIONS = ['General', 'Technology', 'Science', 'History']

const AssetsBodySchema = z.object({ path: z.string() })
const QuestionsBodySchema = z.object({ question: z.string() })

async function buildServer() {
  const fastify = Fastify({ logger: true })

  // ── Database ──────────────────────────────────────────────────────────────
  const dataDir = process.env.DATA_DIR
  const dbOpts = dataDir !== undefined ? { dataDir } : {}
  const db = await createDb(dbOpts)
  await migrate(db)
  const store = new BrainStore(db)

  // ── Brain setup ───────────────────────────────────────────────────────────
  const brain = await store.createBrain(
    'Delphi Brain',
    'The main knowledge brain',
  )
  const brainId = brain.id
  await ensureSeededRegions(store, brainId, DEFAULT_REGIONS)

  // ── Routes ────────────────────────────────────────────────────────────────

  // GET /health
  fastify.get('/health', async () => {
    const h = await store.health(brainId)
    return { ok: true, brainId, ...h }
  })

  // POST /assets  { path: string }
  fastify.post('/assets', async (request, reply) => {
    const parsed = AssetsBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'body must be { path: string }' })
    }
    const { path } = parsed.data

    const { asset, chunks, skipped } = await ingestFile(store, brainId, path)

    let extraction: Awaited<ReturnType<typeof extractAsset>> | null = null
    if (!skipped && chunks.length > 0) {
      const regions = await store.listRegions(brainId)
      const defaultRegion =
        regions.find(r => r.title === 'General') ?? regions[0]
      if (!defaultRegion) {
        return reply.status(500).send({ error: 'No regions found' })
      }
      extraction = await extractAsset(
        store,
        brainId,
        pickExtractor(),
        asset,
        chunks,
        { defaultRegionId: defaultRegion.id },
      )
      await generateIndexes(store, brainId, pickSummarizer(), {
        onlyStale: true,
      })
      await generateMaps(store, brainId)
    }

    return { asset, skipped, extraction }
  })

  // POST /questions  { question: string }
  fastify.post('/questions', async (request, reply) => {
    const parsed = QuestionsBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'body must be { question: string }' })
    }
    const { question } = parsed.data
    const result = await answerQuestion(
      store,
      brainId,
      question,
      pickSynthesizer(),
    )
    return result
  })

  // GET /leaves/:id
  fastify.get<{ Params: { id: string } }>(
    '/leaves/:id',
    async (request, reply) => {
      const { id } = request.params
      const leaf = await store.getLeaf(id)
      if (leaf === null) {
        return reply.status(404).send({ error: 'not found' })
      }
      const evidence = await store.listEvidenceWithContext(id)
      const relationships = await store.listRelationshipsForLeaf(id)
      return { leaf, evidence, relationships }
    },
  )

  // GET /search?q=
  fastify.get('/search', async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>).q
    if (!q) {
      return reply.status(400).send({ error: 'q query param is required' })
    }
    const results = await store.searchLeaves(brainId, q, 10)
    return { results }
  })

  // GET /indexes
  fastify.get('/indexes', async () => {
    const indexes = await store.listIndexes(brainId)
    return { indexes }
  })

  // GET /indexes/:regionTitle
  fastify.get<{ Params: { regionTitle: string } }>(
    '/indexes/:regionTitle',
    async (request, reply) => {
      const { regionTitle } = request.params
      const region = await store.getRegionByTitle(brainId, regionTitle)
      if (region === null) {
        return reply.status(404).send({ error: 'not found' })
      }
      const index = await store.getIndexByRegion(region.id)
      if (index === null) {
        return reply.status(404).send({ error: 'not found' })
      }
      return { region, index }
    },
  )

  // GET /maps
  fastify.get('/maps', async () => {
    const maps = await store.listMaps(brainId)
    return { maps }
  })

  return fastify
}

// Keep old alias for backward compatibility
const buildApp = buildServer

const isMain = process.argv[1]?.includes('server')
if (isMain) {
  const app = await buildServer()
  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Delphi API running on port ${port}`)
}

export { buildApp, buildServer }
