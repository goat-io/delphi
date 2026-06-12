// pnpm demo

import { resolve } from 'node:path'
import { answerQuestion, pickSynthesizer } from '@goatlab/delphi-agent'
import { extractAsset, pickExtractor } from '@goatlab/delphi-extraction'
import {
  detectHubRegions,
  ensureSeededRegions,
  generateIndexes,
  generateMaps,
  pickSummarizer,
} from '@goatlab/delphi-indexer'
import { ingestDirectory } from '@goatlab/delphi-ingestion'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'

const EXAMPLES_DIR = resolve(process.cwd(), 'examples', 'tigerbeetle')

async function main() {
  const db = await createDb()
  await migrate(db)
  const store = new BrainStore(db)

  // ── PHASE 1: SETUP ─────────────────────────────────────────────────────────
  console.log('\n=== PHASE 1: SETUP ===')
  const brain = await store.createBrain('delphi-demo')
  const brainId = brain.id
  await ensureSeededRegions(store, brainId, ['Databases'])
  const region = await store.getRegionByTitle(brainId, 'Databases')
  if (!region) {
    throw new Error("Region 'Databases' not found after seeding")
  }
  console.log(`Brain: ${brainId}`)
  console.log(`Region: ${region.title} (${region.id})`)

  // ── PHASE 2: INGEST ────────────────────────────────────────────────────────
  console.log('\n=== PHASE 2: INGEST ===')
  const ingestResult = await ingestDirectory(store, brainId, EXAMPLES_DIR)
  const { assets, chunks, skipped } = ingestResult
  console.log(
    `Assets: ${assets.length}, Chunks: ${chunks.length}, Skipped: ${skipped}`,
  )

  // ── PHASE 3: EXTRACT ───────────────────────────────────────────────────────
  console.log('\n=== PHASE 3: EXTRACT ===')
  const extractor = pickExtractor()
  let totalCandidates = 0
  let totalCreated = 0
  let totalMerged = 0
  let totalLinked = 0
  let totalFlagged = 0
  for (const asset of assets) {
    const assetChunks = chunks.filter(c => c.assetId === asset.id)
    if (assetChunks.length === 0) {
      continue
    }
    const r = await extractAsset(
      store,
      brainId,
      extractor,
      asset,
      assetChunks,
      {
        defaultRegionId: region.id,
      },
    )
    totalCandidates += r.candidates
    totalCreated += r.created
    totalMerged += r.merged
    totalLinked += r.linked
    totalFlagged += r.flagged
  }
  console.log(
    `Candidates: ${totalCandidates}, Created: ${totalCreated}, Merged: ${totalMerged}, Linked: ${totalLinked}, Flagged: ${totalFlagged}`,
  )

  // ── PHASE 4: CURATE ────────────────────────────────────────────────────────
  console.log('\n=== PHASE 4: CURATE ===')
  const allLeaves = await store.searchLeaves(
    brainId,
    'deterministic execution simulation testing strict serializability',
    20,
  )
  const detLeaf = allLeaves.find(
    l =>
      l.statement?.toLowerCase().includes('deterministic execution') ??
      l.title.toLowerCase().includes('deterministic execution'),
  )
  const simLeaf = allLeaves.find(
    l =>
      l.statement?.toLowerCase().includes('simulation testing') ??
      l.title.toLowerCase().includes('simulation testing'),
  )
  const serLeaf = allLeaves.find(
    l =>
      l.statement?.toLowerCase().includes('strict serializability') ??
      l.title.toLowerCase().includes('strict serializability'),
  )
  if (simLeaf && detLeaf) {
    await store.createRelationship({
      brainId,
      sourceLeafId: simLeaf.id,
      targetLeafId: detLeaf.id,
      type: 'DEPENDS_ON',
    })
    console.log(`Edge: ${simLeaf.title} DEPENDS_ON ${detLeaf.title}`)
  }
  if (serLeaf && detLeaf) {
    await store.createRelationship({
      brainId,
      sourceLeafId: serLeaf.id,
      targetLeafId: detLeaf.id,
      type: 'DEPENDS_ON',
    })
    console.log(`Edge: ${serLeaf.title} DEPENDS_ON ${detLeaf.title}`)
  }
  if (!simLeaf && !serLeaf) {
    console.log('No relevant beliefs found for curation (skipped)')
  }

  // ── PHASE 5: RE-INGEST IDEMPOTENCY ────────────────────────────────────────
  console.log('\n=== PHASE 5: RE-INGEST IDEMPOTENCY ===')
  const reIngest = await ingestDirectory(store, brainId, EXAMPLES_DIR)
  const newAssets = reIngest.assets.length - reIngest.skipped
  console.log(
    `Skipped: ${reIngest.skipped}, New assets: ${newAssets}, New chunks: ${reIngest.chunks.length}`,
  )
  if (newAssets > 0) {
    throw new Error(
      `Re-ingest created ${newAssets} new assets — not idempotent!`,
    )
  }

  // ── PHASE 6: INDEX ─────────────────────────────────────────────────────────
  console.log('\n=== PHASE 6: INDEX ===')
  await detectHubRegions(store, brainId, { degreeThreshold: 4 })
  const indexes = await generateIndexes(store, brainId, pickSummarizer())
  for (const idx of indexes) {
    console.log(
      `Index: ${idx.title} | tiny: "${idx.summaryTiny}" | stale: ${idx.stale}`,
    )
  }
  const map = await generateMaps(store, brainId)
  for (const route of map.routes) {
    console.log(`Route: "${route.title}" (${route.nodeLeafIds.length} nodes)`)
  }
  if (map.routes.length === 0) {
    console.log('Map generated (0 routes — no hub regions detected)')
  }

  // ── PHASE 7: ASK ──────────────────────────────────────────────────────────
  console.log('\n=== PHASE 7: ASK ===')
  const answer = await answerQuestion(
    store,
    brainId,
    'Why should I use TigerBeetle for a ledger?',
    pickSynthesizer(),
  )
  console.log(`ANSWER: ${answer.summary}`)
  console.log(`CONFIDENCE: ${answer.confidence}`)
  console.log(`NAVIGATION: ${answer.navigationPath.join(' → ')}`)
  console.log('BELIEFS:')
  for (const b of answer.beliefs) {
    console.log(
      `  [${b.confidence !== undefined ? b.confidence.toFixed(2) : '?'}] ${b.title}`,
    )
  }
  console.log('EVIDENCE:')
  for (const e of answer.evidence) {
    console.log(`  ${e.assetTitle}: "${e.citation ?? '(no citation)'}"`)
  }
  console.log('DEPENDENCIES:')
  if (answer.dependencies.length === 0) {
    console.log('  none')
  } else {
    for (const d of answer.dependencies) {
      const fromLeaf = await store.getLeaf(d.from)
      const toLeaf = await store.getLeaf(d.to)
      console.log(
        `  ${fromLeaf?.title ?? d.from} -> ${toLeaf?.title ?? d.to} (${d.type})`,
      )
    }
  }
  console.log('CONTRADICTIONS:')
  if (answer.contradictions.length === 0) {
    console.log('  none detected')
  } else {
    for (const c of answer.contradictions) {
      const aLeaf = await store.getLeaf(c.a)
      const bLeaf = await store.getLeaf(c.b)
      console.log(`  "${aLeaf?.title ?? c.a}" vs "${bLeaf?.title ?? c.b}"`)
    }
  }

  // ── CORPUS CONTRADICTIONS ─────────────────────────────────────────────────
  console.log('\nCORPUS CONTRADICTIONS:')
  const allRels = await store.listRelationships(brainId)
  const contradictRels = allRels.filter(r => r.type === 'CONTRADICTS')
  if (contradictRels.length === 0) {
    console.log('  none detected')
  } else {
    for (const rel of contradictRels) {
      const aLeaf = await store.getLeaf(rel.sourceLeafId)
      const bLeaf = await store.getLeaf(rel.targetLeafId)
      console.log(
        `  "${aLeaf?.title ?? rel.sourceLeafId}"  ⟂  "${bLeaf?.title ?? rel.targetLeafId}"`,
      )
    }
  }

  // ── PHASE 8: HEALTH ───────────────────────────────────────────────────────
  console.log('\n=== PHASE 8: HEALTH ===')
  const health = await store.health(brainId)
  console.log(JSON.stringify(health, null, 2))

  await db.close()
  console.log('\nDemo complete. Exit 0.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
