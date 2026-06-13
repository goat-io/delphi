import type { Candidate, Chunk } from '@goatlab/delphi-protocol'
import { CandidateSchema, newId } from '@goatlab/delphi-protocol'
import type { Extractor } from './extractor.js'
import { isNoiseQuestion } from './questions.js'

const OBJECT_STOPLIST = new Set([
  'The',
  'This',
  'That',
  'These',
  'Those',
  'It',
  'A',
  'An',
  'In',
  'On',
  'If',
  'For',
  'When',
  'With',
])

const BELIEF_VERBS = [
  ' is ',
  ' are ',
  ' was ',
  ' provides ',
  ' provide ',
  ' supports ',
  ' uses ',
  ' requires ',
  ' enables ',
  ' improves ',
  ' reduces ',
  ' causes ',
  ' guarantees ',
  ' stores ',
  ' runs ',
  ' cannot ',
  ' does not ',
]

function stripMarkdown(text: string): string {
  // Remove bold/italic emphasis markers ** and *
  let s = text.replace(/\*\*([^*]*)\*\*/g, '$1')
  s = s.replace(/\*([^*]*)\*/g, '$1')
  // Remove backticks
  s = s.replace(/`[^`]*`/g, m => m.slice(1, -1))
  // Remove link syntax [text](url) → text
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  return s
}

function splitSentences(text: string): string[] {
  const stripped = stripMarkdown(text)
  return stripped
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export class HeuristicExtractor implements Extractor {
  readonly name = 'heuristic'

  async extract(
    chunk: Chunk,
    assetId: string,
    assetTitle: string,
  ): Promise<Candidate[]> {
    void assetTitle
    const candidates: Candidate[] = []
    const sentences = splitSentences(chunk.text)

    for (const sentence of sentences) {
      // QUESTION
      if (
        sentence.endsWith('?') &&
        sentence.length >= 12 &&
        sentence.length <= 200 &&
        !isNoiseQuestion(sentence)
      ) {
        const title = sentence.trim().slice(0, 120)
        const raw = {
          id: newId('cand'),
          kind: 'QUESTION' as const,
          title,
          statement: sentence,
          aliases: [] as string[],
          extractionConfidence: 0.7,
          assetId,
          chunkId: chunk.id,
          sourceText: sentence,
        }
        const parsed = CandidateSchema.safeParse(raw)
        if (parsed.success) {
          candidates.push(parsed.data)
        }
        continue
      }

      // BELIEF
      if (
        sentence.length >= 30 &&
        sentence.length <= 280 &&
        !sentence.startsWith('#')
      ) {
        const lower = sentence.toLowerCase()
        const hasVerb = BELIEF_VERBS.some(v => lower.includes(v.toLowerCase()))
        if (hasVerb) {
          const statement = sentence.endsWith('.') ? sentence : `${sentence}.`
          const titleRaw = sentence.slice(0, 80)
          const title = titleRaw.trimEnd()
          const raw = {
            id: newId('cand'),
            kind: 'BELIEF' as const,
            title,
            statement,
            aliases: [] as string[],
            extractionConfidence: 0.6,
            assetId,
            chunkId: chunk.id,
            sourceText: sentence,
          }
          const parsed = CandidateSchema.safeParse(raw)
          if (parsed.success) {
            candidates.push(parsed.data)
          }
        }
      }
    }

    // OBJECT: only when chunk has a section heading
    if (chunk.location?.section !== undefined) {
      const tokenRegex = /\b[A-Z][a-zA-Z0-9]{2,}\b/g
      const counts = new Map<string, number>()
      let match: RegExpExecArray | null
      const text = chunk.text
      while ((match = tokenRegex.exec(text)) !== null) {
        const token = match[0]!
        if (!OBJECT_STOPLIST.has(token)) {
          counts.set(token, (counts.get(token) ?? 0) + 1)
        }
      }

      const eligible = Array.from(counts.entries())
        .filter(([, count]) => count >= 2)
        .map(([token]) => token)
        .slice(0, 3)

      for (const token of eligible) {
        const sourceText = chunk.text.slice(0, 200)
        const raw = {
          id: newId('cand'),
          kind: 'OBJECT' as const,
          title: token,
          aliases: [] as string[],
          extractionConfidence: 0.7,
          assetId,
          chunkId: chunk.id,
          sourceText,
        }
        const parsed = CandidateSchema.safeParse(raw)
        if (parsed.success) {
          candidates.push(parsed.data)
        }
      }
    }

    return candidates
  }
}
