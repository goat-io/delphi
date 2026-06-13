// pnpm tsx scripts/seed-brain-export.ts

import { resolve } from 'node:path'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { exportBrain } from './brain-store-io.js'

const cwd = process.cwd()
const dataDir = resolve(cwd, process.env.DELPHI_DATA_DIR ?? '.delphi/brain')
const outDir = resolve(cwd, 'brain')

async function main() {
  const db = await createDb({ dataDir })
  await migrate(db)
  const store = new BrainStore(db)
  try {
    const brain = await store.getBrainByName('delphi')
    if (!brain) {
      console.error('Brain "delphi" not found. Run pnpm brain:bootstrap first.')
      process.exit(1)
    }
    console.log(
      `[seed-brain-export] Exporting brain ${brain.id} to ${outDir}...`,
    )
    const counts = await exportBrain(store, brain.id, outDir)
    console.log(`[seed-brain-export] Done:`)
    console.log(`  leaves:        ${counts.leaves}`)
    console.log(`  relationships: ${counts.relationships}`)
    console.log(`  evidence:      ${counts.evidence}`)
    console.log(`  assets:        ${counts.assets}`)
    console.log(`  events:        ${counts.events}`)
  } finally {
    await db.close()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
