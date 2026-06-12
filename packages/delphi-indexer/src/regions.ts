import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { Region } from '@goatlab/delphi-protocol'

/**
 * Ensure the given SEEDED region titles exist for the brain.
 * Idempotent — createRegion uses ON CONFLICT DO NOTHING.
 */
export async function ensureSeededRegions(
  store: BrainStore,
  brainId: string,
  titles: string[],
): Promise<Region[]> {
  const regions: Region[] = []
  for (const title of titles) {
    const region = await store.createRegion(brainId, title, 'SEEDED')
    regions.push(region)
  }
  return regions
}

/**
 * Assign every leaf with no regionId to a region.
 * If the leaf has a relationship to a leaf with a regionId, inherit that region.
 * Otherwise assign defaultRegionId.
 * Returns the count of leaves assigned.
 */
export async function assignUnassignedLeaves(
  store: BrainStore,
  brainId: string,
  defaultRegionId: string,
): Promise<number> {
  const allLeaves = await store.listLeaves(brainId)
  const unassigned = allLeaves.filter(l => l.regionId === undefined)
  if (unassigned.length === 0) {
    return 0
  }

  let count = 0
  for (const leaf of unassigned) {
    const rels = await store.listRelationshipsForLeaf(leaf.id)
    let targetRegionId: string | undefined

    for (const rel of rels) {
      // The other end of the relationship
      const otherId =
        rel.sourceLeafId === leaf.id ? rel.targetLeafId : rel.sourceLeafId
      const other = allLeaves.find(l => l.id === otherId)
      if (other?.regionId !== undefined) {
        targetRegionId = other.regionId
        break
      }
    }

    const assignTo = targetRegionId ?? defaultRegionId
    await store.assignLeafRegion(leaf.id, assignTo)
    count++
  }
  return count
}

/**
 * Find OBJECT leaves with degree >= threshold that don't yet have a HUB region
 * titled with their title. For each such leaf:
 *   1. Create a HUB region with the leaf's title as anchor.
 *   2. Assign the anchor leaf to the hub.
 *   3. Assign every directly-related leaf that is currently in a SEEDED region to the hub.
 *
 * Default threshold: 6.
 */
export async function detectHubRegions(
  store: BrainStore,
  brainId: string,
  opts?: { degreeThreshold?: number },
): Promise<Region[]> {
  const threshold = opts?.degreeThreshold ?? 6
  const objects = await store.listLeaves(brainId, { kind: 'OBJECT' })
  const allRegions = await store.listRegions(brainId)
  const hubTitles = new Set(
    allRegions.filter(r => r.kind === 'HUB').map(r => r.title),
  )

  const created: Region[] = []

  for (const obj of objects) {
    const degree = await store.leafDegree(obj.id)
    if (degree < threshold) {
      continue
    }
    if (hubTitles.has(obj.title)) {
      continue
    }

    // Create the hub region
    const hub = await store.createRegion(brainId, obj.title, 'HUB', obj.id)
    hubTitles.add(hub.title)
    created.push(hub)

    // Assign the anchor leaf to the hub
    await store.assignLeafRegion(obj.id, hub.id)

    // Assign directly-related leaves that are in a SEEDED region
    const rels = await store.listRelationshipsForLeaf(obj.id)
    const seededIds = new Set(
      allRegions.filter(r => r.kind === 'SEEDED').map(r => r.id),
    )

    for (const rel of rels) {
      const otherId =
        rel.sourceLeafId === obj.id ? rel.targetLeafId : rel.sourceLeafId
      const other = await store.getLeaf(otherId)
      if (
        other &&
        other.regionId !== undefined &&
        seededIds.has(other.regionId)
      ) {
        await store.assignLeafRegion(otherId, hub.id)
      }
    }
  }

  return created
}
