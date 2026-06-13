// scripts/evolution-state.ts — Producer-side snapshot of governance state.
//
// The evolution loop calls writeEvolutionState() at commit time (where it
// already holds an open connection to the brain) to emit brain/evolution-state.json.
// The dashboard reads ONLY that flat file — it never opens the live PGlite,
// so there is zero single-writer contention with the daemon.
//
// Standalone (writes one snapshot, e.g. to seed the dashboard before the next cycle):
//   pnpm tsx scripts/evolution-state.ts

import { resolve } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { assessCoverage, COVERAGE_TARGET } from './coverage.js'
import { evaluateGoals } from './goals.js'

export interface EvolutionStateFile {
  generatedAt: string
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
  coverageTarget: number
  coverage: Array<{
    regionId: string
    regionTitle: string
    score: number
    gaps: string[]
  }>
  goals: Array<{
    title: string
    metric: string
    current: number
    target: number
    comparator: string
    met: boolean
  }>
  regions: Array<{ id: string; title: string; kind: string; leafCount: number }>
}

/**
 * Compute the governance snapshot from an already-open store + brainId and
 * write it to brain/evolution-state.json. Safe to call from inside the loop's
 * CommitStep (store is open and exclusive at that point).
 */
export async function writeEvolutionState(
  store: BrainStore,
  brainId: string,
  cwd: string = process.cwd(),
): Promise<EvolutionStateFile> {
  const [health, coverage, goalResults, regions, leaves] = await Promise.all([
    store.health(brainId),
    assessCoverage(store, brainId),
    evaluateGoals(store, brainId),
    store.listRegions(brainId),
    store.listLeaves(brainId),
  ])

  const leafCountByRegion = new Map<string, number>()
  for (const l of leaves) {
    if (l.regionId) {
      leafCountByRegion.set(
        l.regionId,
        (leafCountByRegion.get(l.regionId) ?? 0) + 1,
      )
    }
  }

  const snapshot: EvolutionStateFile = {
    generatedAt: new Date().toISOString(),
    brainId,
    health,
    coverageTarget: COVERAGE_TARGET,
    coverage: coverage.map(c => ({
      regionId: c.regionId,
      regionTitle: c.regionTitle,
      score: c.score,
      gaps: c.gaps,
    })),
    goals: goalResults.map(g => ({
      title: g.goal.title,
      metric: (g.goal.content as { metric?: string } | undefined)?.metric ?? '',
      current: g.current,
      target: g.target,
      comparator: g.comparator,
      met: g.met,
    })),
    regions: regions.map(r => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      leafCount: leafCountByRegion.get(r.id) ?? 0,
    })),
  }

  const { writeFileSync } = await import('node:fs')
  const outPath = resolve(cwd, 'brain', 'evolution-state.json')
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  return snapshot
}

// ── Standalone entrypoint ─────────────────────────────────────────────────────
// Opens the live brain (exclusive — only run when the daemon is NOT mid-cycle).

const isMain = process.argv[1]?.includes('evolution-state')
if (isMain) {
  const cwd = process.cwd()
  const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)
  try {
    const brain = await store.getBrainByName('delphi')
    if (!brain) {
      console.error('Brain "delphi" not found. Run pnpm brain:bootstrap first.')
      process.exit(1)
    }
    await ensureSeededRegions(store, brain.id, [])
    const snap = await writeEvolutionState(store, brain.id, cwd)
    console.log(
      `[evolution-state] wrote brain/evolution-state.json — ${snap.coverage.length} regions, ${snap.goals.filter(g => g.met).length}/${snap.goals.length} goals met`,
    )
  } finally {
    await db.close()
  }
}
