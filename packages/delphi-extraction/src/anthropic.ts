import type { Candidate, Chunk } from '@goatlab/delphi-protocol'
import { CandidateSchema, newId } from '@goatlab/delphi-protocol'
import type { Extractor } from './extractor.js'
import { HeuristicExtractor } from './heuristic.js'

export class AnthropicExtractor implements Extractor {
  readonly name = 'anthropic'
  private readonly model: string
  private client: import('@anthropic-ai/sdk').default | null = null

  constructor(model = 'claude-haiku-4-5') {
    this.model = model
  }

  private async getClientAsync(): Promise<import('@anthropic-ai/sdk').default> {
    if (this.client === null) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      this.client = new Anthropic()
    }
    return this.client
  }

  async extract(
    chunk: Chunk,
    assetId: string,
    _assetTitle: string,
  ): Promise<Candidate[]> {
    const client = await this.getClientAsync()

    let responseText = ''
    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system:
          'Extract factual candidates from the chunk as a JSON array with objects having fields: kind ("OBJECT"|"BELIEF"|"QUESTION"), title, statement, extractionConfidence (0..1). Every BELIEF must be a single declarative sentence entailed by the text. Respond ONLY with JSON.',
        messages: [
          {
            role: 'user',
            content: chunk.text,
          },
        ],
      })

      const block = response.content[0]
      if (block && block.type === 'text') {
        responseText = block.text
      }
    } catch {
      return []
    }

    try {
      const parsed = JSON.parse(responseText) as unknown[]
      const candidates: Candidate[] = []
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) {
          continue
        }
        const obj = item as Record<string, unknown>
        const raw = {
          id: newId('cand'),
          kind: obj.kind,
          title: obj.title,
          statement: obj.statement,
          aliases: [] as string[],
          extractionConfidence:
            typeof obj.extractionConfidence === 'number'
              ? obj.extractionConfidence
              : 0.5,
          assetId,
          chunkId: chunk.id,
          sourceText: chunk.text.slice(0, 300),
        }
        const result = CandidateSchema.safeParse(raw)
        if (result.success) {
          candidates.push(result.data)
        }
      }
      return candidates
    } catch {
      return []
    }
  }
}

export function pickExtractor(): Extractor {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicExtractor()
  }
  return new HeuristicExtractor()
}
