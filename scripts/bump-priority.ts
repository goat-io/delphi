// One-off script: bump rubric-unification task priorities to 95
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'

async function main() {
  const db = await createDb({ dataDir: '.delphi/brain' })
  await migrate(db)
  const store = new BrainStore(db)

  const brain = await store.getBrainByName('delphi')
  if (!brain) {
    console.error('Brain not found')
    process.exit(1)
  }

  const tasks = await store.listLeaves(brain.id, { kind: 'TASK' })
  const rubricTasks = tasks.filter(t => {
    if (t.status !== 'ACTIVE') {
      return false
    }
    const c = (t.content ?? {}) as Record<string, unknown>
    return (
      c.trigger === 'HUMAN_REQUEST' ||
      (typeof t.title === 'string' && t.title.toLowerCase().includes('rubric'))
    )
  })

  console.log(`Found ${rubricTasks.length} rubric tasks`)
  for (const t of rubricTasks) {
    await store.updateLeaf(t.id, {
      content: {
        ...((t.content as Record<string, unknown>) ?? {}),
        priority: 95,
      },
    })
    console.log(`Bumped ${t.id}: ${t.title}`)
  }

  await db.close()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
