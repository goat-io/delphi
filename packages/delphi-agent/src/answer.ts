import Anthropic from '@anthropic-ai/sdk'
import type { BrainStore } from '@goatlab/delphi-knowledge'
import {
  type AnswerEvidence,
  type AnswerResult,
  AnswerResultSchema,
  type Leaf,
} from '@goatlab/delphi-protocol'
import { pickRegion } from './navigate.js'

// ── Synthesizer interface ─────────────────────────────────────────────────────

interface BeliefSummary {
  title: string
  statement?: string
  confidence?: number
}

interface SynthesizeInput {
  question: string
  beliefs: BeliefSummary[]
}

interface Synthesizer {
  synthesize(input: SynthesizeInput): Promise<string>
  readonly name: string
}

// ── ExtractiveSynthesizer ─────────────────────────────────────────────────────

export class ExtractiveSynthesizer implements Synthesizer {
  readonly name = 'extractive'

  async synthesize(input: SynthesizeInput): Promise<string> {
    const sorted = [...input.beliefs].sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
    )
    const top2 = sorted.slice(0, 2)
    if (top2.length === 0) {
      return 'No relevant beliefs found.'
    }
    return (
      top2.map(b => (b.statement ?? b.title).replace(/\.+$/, '')).join('. ') +
      '.'
    )
  }
}

// ── AnthropicSynthesizer ──────────────────────────────────────────────────────

export class AnthropicSynthesizer implements Synthesizer {
  readonly name = 'anthropic'
  private readonly model: string
  private readonly fallback: ExtractiveSynthesizer
  private client: Anthropic | null = null

  constructor(model = 'claude-opus-4-8') {
    this.model = model
    this.fallback = new ExtractiveSynthesizer()
  }

  private getClient(): Anthropic {
    if (this.client === null) {
      this.client = new Anthropic()
    }
    return this.client
  }

  async synthesize(input: SynthesizeInput): Promise<string> {
    try {
      const beliefLines = input.beliefs
        .slice(0, 10)
        .map(
          (b, i) =>
            `${i + 1}. ${b.statement ?? b.title}${b.confidence !== undefined ? ` (confidence: ${b.confidence.toFixed(2)})` : ''}`,
        )
        .join('\n')

      const prompt = `Question: ${input.question}\n\nRelevant beliefs:\n${beliefLines}\n\nProvide a concise 1-3 sentence answer based on these beliefs.`

      const client = this.getClient()
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })

      const block = message.content.find(b => b.type === 'text')
      if (block?.type !== 'text') {
        return this.fallback.synthesize(input)
      }
      return block.text
    } catch {
      return this.fallback.synthesize(input)
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function pickSynthesizer(): Synthesizer {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicSynthesizer()
  }
  return new ExtractiveSynthesizer()
}

// ── answerQuestion ────────────────────────────────────────────────────────────

export async function answerQuestion(
  store: BrainStore,
  brainId: string,
  question: string,
  synthesizer?: Synthesizer,
): Promise<AnswerResult> {
  const synth = synthesizer ?? pickSynthesizer()

  // 1. Navigate to best region
  const { region, index, path } = await pickRegion(store, brainId, question)

  // 2. Fetch relevant beliefs
  let leaves: Leaf[] = []
  if (region !== null) {
    // Search within the brain for relevant leaves
    leaves = await store.searchLeaves(brainId, question, 10)
    // If search returns nothing, fall back to listing all beliefs
    if (leaves.length === 0) {
      const allLeaves = await store.listLeaves(brainId)
      leaves = allLeaves.filter(
        l => l.kind === 'BELIEF' && l.regionId === region.id,
      )
    }
  } else {
    // No region found — search globally
    leaves = await store.searchLeaves(brainId, question, 10)
    if (leaves.length === 0) {
      const allLeaves = await store.listLeaves(brainId)
      leaves = allLeaves.filter(l => l.kind === 'BELIEF')
    }
  }

  // Filter to beliefs only
  const beliefs = leaves.filter(l => l.kind === 'BELIEF')

  // 3. Gather evidence for top beliefs (up to 5)
  const topBeliefs = [...beliefs]
    .sort((a, b) => (b.confidence?.value ?? 0) - (a.confidence?.value ?? 0))
    .slice(0, 5)

  const allEvidence: AnswerEvidence[] = []
  for (const belief of topBeliefs) {
    const withCtx = await store.listEvidenceWithContext(belief.id)
    for (const { evidence, assetTitle } of withCtx) {
      const ev: AnswerEvidence = {
        leafId: belief.id,
        leafTitle: belief.title,
        assetTitle,
        strength: evidence.strength,
        ...(evidence.citation !== undefined
          ? { citation: evidence.citation }
          : {}),
      }
      allEvidence.push(ev)
    }
  }

  // 4. Gather relationships (dependencies + contradictions) for top beliefs
  const beliefIds = new Set(topBeliefs.map(b => b.id))
  const dependencies: Array<{
    from: string
    to: string
    type: import('@goatlab/delphi-protocol').EdgeType
  }> = []
  const contradictions: Array<{ a: string; b: string }> = []
  const seenContradictions = new Set<string>()
  const seenDependencies = new Set<string>()

  for (const belief of topBeliefs) {
    const rels = await store.listRelationshipsForLeaf(belief.id)
    for (const rel of rels) {
      if (
        rel.type === 'DEPENDS_ON' &&
        beliefIds.has(rel.sourceLeafId) &&
        beliefIds.has(rel.targetLeafId)
      ) {
        const depKey = `${rel.sourceLeafId}|${rel.targetLeafId}`
        if (!seenDependencies.has(depKey)) {
          seenDependencies.add(depKey)
          dependencies.push({
            from: rel.sourceLeafId,
            to: rel.targetLeafId,
            type: rel.type,
          })
        }
      }
      if (rel.type === 'CONTRADICTS') {
        const key = [rel.sourceLeafId, rel.targetLeafId].sort().join('|')
        if (!seenContradictions.has(key)) {
          seenContradictions.add(key)
          contradictions.push({ a: rel.sourceLeafId, b: rel.targetLeafId })
        }
      }
    }
  }

  // 5. Build belief summaries for synthesis
  const beliefSummaries: BeliefSummary[] = topBeliefs.map(b => ({
    title: b.title,
    ...(b.statement !== undefined ? { statement: b.statement } : {}),
    ...(b.confidence?.value !== undefined
      ? { confidence: b.confidence.value }
      : {}),
  }))

  // 6. Synthesize answer
  const summary = await synth.synthesize({ question, beliefs: beliefSummaries })

  // 7. Compute confidence
  const confValues = topBeliefs.map(b => b.confidence?.value ?? 0.4)
  const meanConf =
    confValues.length > 0
      ? confValues.reduce((a, c) => a + c, 0) / confValues.length
      : 0.4
  const confidence = Number.parseFloat(
    Math.min(1, Math.max(0, meanConf)).toFixed(3),
  )

  // 8. Navigation path
  const navigationPath =
    path.length >= 2 ? path : ['brain', index?.title ?? 'general']

  // 9. Build and validate result
  const result = AnswerResultSchema.parse({
    question,
    summary,
    confidence,
    navigationPath,
    beliefs: topBeliefs.map(b => ({
      id: b.id,
      title: b.title,
      ...(b.statement !== undefined ? { statement: b.statement } : {}),
      ...(b.confidence?.value !== undefined
        ? { confidence: b.confidence.value }
        : {}),
    })),
    evidence: allEvidence,
    dependencies,
    contradictions,
  })

  return result
}
