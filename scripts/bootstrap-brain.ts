// pnpm brain:bootstrap

import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractAsset, pickExtractor } from '@goatlab/delphi-extraction'
import {
  detectHubRegions,
  ensureSeededRegions,
  generateIndexes,
  generateMaps,
  pickSummarizer,
} from '@goatlab/delphi-indexer'
import { ingestFile } from '@goatlab/delphi-ingestion'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'

const SEEDED_REGIONS = [
  'Spec',
  'Knowledge Plane',
  'Execution Plane',
  'Decisions',
  'Operations',
] as const

const KNOWLEDGE_PLANE_PACKAGES = [
  'delphi-protocol',
  'delphi-knowledge',
  'delphi-ingestion',
  'delphi-extraction',
  'delphi-indexer',
  'delphi-agent',
]

export interface BootstrapResult {
  brainId: string
  health: {
    leaves: number
    beliefs: number
    evidence: number
    relationships: number
    orphanBeliefs: number
    avgConfidence: number
    staleIndexes: number
    openQuestions: number
  }
  created: number
  merged: number
  skippedAssets: number
}

export async function bootstrapBrain(opts: {
  dataDir: string
  repoRoot: string
  quiet?: boolean
}): Promise<BootstrapResult> {
  const { dataDir, repoRoot, quiet = false } = opts
  const log = quiet ? (_: string) => {} : (msg: string) => console.log(msg)

  // 1. Create DB, migrate, store
  await mkdir(dataDir, { recursive: true })
  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)

  // 2. Stable brain identity
  let brain = await store.getBrainByName('delphi')
  if (!brain) {
    brain = await store.createBrain(
      'delphi',
      'The Delphi Knowledge Operating System self-brain',
    )
    log(`[bootstrap] Created brain: ${brain.id}`)
  } else {
    log(`[bootstrap] Reusing existing brain: ${brain.id}`)
  }
  const brainId = brain.id

  // 3. Seed regions
  const regions = await ensureSeededRegions(store, brainId, [...SEEDED_REGIONS])
  const regionMap = new Map<string, string>()
  for (const r of regions) {
    regionMap.set(r.title, r.id)
  }
  log(`[bootstrap] Regions: ${regions.map(r => r.title).join(', ')}`)

  const extractor = pickExtractor()

  // 4a. rfcs/*.md → "Spec"
  const specRegionId = regionMap.get('Spec')!
  const rfcsDir = resolve(repoRoot, 'rfcs')
  let skippedAssets = 0
  let totalCreated = 0
  let totalMerged = 0

  if (existsSync(rfcsDir)) {
    const rfcFiles = (await readdir(rfcsDir))
      .filter(f => f.endsWith('.md'))
      .map(f => resolve(rfcsDir, f))

    log(`[bootstrap] Ingesting ${rfcFiles.length} RFC files → "Spec"`)
    for (const filePath of rfcFiles) {
      const result = await ingestFile(store, brainId, filePath)
      if (result.skipped) {
        skippedAssets++
        continue
      }
      if (result.asset && result.chunks.length > 0) {
        const r = await extractAsset(
          store,
          brainId,
          extractor,
          result.asset,
          result.chunks,
          { defaultRegionId: specRegionId },
        )
        totalCreated += r.created
        totalMerged += r.merged
      }
    }
  }

  // 4b. AGENTS.md + README.md → "Operations"
  const opsRegionId = regionMap.get('Operations')!
  const opsFiles = ['AGENTS.md', 'README.md']
    .map(f => resolve(repoRoot, f))
    .filter(existsSync)

  log(`[bootstrap] Ingesting ${opsFiles.length} ops files → "Operations"`)
  for (const filePath of opsFiles) {
    const result = await ingestFile(store, brainId, filePath)
    if (result.skipped) {
      skippedAssets++
      continue
    }
    if (result.asset && result.chunks.length > 0) {
      const r = await extractAsset(
        store,
        brainId,
        extractor,
        result.asset,
        result.chunks,
        { defaultRegionId: opsRegionId },
      )
      totalCreated += r.created
      totalMerged += r.merged
    }
  }

  // 4c. packages/*/README.md for knowledge-plane packages + apps/api → "Knowledge Plane"
  const kpRegionId = regionMap.get('Knowledge Plane')!
  const kpCandidates = [
    ...KNOWLEDGE_PLANE_PACKAGES.map(p =>
      resolve(repoRoot, 'packages', p, 'README.md'),
    ),
    resolve(repoRoot, 'apps', 'api', 'README.md'),
  ].filter(existsSync)

  log(
    `[bootstrap] Ingesting ${kpCandidates.length} knowledge-plane READMEs → "Knowledge Plane"`,
  )
  for (const filePath of kpCandidates) {
    const result = await ingestFile(store, brainId, filePath)
    if (result.skipped) {
      skippedAssets++
      continue
    }
    if (result.asset && result.chunks.length > 0) {
      const r = await extractAsset(
        store,
        brainId,
        extractor,
        result.asset,
        result.chunks,
        { defaultRegionId: kpRegionId },
      )
      totalCreated += r.created
      totalMerged += r.merged
    }
  }

  // 5. Hub detection, index generation, map generation
  log('[bootstrap] Detecting hub regions...')
  await detectHubRegions(store, brainId, { degreeThreshold: 6 })

  log('[bootstrap] Generating indexes (stale only)...')
  const summarizer = pickSummarizer()
  const indexes = await generateIndexes(store, brainId, summarizer, {
    onlyStale: true,
  })

  log('[bootstrap] Generating maps...')
  await generateMaps(store, brainId)

  // Print index summaries
  if (!quiet && indexes.length > 0) {
    log('\n[bootstrap] Index summaries:')
    for (const idx of indexes) {
      log(`  [${idx.title}] ${idx.summaryTiny}`)
    }
  }

  // Get health
  const health = await store.health(brainId)

  if (!quiet) {
    log('\n[bootstrap] Health:')
    log(`  leaves:        ${health.leaves}`)
    log(`  beliefs:       ${health.beliefs}`)
    log(`  evidence:      ${health.evidence}`)
    log(`  relationships: ${health.relationships}`)
    log(`  staleIndexes:  ${health.staleIndexes}`)
    log(`  openQuestions: ${health.openQuestions}`)
    log(
      `\n[bootstrap] Totals: created=${totalCreated} merged=${totalMerged} skippedAssets=${skippedAssets}`,
    )
  }

  await db.close()

  return {
    brainId,
    health,
    created: totalCreated,
    merged: totalMerged,
    skippedAssets,
  }
}

// Main guard
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrapBrain({
    dataDir: resolve(process.cwd(), '.delphi', 'brain'),
    repoRoot: process.cwd(),
  }).catch(e => {
    console.error(e)
    process.exit(1)
  })
}
