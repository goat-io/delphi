// tests/constitution.test.ts — Tests for the Human Boundary constitution.
//
// Covers:
//   1. classifyWorkOrder heuristic classification
//   2. makeConstitutionGuard with humanImpact work → requiresHuman / blocked
//   3. makeConstitutionGuard with internal code work → allow + review, NOT human
//   4. perspectivesForWorkClass: code excludes redundancy; rfc includes it
//   5. parseArbiterVerdict: stub-based unit tests (no live claude call)

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSeededRegions } from '@goatlab/delphi-indexer'
import { BrainStore, createDb, migrate } from '@goatlab/delphi-knowledge'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  classifyWorkOrder,
  HUMAN_BOUNDARY_ACTIONS,
} from '../scripts/constitution.js'
import {
  makeConstitutionGuard,
  parseArbiterVerdict,
  perspectivesForWorkClass,
} from '../scripts/governance-bridge.js'

let store: BrainStore
let brainId: string
let tmpDir: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-constitution-'))
  const db = await createDb({ dataDir: tmpDir })
  await migrate(db)
  store = new BrainStore(db)
  const brain = await store.createBrain(
    'delphi',
    'Test brain for constitution tests',
  )
  brainId = brain.id
  await ensureSeededRegions(store, brainId, ['Spec', 'Operations', 'Decisions'])
}, 30_000)

afterAll(async () => {
  await store.db.close()
})

// ── 1. classifyWorkOrder ──────────────────────────────────────────────────────

describe('classifyWorkOrder', () => {
  // ── npm-publish: ownership-conditional ──────────────────────────────────

  it('npm-publish owned scope: "Publish @goatlab/delphi-protocol to npm" → humanImpact=false', () => {
    // Scope-qualified name under @goatlab (owned) → autonomous
    const result = classifyWorkOrder(
      { title: 'Publish @goatlab/delphi-protocol to npm' },
      '',
    )
    expect(result.humanImpact).toBe(false)
    expect(result.reasons).toHaveLength(0)
  })

  it('npm-publish owned scope: "npm publish @goatlab/delphi-core" → humanImpact=false', () => {
    const result = classifyWorkOrder(
      { title: 'npm publish @goatlab/delphi-core' },
      '',
    )
    expect(result.humanImpact).toBe(false)
    expect(result.reasons).toHaveLength(0)
  })

  it('npm-publish bare unscoped: "Publish our delphi-knowledge package to npm" → humanImpact=true (conservative: no @scope token)', () => {
    // No @scope/name token present → conservative default = boundary action.
    // The autonomous path requires explicit scope-qualified names like @goatlab/pkg-name.
    const result = classifyWorkOrder(
      { title: 'Publish our delphi-knowledge package to npm' },
      '',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  it('npm-publish bare unscoped: "Publish delphi-protocol to npm" → humanImpact=true (no scope token, conservative)', () => {
    // Original test phrasing — still boundary because no @scope/ token
    const result = classifyWorkOrder(
      { title: 'Publish delphi-protocol to npm' },
      'Publish delphi-protocol to npm registry',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  it('npm-publish foreign scope: "Publish lodash-clone to npm" → humanImpact=true', () => {
    const result = classifyWorkOrder(
      { title: 'Publish lodash-clone to npm' },
      '',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  it('npm-publish foreign scope: "Publish @someorg/thing to npm" → humanImpact=true', () => {
    const result = classifyWorkOrder(
      { title: 'Publish @someorg/thing to npm' },
      '',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  it('npm-publish foreign scope: "Publish @evilcorp/malware to npm" → humanImpact=true', () => {
    const result = classifyWorkOrder(
      { title: 'Publish @evilcorp/malware to npm' },
      '',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  it('npm-publish mixed scopes (owned + foreign) → humanImpact=true (any foreign target = boundary)', () => {
    const result = classifyWorkOrder(
      { title: 'Publish @goatlab/delphi-core and @foreign/pkg to npm' },
      '',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('npm-publish'))).toBe(true)
  })

  // ── non-publish cases ────────────────────────────────────────────────────

  it('internal code work: "Refactor resolve.ts thresholds" → humanImpact=false', () => {
    const result = classifyWorkOrder(
      { title: 'Refactor resolve.ts thresholds' },
      'Update the confidence thresholds in scripts/resolve.ts to align with rubric values',
    )
    expect(result.humanImpact).toBe(false)
    expect(result.reasons).toHaveLength(0)
  })

  it('external-issue: "Open an issue on github.com/electric-sql/pglite" → humanImpact=true', () => {
    const result = classifyWorkOrder(
      { title: 'Open an issue on github.com/electric-sql/pglite' },
      'Open an issue on github.com/electric-sql/pglite about connection pooling',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('external'))).toBe(true)
  })

  it('email: "Send the weekly summary email" → humanImpact=true', () => {
    const result = classifyWorkOrder(
      { title: 'Send the weekly summary email' },
      'Send the weekly summary email to the team',
    )
    expect(result.humanImpact).toBe(true)
    expect(result.reasons.some(r => r.includes('email'))).toBe(true)
  })

  it('HUMAN_BOUNDARY_ACTIONS list includes expected action classes', () => {
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('npm-publish')
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('external-pr')
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('email')
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('payment')
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('message')
    expect(HUMAN_BOUNDARY_ACTIONS).toContain('notification')
  })

  it('internal rfc work inside the repo → humanImpact=false', () => {
    const result = classifyWorkOrder(
      { title: 'Draft RFC-0033 for streaming delta sync' },
      'SPEC_GAP: draft rfcs/RFC-0033-Streaming-Delta-Sync.md',
    )
    expect(result.humanImpact).toBe(false)
  })

  it('goat-io/delphi PR → humanImpact=false (own repo is inside the boundary)', () => {
    const result = classifyWorkOrder(
      { title: 'Open PR on goat-io/delphi' },
      'Open a PR on github.com/goat-io/delphi for this change',
    )
    expect(result.humanImpact).toBe(false)
  })
})

// ── 2. guard: humanImpact work → requiresHuman / blocked ─────────────────────

describe('guard + Human Boundary', () => {
  it('npm-publish work order → guard blocks (requiresHuman=true, allow=false)', async () => {
    const guard = makeConstitutionGuard()
    const item = {
      name: 'task-publish',
      kind: 'action' as const,
      description: 'Publish delphi-protocol package to npm registry',
      type: 'QUEUED_TASK',
      status: 'proposed' as const,
      tags: ['QUEUED_TASK'],
      classifications: [],
    }
    const verdict = await guard.evaluate(item, { classifications: [] })
    // npm-publish crosses the boundary → block
    expect(verdict.allow).toBe(false)
    expect(
      verdict.reasons.some(
        r =>
          r.toLowerCase().includes('boundary') ||
          r.toLowerCase().includes('npm'),
      ),
    ).toBe(true)
  })

  it('internal code work (QUEUED_TASK, no boundary action) → allow=true, requiresHuman=false', async () => {
    const guard = makeConstitutionGuard()
    const item = {
      name: 'task-code',
      kind: 'action' as const,
      description: 'Refactor confidence threshold logic in scripts/evolve.ts',
      type: 'QUEUED_TASK',
      status: 'proposed' as const,
      tags: ['QUEUED_TASK'],
      classifications: [],
    }
    const verdict = await guard.evaluate(item, { classifications: [] })
    expect(verdict.allow).toBe(true)
    // Inside-boundary code work must NOT require human approval
    expect(verdict.requiresHuman).toBe(false)
  })

  it('spec/RFC work (SPEC_GAP) → allow=true, requiresHuman=false (arbiter handles borderline)', async () => {
    const guard = makeConstitutionGuard()
    const item = {
      name: 'task-spec',
      kind: 'action' as const,
      description: 'Draft RFC for streaming delta sync in rfcs/',
      type: 'SPEC_GAP',
      status: 'proposed' as const,
      tags: ['spec'],
      classifications: [],
    }
    const verdict = await guard.evaluate(item, { classifications: [] })
    expect(verdict.allow).toBe(true)
    // RFC work is inside the boundary → no human required
    expect(verdict.requiresHuman).toBe(false)
  })

  it('protected package work → guard blocks (allow=false)', async () => {
    const guard = makeConstitutionGuard()
    const item = {
      name: 'task-protected',
      kind: 'action' as const,
      description: 'Modify packages/delphi-core internals to add feature X',
      type: 'QUEUED_TASK',
      status: 'proposed' as const,
      tags: [],
      classifications: [],
    }
    const verdict = await guard.evaluate(item, { classifications: [] })
    expect(verdict.allow).toBe(false)
    expect(verdict.reasons.some(r => r.includes('protected'))).toBe(true)
  })
})

// ── 3. perspectivesForWorkClass ───────────────────────────────────────────────

describe('perspectivesForWorkClass', () => {
  it('code-class review excludes redundancy perspective', () => {
    const perspectives = perspectivesForWorkClass('code')
    const names = perspectives.map(p => p.name)
    expect(names).not.toContain('redundancy')
    expect(names).toContain('spec-coherence')
    expect(names).toContain('scope')
  })

  it('rfc-class review includes redundancy perspective', () => {
    const perspectives = perspectivesForWorkClass('rfc')
    const names = perspectives.map(p => p.name)
    expect(names).toContain('redundancy')
    expect(names).toContain('spec-coherence')
    expect(names).toContain('scope')
  })

  it('docs-class review excludes redundancy (same as code)', () => {
    const perspectives = perspectivesForWorkClass('docs')
    const names = perspectives.map(p => p.name)
    expect(names).not.toContain('redundancy')
  })
})

// ── 4. parseArbiterVerdict — unit-test verdict parsing with stubs ─────────────

describe('parseArbiterVerdict', () => {
  it('parses APPROVE verdict correctly', () => {
    const verdict = parseArbiterVerdict(
      'APPROVE: The change is a safe internal refactor with no external impact.',
    )
    expect(verdict.outcome).toBe('APPROVE')
    expect(verdict.rationale).toContain('safe internal refactor')
  })

  it('parses REJECT verdict correctly', () => {
    const verdict = parseArbiterVerdict(
      'REJECT: The diff touches external consumer interfaces that affect deployed users.',
    )
    expect(verdict.outcome).toBe('REJECT')
    expect(verdict.rationale).toContain('external consumer interfaces')
  })

  it('case-insensitive parsing: approve: → APPROVE', () => {
    const verdict = parseArbiterVerdict('approve: looks good to me, proceed.')
    expect(verdict.outcome).toBe('APPROVE')
  })

  it('unrecognized response → conservative REJECT', () => {
    const verdict = parseArbiterVerdict('I am not sure about this one.')
    expect(verdict.outcome).toBe('REJECT')
    expect(verdict.rationale).toContain('Conservative REJECT')
  })

  it('empty string → conservative REJECT', () => {
    const verdict = parseArbiterVerdict('')
    expect(verdict.outcome).toBe('REJECT')
  })
})
