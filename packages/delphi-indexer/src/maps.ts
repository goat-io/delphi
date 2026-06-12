import type { BrainStore } from '@goatlab/delphi-knowledge'
import type { KnowledgeMap, MapRoute } from '@goatlab/delphi-protocol'
import { newId } from '@goatlab/delphi-protocol'

export async function generateMaps(
  store: BrainStore,
  brainId: string,
): Promise<KnowledgeMap> {
  const allLeaves = await store.listLeaves(brainId)
  const allRels = await store.listRelationships(brainId)
  const routes: MapRoute[] = []

  // ── DEPENDENCY routes ─────────────────────────────────────────────────────
  // DEPENDS_ON relationships: source DEPENDS_ON target means source needs target (target is a prereq).
  // "root" = a leaf that others depend on but that depends on nothing itself.

  const depRels = allRels.filter(r => r.type === 'DEPENDS_ON')

  // dependsOnMap[leafId] = set of leafIds that leafId depends on (targets)
  const dependsOnMap = new Map<string, Set<string>>()
  // dependedOnByMap[leafId] = set of leafIds that depend on leafId (sources)
  const dependedOnByMap = new Map<string, Set<string>>()

  for (const rel of depRels) {
    if (!dependsOnMap.has(rel.sourceLeafId)) {
      dependsOnMap.set(rel.sourceLeafId, new Set())
    }
    dependsOnMap.get(rel.sourceLeafId)!.add(rel.targetLeafId)

    if (!dependedOnByMap.has(rel.targetLeafId)) {
      dependedOnByMap.set(rel.targetLeafId, new Set())
    }
    dependedOnByMap.get(rel.targetLeafId)!.add(rel.sourceLeafId)
  }

  // Gather all node ids involved in dep relationships
  const depNodeIds = new Set<string>([
    ...dependsOnMap.keys(),
    ...dependedOnByMap.keys(),
  ])

  // Roots: nodes that ARE depended on by others but themselves depend on nothing
  const roots = [...depNodeIds].filter(
    id => !dependsOnMap.has(id) || dependsOnMap.get(id)!.size === 0,
  )

  for (const rootId of roots) {
    // BFS: root → dependents → dependents' dependents
    const visited = new Set<string>()
    const queue: string[] = [rootId]
    const routeNodes: string[] = []
    visited.add(rootId)

    while (queue.length > 0 && routeNodes.length < 8) {
      const current = queue.shift()!
      routeNodes.push(current)

      const followers = dependedOnByMap.get(current) ?? new Set<string>()
      for (const next of followers) {
        if (!visited.has(next)) {
          visited.add(next)
          queue.push(next)
        }
      }
    }

    if (routeNodes.length >= 2) {
      const rootLeaf = allLeaves.find(l => l.id === rootId)
      routes.push({
        id: newId('route'),
        title: `Dependencies of ${rootLeaf?.title ?? rootId}`,
        purpose: 'DEPENDENCY',
        nodeLeafIds: routeNodes,
      })
    }
  }

  // ── LEARNING route ────────────────────────────────────────────────────────
  // Topological order (Kahn's algorithm) over all DEPENDS_ON nodes.
  // Dependencies come before dependents.

  if (depNodeIds.size >= 2) {
    // In-degree (how many things does each node depend on)
    const inDegree = new Map<string, number>()
    for (const id of depNodeIds) {
      inDegree.set(id, dependsOnMap.get(id)?.size ?? 0)
    }

    const queue: string[] = [...depNodeIds].filter(
      id => (inDegree.get(id) ?? 0) === 0,
    )
    const order: string[] = []
    const remaining = new Set<string>(depNodeIds)

    while (queue.length > 0) {
      // Pick one
      const cur = queue.shift()!
      order.push(cur)
      remaining.delete(cur)

      // Reduce in-degree of everything that depends on cur
      const followers = dependedOnByMap.get(cur) ?? new Set<string>()
      for (const follower of followers) {
        const newDeg = (inDegree.get(follower) ?? 1) - 1
        inDegree.set(follower, newDeg)
        if (newDeg === 0) {
          queue.push(follower)
        }
      }
    }

    // On cycle: append remaining sorted by degree desc
    if (remaining.size > 0) {
      const deg = new Map<string, number>()
      for (const id of remaining) {
        deg.set(
          id,
          (dependsOnMap.get(id)?.size ?? 0) +
            (dependedOnByMap.get(id)?.size ?? 0),
        )
      }
      const sorted = [...remaining].sort(
        (a, b) => (deg.get(b) ?? 0) - (deg.get(a) ?? 0),
      )
      order.push(...sorted)
    }

    if (order.length >= 2) {
      routes.push({
        id: newId('route'),
        title: 'Learning path',
        purpose: 'LEARNING',
        nodeLeafIds: order,
      })
    }
  }

  // ── EXPLORATION routes ────────────────────────────────────────────────────
  // For each OBJECT leaf with degree ≥ 2: build route starting with that leaf,
  // followed by connected leaves via RELATES_TO / SUPPORTS / PART_OF (up to 6 more).
  // Max 5 exploration routes.

  const objectLeaves = allLeaves.filter(l => l.kind === 'OBJECT')
  const explorationEdgeTypes = new Set(['RELATES_TO', 'SUPPORTS', 'PART_OF'])

  let expCount = 0
  for (const obj of objectLeaves) {
    if (expCount >= 5) {
      break
    }

    const degree = await store.leafDegree(obj.id)
    if (degree < 2) {
      continue
    }

    const rels = await store.listRelationshipsForLeaf(obj.id)
    const connected: string[] = []
    const seen = new Set<string>([obj.id])

    for (const rel of rels) {
      if (!explorationEdgeTypes.has(rel.type)) {
        continue
      }
      const otherId =
        rel.sourceLeafId === obj.id ? rel.targetLeafId : rel.sourceLeafId
      if (!seen.has(otherId)) {
        connected.push(otherId)
        seen.add(otherId)
      }
      if (connected.length >= 6) {
        break
      }
    }

    const nodeLeafIds = [obj.id, ...connected]
    if (nodeLeafIds.length >= 1) {
      routes.push({
        id: newId('route'),
        title: `Around ${obj.title}`,
        purpose: 'EXPLORATION',
        nodeLeafIds,
      })
      expCount++
    }
  }

  return store.saveMap({
    brainId,
    title: 'Knowledge Map',
    routes,
  })
}
